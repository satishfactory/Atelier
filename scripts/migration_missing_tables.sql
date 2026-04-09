-- Atelier — Missing Intelligence Tables Migration
-- Creates: studio_states, evolution_metrics, artist_style_protocols,
--          painting_subjects, prompt_parameters
-- Safe to re-run: all statements use IF NOT EXISTS guards
-- Run in Supabase Dashboard → SQL Editor → New query

-- ── 1. studio_states ─────────────────────────────────────────────────────────
-- Daily mood/state logs per painting session
CREATE TABLE IF NOT EXISTS studio_states (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES auth.users ON DELETE CASCADE,
  painting_slug  TEXT,
  state          TEXT,         -- 'focused' | 'flowing' | 'struggling'
  note           TEXT,         -- free-text note
  session_date   DATE DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE studio_states ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_studio_states" ON studio_states;
CREATE POLICY "own_studio_states" ON studio_states
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 2. evolution_metrics ──────────────────────────────────────────────────────
-- Per-artist growth tracking — written async after every evaluation
CREATE TABLE IF NOT EXISTS evolution_metrics (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES auth.users ON DELETE CASCADE,
  avg_overall       FLOAT,         -- average score across all paintings
  weakest_dimension TEXT,          -- lowest-scoring dimension key
  growth_edge       TEXT,          -- current growth area (AI-identified)
  growth_guidance   TEXT,          -- specific guidance for growth edge
  calculated_date   DATE DEFAULT CURRENT_DATE,
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE evolution_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_evolution_metrics" ON evolution_metrics;
CREATE POLICY "own_evolution_metrics" ON evolution_metrics
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 3. artist_style_protocols ─────────────────────────────────────────────────
-- Per-artist scoring corrections — tells Claude how to interpret dimensions
-- for this artist's specific style. Injected into every evaluation.
CREATE TABLE IF NOT EXISTS artist_style_protocols (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users ON DELETE CASCADE,
  style_name            TEXT,   -- e.g. "Expressionist figurative"
  colour_correction     TEXT,   -- e.g. "Artist intentionally uses muted palette — do not penalise"
  complexity_correction TEXT,   -- e.g. "Deliberate reduction is a strength, not a weakness"
  salience_correction   TEXT,
  fluency_method        TEXT,   -- e.g. "Loose gestural marks are intentional, not unfinished"
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE artist_style_protocols ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_style_protocols" ON artist_style_protocols;
CREATE POLICY "own_style_protocols" ON artist_style_protocols
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 4. painting_subjects ──────────────────────────────────────────────────────
-- Artist's confirmed meaning/intention for a painting
-- Injected into evaluate, blog, and collector_brief contexts
CREATE TABLE IF NOT EXISTS painting_subjects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  painting_slug       TEXT NOT NULL UNIQUE,
  subject_note        TEXT,    -- "What this painting is really about"
  confirmed           BOOLEAN DEFAULT false,
  revealed_in_session INTEGER, -- version number when artist clarified intention
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE painting_subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_access_painting_subjects" ON painting_subjects;
CREATE POLICY "open_access_painting_subjects" ON painting_subjects
  FOR ALL TO authenticated USING (true);

-- ── 5. prompt_parameters ──────────────────────────────────────────────────────
-- DB-driven system prompt components — edit the AI persona without redeployment
-- Falls back to private/artmind_system_prompt.txt if this table is empty
CREATE TABLE IF NOT EXISTS prompt_parameters (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component        TEXT NOT NULL,         -- e.g. 'persona', 'scoring_rubric', 'tone'
  component_type   TEXT DEFAULT 'static', -- 'static' | 'dynamic'
  content          TEXT NOT NULL,
  component_order  INTEGER DEFAULT 0,
  active           BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE prompt_parameters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open_read_prompt_parameters" ON prompt_parameters;
CREATE POLICY "open_read_prompt_parameters" ON prompt_parameters
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "admin_write_prompt_parameters" ON prompt_parameters;
CREATE POLICY "admin_write_prompt_parameters" ON prompt_parameters
  FOR ALL TO authenticated USING (true);

-- ── Verify all tables created ─────────────────────────────────────────────────
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'studio_states', 'evolution_metrics', 'artist_style_protocols',
    'painting_subjects', 'prompt_parameters'
  )
ORDER BY table_name;
