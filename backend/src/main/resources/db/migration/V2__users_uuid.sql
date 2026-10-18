-- V1 is already applied: convert existing rows without changing migration history.
ALTER TABLE users ALTER COLUMN id DROP DEFAULT;
ALTER TABLE users ALTER COLUMN id TYPE UUID USING gen_random_uuid();
ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();
DROP SEQUENCE users_id_seq;
