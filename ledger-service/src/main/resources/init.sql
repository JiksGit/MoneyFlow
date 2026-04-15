CREATE TABLE IF NOT EXISTS transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transfer_id     UUID NOT NULL UNIQUE,
    from_account_id UUID NOT NULL,
    to_account_id   UUID NOT NULL,
    amount          DECIMAL(15,2) NOT NULL,
    status          VARCHAR(20) NOT NULL,  -- COMPLETED, FAILED
    failure_reason  VARCHAR(500),
    recorded_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_from_account ON transactions(from_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_account   ON transactions(to_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_recorded_at  ON transactions(recorded_at DESC);
