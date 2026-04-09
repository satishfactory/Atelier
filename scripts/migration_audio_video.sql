-- Atelier — Audio/Video Session Layer Migration
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Safe to re-run: all statements use IF NOT EXISTS / IF EXISTS guards

-- ── Step 1: Extend painting_sessions with media columns ──────────────────────
ALTER TABLE painting_sessions
  ADD COLUMN IF NOT EXISTS session_type    TEXT DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS transcript      TEXT,
  ADD COLUMN IF NOT EXISTS duration_secs   INTEGER,
  ADD COLUMN IF NOT EXISTS frame_count     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS session_summary TEXT,
  ADD COLUMN IF NOT EXISTS recorded_at     TIMESTAMPTZ;

-- ── Step 2: Add rolling_summary to paintings ──────────────────────────────────
ALTER TABLE paintings
  ADD COLUMN IF NOT EXISTS rolling_summary TEXT;

-- ── Step 3: session_frames table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS session_frames (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID REFERENCES painting_sessions(id) ON DELETE CASCADE,
  painting_slug   TEXT NOT NULL,
  frame_index     INTEGER NOT NULL,
  frame_url       TEXT NOT NULL,
  captured_at_sec FLOAT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE session_frames ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "open_access_session_frames" ON session_frames;
CREATE POLICY "open_access_session_frames" ON session_frames
  FOR ALL USING (true);

-- ── Step 4: media_config table + seed ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media_config (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key   TEXT NOT NULL UNIQUE,
  config_value TEXT NOT NULL,
  value_type   TEXT NOT NULL,
  category     TEXT NOT NULL,
  description  TEXT,
  last_updated TIMESTAMPTZ DEFAULT now(),
  updated_by   TEXT DEFAULT 'system'
);

INSERT INTO media_config (config_key, config_value, value_type, category, description)
VALUES
  ('max_video_duration_secs',       '120',      'integer', 'recording',   'Hard stop for video recording in seconds'),
  ('max_audio_duration_secs',       '180',      'integer', 'recording',   'Hard stop for audio recording in seconds'),
  ('recording_preview_enabled',     'true',     'boolean', 'recording',   'Show preview before confirming save'),
  ('frames_short_video',            '3',        'integer', 'processing',  'Frames for videos 0-30s'),
  ('frames_medium_video',           '4',        'integer', 'processing',  'Frames for videos 30-60s'),
  ('frames_long_video',             '5',        'integer', 'processing',  'Frames for videos 60-120s'),
  ('frames_hard_cap',               '5',        'integer', 'processing',  'Maximum frames per session — never exceeded'),
  ('frame_max_width_px',            '1024',     'integer', 'processing',  'Sharp resize width for extracted frames'),
  ('frame_quality_percent',         '85',       'integer', 'processing',  'WebP quality for compressed frames'),
  ('upload_image_max_px',           '2000',     'integer', 'processing',  'Max dimension for full painting uploads'),
  ('upload_thumb_max_px',           '400',      'integer', 'processing',  'Max dimension for thumbnail generation'),
  ('api_image_max_px',              '1024',     'integer', 'processing',  'Max dimension before sending to Claude API'),
  ('api_image_quality',             '85',       'integer', 'processing',  'JPEG quality before sending to Claude API'),
  ('analyse_session_max_tokens',    '600',      'integer', 'ai',          'Max output tokens for analyse_session'),
  ('session_dialogue_max_tokens',   '1000',     'integer', 'ai',          'Max output tokens for session_dialogue'),
  ('analyse_session_frames',        '3',        'integer', 'ai',          'Frames sent in analyse_session context'),
  ('rolling_summary_max_words',     '400',      'integer', 'ai',          'Maximum words in rolling summary'),
  ('context_past_sessions',         '1',        'integer', 'ai',          'Past session summaries in context'),
  ('context_recent_dialogue',       '6',        'integer', 'ai',          'Recent messages in companion context'),
  ('context_recent_paintings',      '5',        'integer', 'ai',          'Recent paintings in home context'),
  ('evaluate_painting_max_tokens',  '1500',     'integer', 'ai',          'Max output for painting evaluation'),
  ('companion_dialogue_max_tokens', '800',      'integer', 'ai',          'Max output for companion dialogue'),
  ('generate_blog_max_tokens',      '3000',     'integer', 'ai',          'Max output for blog generation'),
  ('morning_message_max_tokens',    '400',      'integer', 'ai',          'Max output for morning message'),
  ('storage_bucket_paintings',      'paintings','text',    'storage',     'Supabase Storage bucket for painting images'),
  ('storage_bucket_sessions',       'paintings','text',    'storage',     'Supabase Storage bucket for session frames'),
  ('storage_path_sessions',         'sessions', 'text',    'storage',     'Path prefix for session frames in bucket'),
  ('whisper_model',                 'whisper-1','text',    'processing',  'OpenAI Whisper model version'),
  ('whisper_language',              'en',       'text',    'processing',  'Default transcription language')
ON CONFLICT (config_key) DO NOTHING;

-- ── Verify ───────────────────────────────────────────────────────────────────
SELECT 'painting_sessions new columns' AS check,
  COUNT(*) AS found
FROM information_schema.columns
WHERE table_name = 'painting_sessions'
  AND column_name IN ('session_type','transcript','duration_secs','frame_count','session_summary','recorded_at');

SELECT 'paintings.rolling_summary' AS check,
  COUNT(*) AS found
FROM information_schema.columns
WHERE table_name = 'paintings' AND column_name = 'rolling_summary';

SELECT 'session_frames rows' AS check, COUNT(*) FROM session_frames;
SELECT 'media_config rows'   AS check, COUNT(*) FROM media_config;
