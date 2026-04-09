# Audio & Video Session Layer — Implementation Plan v3
## Atelier — Artist Companion App
## Reviewed and updated April 3, 2026

---

## INSTRUCTIONS FOR CLAUDE CODE — READ FIRST

Before implementing anything in this document:

1. Read CLAUDE.md for architecture rules
2. Read ROADMAP.md for current project state
3. Run this query in Supabase and report back:
   ```sql
   SELECT table_name, column_name, data_type 
   FROM information_schema.columns 
   WHERE table_schema = 'public' 
   ORDER BY table_name, ordinal_position;
   ```
4. Check package.json for already-installed dependencies
5. Check server.js for existing routes and patterns
6. Check src/lib/supabase.js for existing query functions
7. Report what already exists vs what needs to be built
8. Propose an implementation plan with effort estimates
9. Wait for approval before writing a single line of code

The goal is to add this capability without touching anything
that currently works. Every existing route, component, and
query must continue to function identically after this build.

---

## Overview

When an artist opens a WIP painting, they can record audio, video, or both
directly from the painting detail screen. All media is processed server-side:
audio is transcribed, video is reduced to key frames plus transcript.
Original media files are deleted immediately after processing.
What persists is tiny: text + 3-5 frames per session.

This transforms the studio workflow: instead of stopping to type a note,
the artist presses record, speaks while they work, and the system captures
everything. The companion analyses what was actually said in the moment.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        ATELIER — FULL STACK                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  BROWSER (React + Vite, port 5173)                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  App.jsx (router)                                        │    │
│  │  ├── OnboardingScreen.jsx (first-time only)             │    │
│  │  ├── HomeScreen.jsx (morning briefing)                  │    │
│  │  ├── GalleryScreen.jsx (All/My Work/Masterpieces/WIP)   │    │
│  │  ├── PaintingDetailScreen.jsx ← NEW: SessionRecorder    │    │
│  │  ├── UploadScreen.jsx (evaluate WIP paintings)          │    │
│  │  ├── BlogScreen.jsx (generate + edit process journals)  │    │
│  │  └── ProfileScreen.jsx (stats + work + influences)      │    │
│  │                                                          │    │
│  │  Components: PaintingCard, ScoreRing, BottomNav         │    │
│  │  NEW: SessionRecorder, PastSessionCard                  │    │
│  │                                                          │    │
│  │  src/lib/supabase.js ← ALL database queries             │    │
│  │  src/lib/api.js      ← ALL server API calls             │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                      │
│                     HTTP / SSE (streaming)                        │
│                            │                                      │
│  EXPRESS SERVER (Node.js, port 3001)                             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  server.js                                               │    │
│  │  ├── POST /api/evaluate         (existing — 4 call types)│    │
│  │  │     evaluate_painting                                  │    │
│  │  │     companion_dialogue                                 │    │
│  │  │     generate_blog                                      │    │
│  │  │     morning_message                                    │    │
│  │  │     analyse_session    ← NEW                          │    │
│  │  │     session_dialogue   ← NEW                          │    │
│  │  ├── POST /api/add-painting-image  (existing)            │    │
│  │  ├── POST /api/upload-photo        (existing)            │    │
│  │  └── POST /api/sessions/media      ← NEW                 │    │
│  │                                                          │    │
│  │  PROCESSING PIPELINE (new — inside server.js):          │    │
│  │  receive multipart → write /tmp → ffmpeg frames →       │    │
│  │  Sharp compress → Whisper transcribe →                   │    │
│  │  upload to Supabase Storage → delete /tmp →             │    │
│  │  save to DB → call analyse_session async                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│         │                    │                    │               │
│         ▼                    ▼                    ▼               │
│  ┌──────────┐    ┌─────────────────┐   ┌──────────────────┐    │
│  │ANTHROPIC │    │   SUPABASE      │   │   OPENAI         │    │
│  │CLAUDE API│    │                 │   │   WHISPER API    │    │
│  │          │    │  Database       │   │                  │    │
│  │ claude-  │    │  ├─ paintings   │   │  Transcription   │    │
│  │ sonnet-  │    │  ├─ painting_   │   │  only — not chat │    │
│  │ 4-6      │    │  │  sessions    │   │  ~$0.006/min     │    │
│  │          │    │  ├─ session_    │   │                  │    │
│  │ Prompt   │    │  │  frames(NEW) │   └──────────────────┘    │
│  │ caching  │    │  ├─ companion_  │                            │
│  │ enabled  │    │  │  conversations                            │
│  │          │    │  ├─ blog_posts  │                            │
│  │ Image    │    │  ├─ inspirations│                            │
│  │ resize   │    │  ├─ artist_     │                            │
│  │ 1024px   │    │  │  profiles    │                            │
│  │          │    │  ├─ prompt_     │                            │
│  └──────────┘    │  │  parameters  │                            │
│                   │  ├─ media_     │                            │
│                   │  │  config(NEW)│                            │
│                   │  └─ ...12 more │                            │
│                   │                │                            │
│                   │  Storage       │                            │
│                   │  ├─ paintings/ │                            │
│                   │  │  [slug]/    │                            │
│                   │  └─ sessions/ (NEW)                        │
│                   │     [slug]/    │                            │
│                   │     [id]/      │                            │
│                   │     frame_N.webp                            │
│                   └─────────────────┘                          │
│                                                                   │
│  LOCAL MAC (development)                                         │
│  ├── painting-images/[slug]/*.jpg  → npm run upload-images      │
│  ├── private/artmind_system_prompt.txt  (secret recipe)         │
│  ├── private/artmind_style_protocol.txt                         │
│  └── scripts/upload-images.js, ingest-archive.js               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Performance Configuration Table (NEW)

### All tunable parameters go in this table — never hardcoded.

```sql
CREATE TABLE IF NOT EXISTS media_config (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key       TEXT NOT NULL UNIQUE,
  config_value     TEXT NOT NULL,
  value_type       TEXT NOT NULL, -- 'integer' | 'float' | 'boolean' | 'text'
  category         TEXT NOT NULL, -- 'recording' | 'processing' | 'ai' | 'storage'
  description      TEXT,
  last_updated     TIMESTAMPTZ DEFAULT now(),
  updated_by       TEXT DEFAULT 'system'
);

-- Seed all configurable parameters
INSERT INTO media_config (config_key, config_value, value_type, category, description)
VALUES
  -- Recording limits
  ('max_video_duration_secs',    '120',    'integer', 'recording',   'Hard stop for video recording in seconds'),
  ('max_audio_duration_secs',    '180',    'integer', 'recording',   'Hard stop for audio recording in seconds'),
  ('recording_preview_enabled',  'true',   'boolean', 'recording',   'Show preview before confirming save'),

  -- Frame extraction
  ('frames_short_video',         '3',      'integer', 'processing',  'Frames to extract for videos 0-30s'),
  ('frames_medium_video',        '4',      'integer', 'processing',  'Frames to extract for videos 30-60s'),
  ('frames_long_video',          '5',      'integer', 'processing',  'Frames to extract for videos 60-120s'),
  ('frames_hard_cap',            '5',      'integer', 'processing',  'Maximum frames per session — never exceeded'),
  ('frame_max_width_px',         '1024',   'integer', 'processing',  'Sharp resize width for extracted frames'),
  ('frame_quality_percent',      '85',     'integer', 'processing',  'WebP quality for compressed frames (0-100)'),

  -- Image pipeline (existing — now configurable)
  ('upload_image_max_px',        '2000',   'integer', 'processing',  'Max dimension for full painting uploads'),
  ('upload_thumb_max_px',        '400',    'integer', 'processing',  'Max dimension for thumbnail generation'),
  ('api_image_max_px',           '1024',   'integer', 'processing',  'Max dimension before sending to Claude API'),
  ('api_image_quality',          '85',     'integer', 'processing',  'JPEG quality before sending to Claude API'),

  -- AI call parameters
  ('analyse_session_max_tokens', '600',    'integer', 'ai',          'Max output tokens for analyse_session call'),
  ('session_dialogue_max_tokens','1000',   'integer', 'ai',          'Max output tokens for session_dialogue call'),
  ('analyse_session_frames',     '3',      'integer', 'ai',          'Number of frames to send in analyse_session'),
  ('rolling_summary_max_words',  '400',    'integer', 'ai',          'Maximum words in rolling summary'),
  ('context_past_sessions',      '1',      'integer', 'ai',          'Number of past session summaries in context'),
  ('context_recent_dialogue',    '6',      'integer', 'ai',          'Number of recent messages in companion context'),
  ('context_recent_paintings',   '5',      'integer', 'ai',          'Number of recent paintings in home context'),

  -- Existing AI parameters (now configurable)
  ('evaluate_painting_max_tokens','1500',  'integer', 'ai',          'Max output for painting evaluation'),
  ('companion_dialogue_max_tokens','800',  'integer', 'ai',          'Max output for companion dialogue'),
  ('generate_blog_max_tokens',   '3000',   'integer', 'ai',          'Max output for blog generation'),
  ('morning_message_max_tokens', '400',    'integer', 'ai',          'Max output for morning message'),

  -- Storage
  ('storage_bucket_paintings',   'paintings', 'text', 'storage',    'Supabase Storage bucket for painting images'),
  ('storage_bucket_sessions',    'paintings', 'text', 'storage',    'Supabase Storage bucket for session frames'),
  ('storage_path_sessions',      'sessions',  'text', 'storage',    'Path prefix for session frames in bucket'),

  -- Transcription
  ('whisper_model',              'whisper-1', 'text', 'processing', 'OpenAI Whisper model version'),
  ('whisper_language',           'en',        'text', 'processing', 'Default transcription language');
```

### How server.js reads config

```javascript
// Load all config at server startup — cached in memory
let mediaConfig = {};

async function loadMediaConfig() {
  const { data } = await supabase
    .from('media_config')
    .select('config_key, config_value, value_type');
  
  data.forEach(row => {
    if (row.value_type === 'integer') 
      mediaConfig[row.config_key] = parseInt(row.config_value);
    else if (row.value_type === 'float') 
      mediaConfig[row.config_key] = parseFloat(row.config_value);
    else if (row.value_type === 'boolean') 
      mediaConfig[row.config_key] = row.config_value === 'true';
    else 
      mediaConfig[row.config_key] = row.config_value;
  });
}

// Call at startup, refresh every 5 minutes
loadMediaConfig();
setInterval(loadMediaConfig, 5 * 60 * 1000);

// Use in routes:
const maxFrames = mediaConfig.frames_hard_cap;         // 5
const frameWidth = mediaConfig.frame_max_width_px;     // 1024
const maxTokens = mediaConfig.analyse_session_max_tokens; // 600
```

**Benefit:** Change any parameter in the database without redeploying.
Update `frame_max_width_px` from 1024 to 800 in Supabase → takes effect
within 5 minutes on the live server. No code change. No Railway redeploy.

---

## What Gets Stored Per Session (Final State)

| Asset | Format | Approx Size | Kept? |
|---|---|---|---|
| Video original | .webm / .mp4 | 20–80 MB | ❌ Deleted after processing |
| Audio original | .webm / .ogg | 1–5 MB | ❌ Deleted after processing |
| Extracted frames | WebP (Sharp compressed) | 80–150 KB each | ✅ 3–5 frames |
| Audio transcript | Plain text | ~500 bytes | ✅ Permanent |
| Video transcript | Plain text | ~500 bytes | ✅ Permanent |
| Session summary | Plain text (AI-generated) | ~300 bytes | ✅ Permanent |
| Rolling summary | Plain text (updated each session) | ~400 words | ✅ Permanent |

**Total per session: ~1 MB maximum (vs 80 MB raw)**

---

## Database Schema Changes

```sql
-- Step 1: Add media columns to EXISTING painting_sessions table
-- Check first: SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'painting_sessions';
-- Only add columns that do not already exist.

ALTER TABLE painting_sessions
  ADD COLUMN IF NOT EXISTS session_type    TEXT DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS transcript      TEXT,
  ADD COLUMN IF NOT EXISTS duration_secs   INTEGER,
  ADD COLUMN IF NOT EXISTS frame_count     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS session_summary TEXT,
  ADD COLUMN IF NOT EXISTS recorded_at     TIMESTAMPTZ;

-- Step 2: Add rolling_summary to paintings table
ALTER TABLE paintings
  ADD COLUMN IF NOT EXISTS rolling_summary TEXT;

-- Step 3: New session_frames table
CREATE TABLE IF NOT EXISTS session_frames (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID REFERENCES painting_sessions(id) ON DELETE CASCADE,
  painting_slug   TEXT NOT NULL,
  frame_index     INTEGER NOT NULL,
  frame_url       TEXT NOT NULL,       -- Supabase Storage URL (NOT BYTEA)
  captured_at_sec FLOAT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE session_frames ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user isolation session_frames" ON session_frames
  FOR ALL USING (true);

-- Step 4: media_config table (see Performance Configuration section above)
-- Run the CREATE TABLE + INSERT from that section here.
```

---

## Server Processing Pipeline

```
POST /api/sessions/media
│
├── 1. Load config from mediaConfig cache
│
├── 2. Receive multipart via multer:
│       { paintingSlug, audioBlob?, videoBlob?, sessionNotes? }
│
├── 3. Write to /tmp — never permanent storage
│
├── 4a. If audio:
│       OpenAI Whisper API → transcript
│       Model: mediaConfig.whisper_model
│
├── 4b. If video:
│       Calculate frame count from duration + config table
│       fluent-ffmpeg: extract N frames (N from config)
│       Sharp: compress each → WebP
│         width: mediaConfig.frame_max_width_px
│         quality: mediaConfig.frame_quality_percent
│       Upload to Supabase Storage:
│         bucket: mediaConfig.storage_bucket_sessions
│         path: mediaConfig.storage_path_sessions/[slug]/[timestamp]/frame_N.webp
│       Whisper: transcribe audio track
│
├── 5. Delete all /tmp files immediately
│
├── 6. Save to painting_sessions (existing table, new columns)
│       Save frame URLs to session_frames (new table)
│
├── 7. Call analyse_session async (non-blocking)
│       max_tokens: mediaConfig.analyse_session_max_tokens
│       frames: mediaConfig.analyse_session_frames
│
└── 8. Return { sessionId, transcript, frameCount, frameUrls }
```

---

## Rolling Summary

A short paragraph stored in `paintings.rolling_summary`.
Updated after every session. Injected into every future evaluation.
Prevents context growing unbounded as sessions accumulate.

Maximum words: `mediaConfig.rolling_summary_max_words` (default 400).

**Format:**
```
[Painting title] · v[N] · Overall [score]

[Current state of the painting — what is resolved, what remains open]

Last session ([date]): [What the artist said and did]

Current growth edge: [One specific thing that needs a decision]
```

---

## New AI Call Types

Both added as new callType values in the existing /api/evaluate route.
Do not create a new route — extend the existing one.

### analyse_session
```javascript
// Triggered automatically after session save — async, non-blocking
{
  callType: 'analyse_session',
  // Context assembled from:
  rollingSummary,        // paintings.rolling_summary
  newTranscript,         // session.transcript
  recentFrameUrls,       // session.frameUrls.slice(0, mediaConfig.analyse_session_frames)
  lastSessionSummary     // previous painting_sessions.session_summary
  // max_tokens: mediaConfig.analyse_session_max_tokens (600)
}
// Output stored as: painting_sessions.session_summary
// Updates: paintings.rolling_summary
```

### session_dialogue
```javascript
// Triggered when artist opens a past session to discuss
{
  callType: 'session_dialogue',
  rollingSummary,
  sessionTranscript,
  sessionFrameUrls,      // all frames for this session
  userMessage            // artist's question
  // max_tokens: mediaConfig.session_dialogue_max_tokens (1000)
  // Saved to: companion_conversations
}
```

---

## New Dependencies

```bash
# Check package.json first — do not reinstall if present
npm install fluent-ffmpeg    # video frame extraction
npm install openai           # Whisper transcription only
npm install multer           # multipart form handling (may exist)

# macOS only — needed for local dev
brew install ffmpeg

# Add to .env.local:
OPENAI_API_KEY=sk-...        # Whisper only — not for chat completions
```

---

## Frontend Component

**New files:**
- src/components/SessionRecorder.jsx (max 150 lines)
- src/components/PastSessionCard.jsx (max 100 lines)

**Added to:** PaintingDetailScreen.jsx
**Position:** Below painting image, above Studio Journal section
**Condition:** Only render for WIP paintings (status === 'wip')

```
┌─────────────────────────────────────────────┐
│  STUDIO SESSION                             │
│                                             │
│  [ 🎙 Record Audio ]  [ 📹 Record Video ]   │
│                                             │
│  ● Recording... 0:42  [ ⏹ Stop ]           │
│  ─────────────────────────────────────────  │
│  Past Sessions                              │
│  ┌─────────────────────────────────────┐   │
│  │ 📹 Apr 3 · 0:42                     │   │
│  │ "struggling with the upper zone..." │   │
│  │ [3 frames] [💬 Discuss this session]│   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## Implementation Plan for Claude Code

### Pre-implementation checklist (do before writing any code)

```
1. Query Supabase information_schema — list all tables and columns
2. Check package.json — list installed packages
3. Check server.js — list existing routes and the mediaConfig pattern
4. Check src/lib/supabase.js — list existing query functions
5. Check painting_sessions columns — confirm which new columns to add
6. Report findings and confirm nothing will be overwritten
7. Estimate effort for each step (see below)
8. Wait for approval
```

### Step-by-step (in strict order)

**Step 1 — media_config table (15 min)**
Run SQL in Supabase. Verify all 28 rows inserted.
Add loadMediaConfig() function to server.js.
Test: console.log(mediaConfig) on server start.

**Step 2 — Database migration (10 min)**
Run ALTER TABLE painting_sessions (add 5 columns).
Run ALTER TABLE paintings (add rolling_summary).
Run CREATE TABLE session_frames.
Verify in Supabase Table Editor.

**Step 3 — Dependencies (10 min)**
Check package.json first. Install only what is missing.
Test fluent-ffmpeg import. Test openai import.
Add OPENAI_API_KEY to .env.local.

**Step 4 — POST /api/sessions/media (60 min)**
Add to server.js — new route only, no changes to existing routes.
Use multer for multipart. Use mediaConfig for all parameters.
Test with audio file first, then video.
Verify /tmp cleanup, DB save, Storage upload.

**Step 5 — analyse_session call type (20 min)**
Add to existing callType switch in /api/evaluate route.
Use mediaConfig for token limits and frame count.
Test: submit a session, verify session_summary saved, rolling_summary updated.

**Step 6 — Update dynamic context (15 min)**
In existing evaluate_painting context assembly, add rolling_summary.
Replace full session history with rolling_summary + last 1 session.
Test: evaluate a painting, verify rolling_summary appears in context.

**Step 7 — SessionRecorder component (45 min)**
New file only. Does not modify PaintingDetailScreen.jsx logic.
Add one line to PaintingDetailScreen: import + render SessionRecorder.
Test recording, preview, submit, frame display.

**Step 8 — PastSessionCard component (20 min)**
New file only. Renders one past session with transcript + frames.
Discuss this session → triggers session_dialogue call.

**Total estimated effort: 3-4 hours**

---

## What NOT to Touch

These files must not be modified except where specified:

- design-system.css — no changes
- src/lib/supabase.js — ADD new functions only, never modify existing
- src/components/ScoreRing.jsx — no changes
- src/components/PaintingCard.jsx — no changes
- HomeScreen.jsx, GalleryScreen.jsx, BlogScreen.jsx, ProfileScreen.jsx — no changes
- The existing /api/evaluate route logic — ADD new callTypes only
- The existing /api/add-painting-image route — no changes
- The existing /api/upload-photo route — no changes
- paintings table existing columns — no changes
- painting_sessions table existing columns — no changes (only ADD)

---

## Token Cost Estimate

| Operation | Tokens In | Tokens Out | Est. Cost |
|---|---|---|---|
| analyse_session | ~800 | 600 | ~$0.004 |
| session_dialogue (per exchange) | ~1200 | 1000 | ~$0.007 |
| Whisper transcription (1 min) | — | — | ~$0.006 |
| **Per session total** | | | **~$0.017** |

At 3 sessions/week: ~$0.22/month additional AI cost.

---

*Framework version 3.0 — April 3, 2026*
*Ready to hand to Claude Code as implementation spec*
