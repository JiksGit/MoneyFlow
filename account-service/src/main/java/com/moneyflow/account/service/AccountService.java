package com.moneyflow.account.service;

import com.moneyflow.account.domain.Account;
import com.moneyflow.account.domain.InsufficientBalanceException;
import com.moneyflow.account.event.AccountEvent;
import com.moneyflow.account.event.TransferEvent;
import com.moneyflow.account.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.retry.annotation.Backoff;
import org.springframework.retry.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AccountService {

    private static final String BALANCE_CACHE_PREFIX = "balance:";
    private static final Duration BALANCE_CACHE_TTL = Duration.ofSeconds(30);

    private final AccountRepository accountRepository;
    private final RedisTemplate<String, String> redisTemplate;
    private final KafkaTemplate<String, AccountEvent> kafkaTemplate;

    @Transactional
    public Account createAccount(UUID userId, BigDecimal initialBalance) {
        if (accountRepository.findByUserId(userId).isPresent()) {
            throw new IllegalStateException("Account already exists for user: " + userId);
        }
        Account account = Account.builder()
                .userId(userId)
                .balance(initialBalance != null ? initialBalance : BigDecimal.ZERO)
                .build();
        return accountRepository.save(account);
    }

    @Transactional(readOnly = true)
    public Account getAccount(UUID accountId) {
        return accountRepository.findById(accountId)
                .orElseThrow(() -> new IllegalArgumentException("Account not found: " + accountId));
    }

    @Transactional(readOnly = true)
    public Account getAccountByUserId(UUID userId) {
        return accountRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("Account not found for user: " + userId));
    }

    public BigDecimal getCachedBalance(UUID accountId) {
        String cacheKey = BALANCE_CACHE_PREFIX + accountId;
        String cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            log.debug("Cache HIT for balance: {}", accountId);
            return new BigDecimal(cached);
        }
        log.debug("Cache MISS for balance: {}", accountId);
        Account account = getAccount(accountId);
        redisTemplate.opsForValue().set(cacheKey, account.getBalance().toPlainString(), BALANCE_CACHE_TTL);
        return account.getBalance();
    }

    private void evictBalanceCache(UUID accountId) {
        redisTemplate.delete(BALANCE_CACHE_PREFIX + accountId);
    }

    @Retryable(
        retryFor = ObjectOptimisticLockingFailureException.class,
        maxAttempts = 3,
        backoff = @Backoff(delay = 100, multiplier = 2)
    )
    @Transactional
    public void processDebit(TransferEvent event) {
        UUID transferId = event.getTransferId();
        UUID fromAccountId = event.getFromAccountId();
        BigDecimal amount = event.getAmount();

        log.info("Processing debit: transferId={}, fromAccount={}, amount={}", transferId, fromAccountId, amount);

        try {
            Account account = accountRepository.findByIdForUpdate(fromAccountId)
                    .orElseThrow(() -> new IllegalArgumentException("Account not found: " + fromAccountId));

            account.debit(amount);
            accountRepository.save(account);
            evictBalanceCache(fromAccountId);

            AccountEvent resultEvent = AccountEvent.builder()
                    .transferId(transferId)
                    .fromAccountId(fromAccountId)
                    .toAccountId(event.getToAccountId())
                    .amount(amount)
                    .eventType("DEBITED")
                    .build();
            kafkaTemplate.send("transfer.debited", transferId.toString(), resultEvent);
            log.info("Debit successful: transferId={}", transferId);

        } catch (InsufficientBalanceException e) {
            log.warn("Debit failed (insufficient balance): transferId={}, reason={}", transferId, e.getMessage());
            AccountEvent failEvent = AccountEvent.builder()
                    .transferId(transferId)
                    .fromAccountId(fromAccountId)
                    .toAccountId(event.getToAccountId())
                    .amount(amount)
                    .eventType("DEBIT_FAILED")
                    .failureReason(e.getMessage())
                    .build();
            kafkaTemplate.send("transfer.debited", transferId.toString(), failEvent);
        }
    }

    @Retryable(
        retryFor = ObjectOptimisticLockingFailureException.class,
        maxAttempts = 3,
        backoff = @Backoff(delay = 100, multiplier = 2)
    )
    @Transactional
    public void processCredit(TransferEvent event) {
        UUID transferId = event.getTransferId();
        UUID toAccountId = event.getToAccountId();
        BigDecimal amount = event.getAmount();

        log.info("Processing credit: transferId={}, toAccount={}, amount={}", transferId, toAccountId, amount);

        try {
            Account account = accountRepository.findByIdForUpdate(toAccountId)
                    .orElseThrow(() -> new IllegalArgumentException("Account not found: " + toAccountId));

            account.credit(amount);
            accountRepository.save(account);
            evictBalanceCache(toAccountId);

            AccountEvent resultEvent = AccountEvent.builder()
                    .transferId(transferId)
                    .fromAccountId(event.getFromAccountId())
                    .toAccountId(toAccountId)
                    .amount(amount)
                    .eventType("CREDITED")
                    .build();
            kafkaTemplate.send("transfer.credited", transferId.toString(), resultEvent);
            log.info("Credit successful: transferId={}", transferId);

        } catch (Exception e) {
            log.error("Credit failed: transferId={}, reason={}", transferId, e.getMessage());
            AccountEvent failEvent = AccountEvent.builder()
                    .transferId(transferId)
                    .fromAccountId(event.getFromAccountId())
                    .toAccountId(toAccountId)
                    .amount(amount)
                    .eventType("CREDIT_FAILED")
                    .failureReason(e.getMessage())
                    .build();
            kafkaTemplate.send("transfer.credited", transferId.toString(), failEvent);
        }
    }

    @Retryable(
        retryFor = ObjectOptimisticLockingFailureException.class,
        maxAttempts = 3,
        backoff = @Backoff(delay = 100, multiplier = 2)
    )
    @Transactional
    public void processCompensate(TransferEvent event) {
        UUID transferId = event.getTransferId();
        UUID fromAccountId = event.getFromAccountId();
        BigDecimal amount = event.getAmount();

        log.info("Processing compensate: transferId={}, fromAccount={}, amount={}", transferId, fromAccountId, amount);

        Account account = accountRepository.findByIdForUpdate(fromAccountId)
                .orElseThrow(() -> new IllegalArgumentException("Account not found: " + fromAccountId));

        account.credit(amount); // restore debited amount
        accountRepository.save(account);
        evictBalanceCache(fromAccountId);

        AccountEvent resultEvent = AccountEvent.builder()
                .transferId(transferId)
                .fromAccountId(fromAccountId)
                .toAccountId(event.getToAccountId())
                .amount(amount)
                .eventType("COMPENSATED")
                .build();
        kafkaTemplate.send("transfer.compensated", transferId.toString(), resultEvent);
        log.info("Compensation successful: transferId={}", transferId);
    }

    @Transactional
    public Account deposit(UUID userId, BigDecimal amount) {
        Account account = accountRepository.findByUserId(userId)
                .orElseThrow(() -> new IllegalArgumentException("Account not found for user: " + userId));
        account.credit(amount);
        Account saved = accountRepository.save(account);
        evictBalanceCache(saved.getId());
        return saved;
    }
}
