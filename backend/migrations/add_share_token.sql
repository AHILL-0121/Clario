-- Migration: Add share_token to tickets table
-- Run this if you're not using Alembic migrations

-- Add the share_token column
ALTER TABLE tickets
ADD COLUMN share_token VARCHAR(64) NULL;

-- Create unique index
CREATE UNIQUE INDEX ix_tickets_share_token
ON tickets(share_token)
WHERE share_token IS NOT NULL;

-- Verify the changes
\d tickets;

-- Optional: Generate share tokens for existing escalated tickets
UPDATE tickets
SET share_token = encode(gen_random_bytes(32), 'base64')
WHERE status = 'ESCALATED' AND share_token IS NULL;
