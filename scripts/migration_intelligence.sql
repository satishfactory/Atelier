-- Migration: Intelligence layer
-- Run in Supabase SQL editor (safe to re-run)

-- Cross-painting memory: companion's synthesis across all paintings
ALTER TABLE artist_profiles
  ADD COLUMN IF NOT EXISTS cross_painting_summary TEXT;

-- Confirm
SELECT column_name FROM information_schema.columns
WHERE table_name = 'artist_profiles' AND column_name = 'cross_painting_summary';
