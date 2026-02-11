ALTER TABLE transcriptions ADD COLUMN user_id TEXT NOT NULL DEFAULT 'local-user-id';
CREATE INDEX IF NOT EXISTS idx_transcriptions_user_id ON transcriptions(user_id);

ALTER TABLE tones ADD COLUMN user_id TEXT NOT NULL DEFAULT 'local-user-id';
CREATE INDEX IF NOT EXISTS idx_tones_user_id ON tones(user_id);
