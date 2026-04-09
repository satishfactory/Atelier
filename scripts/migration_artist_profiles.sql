-- artist_profiles — ensure all required columns exist
-- Safe to re-run (IF NOT EXISTS on each)

ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS display_name        TEXT;
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS location            TEXT;
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS practice_description TEXT;
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS website             TEXT;
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS image_url           TEXT;
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS practice_statement  TEXT;
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS city                TEXT;
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS country             TEXT;

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
