-- Re-link all existing data to the real owner's Supabase Auth UUID.
-- Run this ONCE after logging in for the first time.
--
-- Step 1: Get your UUID from Supabase Dashboard → Authentication → Users
-- Step 2: Replace YOUR_REAL_AUTH_UUID below with your actual UUID
-- Step 3: Run in Supabase SQL Editor

DO $$
DECLARE
  real_uuid   UUID := 'YOUR_REAL_AUTH_UUID';      -- ← paste your UUID here
  old_uuid    UUID := '4f2f0493-f044-481d-a332-0fb1b9fe1c1d';
BEGIN

  UPDATE paintings               SET user_id = real_uuid WHERE user_id = old_uuid OR user_id IS NULL;
  UPDATE painting_sessions       SET user_id = real_uuid WHERE user_id = old_uuid OR user_id IS NULL;
  UPDATE blog_posts              SET user_id = real_uuid WHERE user_id = old_uuid OR user_id IS NULL;
  UPDATE painting_images         SET user_id = real_uuid WHERE user_id = old_uuid OR user_id IS NULL;
  UPDATE session_frames          SET user_id = real_uuid WHERE user_id = old_uuid OR user_id IS NULL;
  UPDATE artist_profiles         SET user_id = real_uuid WHERE user_id = old_uuid OR user_id IS NULL;
  UPDATE companion_conversations SET user_id = real_uuid WHERE user_id = old_uuid OR user_id IS NULL;
  UPDATE inspirations            SET user_id = real_uuid WHERE user_id = old_uuid OR user_id IS NULL;

  RAISE NOTICE 'Done. All existing rows re-linked to %', real_uuid;
END $$;
