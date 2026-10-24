CREATE TABLE terminals (
    id UUID PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,

    CONSTRAINT chk_terminal_status
        CHECK (status IN ('ACTIVE', 'DISABLED'))
);

CREATE INDEX idx_terminals_merchant_id
    ON terminals(merchant_id);
