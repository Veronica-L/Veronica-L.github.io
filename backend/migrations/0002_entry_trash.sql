ALTER TABLE entries ADD COLUMN deleted_at TEXT;
CREATE INDEX IF NOT EXISTS entries_trash_updated ON entries(deleted_at, updated_at);
