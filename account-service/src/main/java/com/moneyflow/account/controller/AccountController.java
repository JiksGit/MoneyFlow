package com.moneyflow.account.controller;

import com.moneyflow.account.domain.Account;
import com.moneyflow.account.service.AccountService;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> createAccount(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody(required = false) Map<String, Object> body) {
        BigDecimal initialBalance = BigDecimal.ZERO;
        if (body != null && body.containsKey("initialBalance")) {
            initialBalance = new BigDecimal(body.get("initialBalance").toString());
        }
        Account account = accountService.createAccount(UUID.fromString(userId), initialBalance);
        return ResponseEntity.status(HttpStatus.CREATED).body(toMap(account));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMyAccount(
            @RequestHeader("X-User-Id") String userId) {
        Account account = accountService.getAccountByUserId(UUID.fromString(userId));
        BigDecimal balance = accountService.getCachedBalance(account.getId());
        return ResponseEntity.ok(Map.of(
                "id", account.getId(),
                "userId", account.getUserId(),
                "balance", balance,
                "createdAt", account.getCreatedAt()
        ));
    }

    @GetMapping("/{accountId}")
    public ResponseEntity<Map<String, Object>> getAccount(@PathVariable UUID accountId) {
        BigDecimal balance = accountService.getCachedBalance(accountId);
        Account account = accountService.getAccount(accountId);
        return ResponseEntity.ok(Map.of(
                "id", account.getId(),
                "userId", account.getUserId(),
                "balance", balance,
                "createdAt", account.getCreatedAt()
        ));
    }

    @PostMapping("/me/deposit")
    public ResponseEntity<Map<String, Object>> deposit(
            @RequestHeader("X-User-Id") String userId,
            @RequestBody Map<String, Object> body) {
        @NotNull @DecimalMin("0.01")
        BigDecimal amount = new BigDecimal(body.get("amount").toString());
        Account account = accountService.deposit(UUID.fromString(userId), amount);
        return ResponseEntity.ok(toMap(account));
    }

    private Map<String, Object> toMap(Account account) {
        return Map.of(
                "id", account.getId(),
                "userId", account.getUserId(),
                "balance", account.getBalance(),
                "createdAt", account.getCreatedAt()
        );
    }
}
