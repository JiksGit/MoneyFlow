package com.moneyflow.notification.event;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TransferEvent {
    private UUID transferId;
    private UUID fromAccountId;
    private UUID toAccountId;
    private UUID fromUserId;
    private BigDecimal amount;
    private String eventType;
    private String status;
    private String failureReason;
}
