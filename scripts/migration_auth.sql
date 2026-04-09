-- Atelier — Multi-user auth migration
-- Tables confirmed present: paintings, painting_sessions, blog_posts,
-- painting_images, artist_profiles, companion_conversations,
-- inspirations, session_frames
-- Tables NOT in DB (skipped): studio_states, evolution_metrics,
-- artist_style_protocols, painting_subjects, prompt_parameters, score_history

-- ── 1. Add user_id to tables missing it ──────────────────────
ALTER TABLE paintings               ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE painting_sessions       ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE blog_posts              ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE painting_images         ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE session_frames          ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE artist_profiles         ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE companion_conversations ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE inspirations            ADD COLUMN IF NOT EXISTS user_id UUID;

-- ── 2. Backfill existing rows ─────────────────────────────────
UPDATE paintings               SET user_id = '4f2f0493-f044-481d-a332-0fb1b9fe1c1d' WHERE user_id IS NULL;
UPDATE painting_sessions       SET user_id = '4f2f0493-f044-481d-a332-0fb1b9fe1c1d' WHERE user_id IS NULL;
UPDATE blog_posts              SET user_id = '4f2f0493-f044-481d-a332-0fb1b9fe1c1d' WHERE user_id IS NULL;
UPDATE painting_images         SET user_id = '4f2f0493-f044-481d-a332-0fb1b9fe1c1d' WHERE user_id IS NULL;
UPDATE session_frames          SET user_id = '4f2f0493-f044-481d-a332-0fb1b9fe1c1d' WHERE user_id IS NULL;
UPDATE artist_profiles         SET user_id = '4f2f0493-f044-481d-a332-0fb1b9fe1c1d' WHERE user_id IS NULL;
UPDATE companion_conversations SET user_id = '4f2f0493-f044-481d-a332-0fb1b9fe1c1d' WHERE user_id IS NULL;
UPDATE inspirations            SET user_id = '4f2f0493-f044-481d-a332-0fb1b9fe1c1d' WHERE user_id IS NULL;

-- ── 3. Enable RLS ─────────────────────────────────────────────
ALTER TABLE paintings             ENABLE ROW LEVEL SECURITY;
ALTER TABLE painting_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE painting_images       ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_frames        ENABLE ROW LEVEL SECURITY;
ALTER TABLE artist_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE companion_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspirations          ENABLE ROW LEVEL SECURITY;

-- ── 4. Drop old policies if re-running ───────────────────────
DROP POLICY IF EXISTS "own_paintings"         ON paintings;
DROP POLICY IF EXISTS "own_painting_sessions" ON painting_sessions;
DROP POLICY IF EXISTS "own_blog_posts"        ON blog_posts;
DROP POLICY IF EXISTS "own_painting_images"   ON painting_images;
DROP POLICY IF EXISTS "own_session_frames"    ON session_frames;
DROP POLICY IF EXISTS "own_artist_profiles"   ON artist_profiles;
DROP POLICY IF EXISTS "own_conversations"     ON companion_conversations;
DROP POLICY IF EXISTS "own_inspirations"      ON inspirations;

-- ── 5. Create RLS policies ────────────────────────────────────
CREATE POLICY "own_paintings"         ON paintings             FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_painting_sessions" ON painting_sessions     FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_blog_posts"        ON blog_posts            FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_painting_images"   ON painting_images       FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_session_frames"    ON session_frames        FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_artist_profiles"   ON artist_profiles       FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_conversations"     ON companion_conversations FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own_inspirations"      ON inspirations           FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
