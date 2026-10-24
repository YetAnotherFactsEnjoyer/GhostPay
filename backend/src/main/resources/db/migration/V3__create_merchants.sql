CREATE TABLE merchants (
    id UUID PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_merchants_owner_id ON merchants(owner_id);
