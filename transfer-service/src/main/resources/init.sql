CREATE TABLE IF NOT EXISTS transfer_sagas (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status          VARCHAR(30) NOT NULL DEFAULT 'INITIATED',
    amount          DECIMAL(15,2) NOT NULL,
    from_account_id UUID NOT NULL,
    to_account_id   UUID NOT NULL,
    from_user_id    UUID NOT NULL,
    failure_reason  VARCHAR(500),
    retry_count     INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfer_sagas_status      ON transfer_sagas(status);
CREATE INDEX IF NOT EXISTS idx_transfer_sagas_from_user   ON transfer_sagas(from_user_id);
CREATE INDEX IF NOT EXISTS idx_transfer_sagas_created_at  ON transfer_sagas(created_at DESC);
