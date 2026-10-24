CREATE TABLE sync_batches (
    id UUID PRIMARY KEY,
    batch_id UUID NOT NULL,
    terminal_id UUID NOT NULL REFERENCES terminals(id),
    request_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_terminal_batch UNIQUE (terminal_id, batch_id)
);

CREATE TABLE sync_events (
    id UUID PRIMARY KEY,
    sync_batch_id UUID NOT NULL REFERENCES sync_batches(id),
    position INTEGER NOT NULL,
    local_payment_id UUID NOT NULL,
    result_status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_sync_batch_position UNIQUE (sync_batch_id, position),
    CONSTRAINT chk_sync_event_position CHECK (position >= 0),
    CONSTRAINT chk_sync_event_result_status
        CHECK (result_status IN ('ACCEPTED', 'DUPLICATE', 'CONFLICT', 'INVALID'))
);
