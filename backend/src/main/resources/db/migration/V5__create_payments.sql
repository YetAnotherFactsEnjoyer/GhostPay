CREATE TABLE payments (
    id UUID PRIMARY KEY,

    terminal_id UUID NOT NULL
        REFERENCES terminals(id),

    local_payment_id UUID NOT NULL,

    purchase_reference VARCHAR(100) NOT NULL,

    amount_minor BIGINT NOT NULL,

    currency VARCHAR(3) NOT NULL,

    status VARCHAR(20) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL,

    CONSTRAINT chk_payment_amount
        CHECK (amount_minor > 0),

    CONSTRAINT chk_payment_currency
        CHECK (currency = 'MYR'),

    CONSTRAINT chk_payment_status
        CHECK (status = 'ACCEPTED'),

    CONSTRAINT uq_terminal_local_payment
        UNIQUE (terminal_id, local_payment_id)
);

CREATE INDEX idx_payments_terminal_id
    ON payments(terminal_id);
