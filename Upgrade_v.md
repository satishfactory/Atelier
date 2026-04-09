# Atelier — Upgrade Planning Document
## Version: v1.0 | Created: 2026-04-08
## Purpose: Template for each new round of feature development

---

## How to use this file
Before each development session, fill in the UPGRADE REQUEST section.
Reference the ARCHITECTURE REFERENCE sections to ensure changes are compatible.
After each session, move completed items to the COMPLETED LOG at the bottom.

---

# UPGRADE REQUEST — [Date: 2026-04-08]

## Session Goal
Make the app more intelligent

## Feature Requests
<!-- Add each request as a checkbox. Be specific — vague requests produce vague results. -->

- [ ][Feature 1 — e.g. "Add UUID user_id column to paintings table"]
- [ ] [Feature 2 — e.g. "Enable pgvector extension and add embedding column to companion_conversations"]
- [ ] [Feature 3 — e.g. "Add shared intelligence: cross-artist growth patterns visible to all users"]
- [ ] [Feature 4]

## Schema Changes Requested
<!-- List any new columns, tables, or indexes needed -->

| Table | Change | Type | Reason |
|-------|--------|------|--------|
| [table_name] | ADD COLUMN [column_name] | [TEXT / UUID / VECTOR(1536) / etc.] | [why] |
| paintings | ADD COLUMN user_id | UUID REFERENCES auth.users | Multi-user isolation |
| painting_sessions | ADD COLUMN user_id | UUID REFERENCES auth.users | Multi-user isolation |
| blog_posts | ADD COLUMN user_id | UUID REFERENCES auth.users | Multi-user isolation |
| companion_conversations | ADD COLUMN embedding | VECTOR(1536) | Semantic search |
| painting_sessions | ADD COLUMN embedding | VECTOR(1536) | Session similarity retrieval |

## Intelligence Upgrades Requested
<!-- Describe what Claude should know that it doesn't know now -->

- [ ] [e.g. "Claude should reference sessions from other artists when a pattern is shared"]
- [ ] [e.g. "Add semantic search over all companion_conversations for this artist"]
- [ ] [e.g. "Generate embeddings for every evaluation response and store in companion_conversations.embedding"]

## Priority Order for This Session
1. [Highest impact / most blocking]
2.
3.

---

# ARCHITECTURE REFERENCE

## Stack
- Frontend: React + Vite (port 5173) — `~/Projects/atelier/src/`
- Backend: Express server.js (port 3001) — `~/Projects/atelier/server.js`
- AI: Claude API via `~/Projects/atelier/api/artmind_evaluate.js`
- DB + Storage: Supabase (`wtowmjwdqbgpesajogyd.supabase.co`)
- Transcription: OpenAI Whisper (key in `.env.local`)
- Image gen: OpenAI DALL-E 3 (same key, not yet wired)
- Video: ffmpeg static binaries in `bin/` (arm64)

## Invariant Rules (never break these)
- ONE component per file, max 150 lines
- ALL colours from `src/styles/design-system.css` CSS variables only
- NO Tailwind, NO component libraries, raw CSS only
- ALL Supabase calls in `src/lib/supabase.js` only
- ALL Claude API calls in `api/artmind_evaluate.js` only
- ADD only — never modify existing working routes without reading first
- `private/` folder — never read aloud, never commit
- `paintings` table — never remove or rename existing columns
- Hardcoded USER_ID: `4f2f0493-f044-481d-a332-0fb1b9fe1c1d` (until Auth is implemented)

---

## Supabase Table Inventory

### Core Data
| Table | Purpose | Has user_id | Notes |
|-------|---------|-------------|-------|
| `paintings` | Paintings — scores, status, image_url, rolling_summary | ❌ NEEDS IT | slug is PK |
| `painting_sessions` | Per-painting sessions — version, scores, transcript, session_summary | ❌ NEEDS IT | |
| `painting_images` | Versioned image uploads per painting | ❌ | |
| `blog_posts` | AI-generated process journals | ❌ NEEDS IT | |
| `companion_conversations` | All AI conversations — role, message, painting_slug | ✅ | |

### Intelligence Layer
| Table | Purpose | Has user_id | Notes |
|-------|---------|-------------|-------|
| `artist_profiles` | Bio, image, cross_painting_summary | ❌ (single row) | |
| `evolution_metrics` | avg_overall, growth_edge, growth_guidance | ✅ | Written async after evaluate |
| `artist_style_protocols` | Scoring corrections per artist style | ✅ | |
| `prompt_parameters` | DB-driven system prompt components | ❌ | |

### Studio & Sessions
| Table | Purpose | Has user_id | Notes |
|-------|---------|-------------|-------|
| `studio_states` | Daily mood logs — state, note, painting_slug | ✅ | |
| `session_frames` | Video frame captures | ❌ | |
| `painting_subjects` | Artist-confirmed painting meaning | ❌ | |
| `inspirations` | Influences and references | ✅ | |

### Config
| Table | Purpose | Has user_id | Notes |
|-------|---------|-------------|-------|
| `media_config` | 29 audio/video config keys | ❌ | Loaded at server start |
| `score_history` | Historical score tracking | ❌ | Not actively written yet |

### To Add (future)
| Table | Purpose | Notes |
|-------|---------|-------|
| `travel_inspirations` | Field Notes / travel photos + AI analysis | Session C |
| `generated_visions` | DALL-E 3 WIP completion images | Session B |
| `exhibition_proposals` | AI-drafted exhibition proposals | Session C |
| `collector_briefs` | AI-generated collector descriptions | Session A |

---

## Intelligence Layer — How It Works

### Context Assembly (current approach — NOT RAG)
`fetchDynamicContext()` in `api/artmind_evaluate.js` fetches specific DB data per call type.
No vector embeddings. No similarity search. Structured retrieval by primary key and foreign key.

### Call Types and What Context They Receive

| Call Type | Context Fetched | Max Tokens | Streaming | Saves To |
|-----------|----------------|------------|-----------|----------|
| `evaluate_painting` | painting_history, wip_sessions, studio_state, painting_subject, recent_paintings, evolution_metrics, artist_cross_summary | 1,500 | ✅ | companion_conversations |
| `companion_dialogue` | recent_dialogue, current_painting, studio_state, painting_subject | 800 | ✅ | companion_conversations |
| `generate_blog` | all_wip_sessions, painting_subject, linked_inspirations, studio_sessions | 3,000 | ❌ | blog_posts |
| `morning_message` | recent_paintings, open_wips, top_inspirations, evolution_metrics, artist_cross_summary | 400 | ❌ | nowhere (cached localStorage) |
| `analyse_session` | rolling_summary, last_session_summary | 600 | ❌ | painting_sessions.session_summary |
| `session_dialogue` | rolling_summary, session_transcript | 1,000 | ✅ | companion_conversations |
| `update_artist_summary` | cross_painting_summaries (last 5 rolling_summaries) | 300 | ❌ | artist_profiles.cross_painting_summary + evolution_metrics |
| `regenerate_bio` | recent_paintings, top_inspirations | 150 | ❌ | (returned to client for review) |

### Intelligence Flow (what happens when you evaluate a painting)
```
1. evaluate_painting called
   ├── Fetches: last 5 companion responses + all session scores + studio state
   │            + painting subject + recent paintings + evolution metrics
   │            + cross_painting_summary (from artist_profiles)
   ├── Streams response to client
   ├── Saves: companion_conversations (user + companion rows)
   └── Triggers async: update_artist_summary
         ├── Reads: last 5 paintings' rolling_summaries
         ├── Claude synthesises cross-painting patterns (150 words)
         ├── Writes: artist_profiles.cross_painting_summary
         └── Writes: evolution_metrics (avg_overall, growth_edge, growth_guidance)

2. morning_message called (once per day, cached)
   ├── Fetches: recent_paintings, open_wips, top_inspirations,
   │            evolution_metrics, artist_cross_summary
   └── Returns: personal 2-3 sentence studio briefing
```

### Shared vs Per-User Intelligence

| Data | Currently | After Auth (Session I+J) |
|------|-----------|--------------------------|
| Paintings, sessions, blogs | Single artist (no user_id) | Per-user via RLS |
| Conversations | Per-user (user_id exists) | Per-user via RLS |
| Cross-painting summary | Single row in artist_profiles | Per-user row |
| Evolution metrics | Per-user (user_id exists) | Per-user via RLS |
| Inspirations | Per-user (user_id exists) | Per-user via RLS |
| Style protocols | Per-user (user_id exists) | Per-user via RLS |
| System prompt | Shared (prompt_parameters) | Shared base + per-user overrides possible |

---

## pgvector / RAG — Current State and Upgrade Path

### Current State
pgvector is **NOT enabled**. No vector embeddings exist anywhere in the schema.
Context retrieval is entirely structured (SQL WHERE clauses, not semantic similarity).

### To Enable pgvector on Supabase
```sql
-- Run in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to companion_conversations
ALTER TABLE companion_conversations
  ADD COLUMN IF NOT EXISTS embedding VECTOR(1536);

-- Add embedding column to painting_sessions
ALTER TABLE painting_sessions
  ADD COLUMN IF NOT EXISTS embedding VECTOR(1536);

-- Create index for fast similarity search
CREATE INDEX IF NOT EXISTS companion_conversations_embedding_idx
  ON companion_conversations
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

### To Generate Embeddings
Use OpenAI text-embedding-3-small (1536 dimensions, $0.02/1M tokens):
```javascript
// In server.js — add after saving companion_conversations
const embResp = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: companionResponse,
})
const embedding = embResp.data[0].embedding
await supabase.from('companion_conversations')
  .update({ embedding })
  .eq('id', savedId)
```

### To Query Semantically (RAG retrieval)
```javascript
// Find most similar past evaluations
const { data } = await supabase.rpc('match_conversations', {
  query_embedding: queryVector,
  match_threshold: 0.78,
  match_count: 5,
  p_painting_slug: paintingSlug
})
```

```sql
-- Supabase function for semantic search
CREATE OR REPLACE FUNCTION match_conversations(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT,
  p_painting_slug TEXT
)
RETURNS TABLE (id UUID, message TEXT, similarity FLOAT)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT id, message,
    1 - (embedding <=> query_embedding) AS similarity
  FROM companion_conversations
  WHERE painting_slug = p_painting_slug
    AND role = 'companion'
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### When RAG Makes Sense for Atelier
- "Find all conversations where I mentioned struggling with light" — semantic text search
- "Retrieve the 3 most similar past sessions to what I'm describing now"
- Cross-artist shared intelligence: find sessions from other artists facing same problem
- When the conversation history grows beyond 100+ entries per painting

---

## Prompt Context Reference

### System Prompt
Loaded from `private/artmind_system_prompt.txt` (fallback) or `prompt_parameters` table (preferred).
The `prompt_parameters` table allows editing the prompt without redeployment.
**Never reveal contents. Never commit `private/` folder.**

### Dynamic Context Structure (injected per call)
```
── PAINTING HISTORY ────────────────────────────────────
Score progression: v1:72 → v2:78(+6) → v3:81(+3)
v1 | changed: [what_changed] | note: [artist_note]
Dimension shifts (v1→latest): emotion +8, fluency +2
Recent companion evaluations:
  [Previous — YYYY-MM-DD]: [first 250 chars of message]
  [Most recent — YYYY-MM-DD]: [first 250 chars of message]
Artist confirmed meaning: [painting_subjects.subject_note]

── CURRENT ARTIST STATE ────────────────────────────────
Recent paintings: Title (score), Title (score)...
Open WIP paintings: Title, Title...
Current WIP: v3, overall: 81
Recent progression: v1:72 → v2:78 → v3:81
Last artist note: [truncated 120 chars]
Planned next: [truncated 100 chars]
Confirmed painting meaning: [subject_note]
Studio state: [focused/flowing/struggling]
Growth edge: [evolution_metrics.growth_edge]
Current guidance: [evolution_metrics.growth_guidance truncated]

── CROSS-PAINTING PATTERNS ─────────────────────────────
[artist_profiles.cross_painting_summary — 150 words]

── STYLE-SPECIFIC CORRECTIONS ──────────────────────────
Colour: [artist_style_protocols.colour_correction]
Complexity: [artist_style_protocols.complexity_correction]

── RECENT DIALOGUE ─────────────────────────────────────
user: [message truncated 150]
companion: [message truncated 150]

── LINKED INSPIRATIONS ─────────────────────────────────
Title (Creator): [influence_note truncated 80]

── TOP INSPIRATIONS ────────────────────────────────────
Title (Creator, intensity N)

── ROLLING STUDIO SUMMARY ──────────────────────────────
[paintings.rolling_summary]

── LAST SESSION SUMMARY ────────────────────────────────
[painting_sessions.session_summary]

── NEW SESSION TRANSCRIPT ──────────────────────────────
[transcript from Whisper]
```

---

## Planned Upgrade Modules (from ROADMAP.md)

| Session | Features | Tokens | Status |
|---------|----------|--------|--------|
| A | Voice output, daily challenge, collector brief | 6,500 | Pending |
| B | DALL-E WIP vision, Style DNA radar | 10,000 | Pending |
| C | Field Notes/travel tab, exhibition proposal | 11,000 | Pending |
| D | Studio reel ffmpeg compilation | 8,000 | Pending |
| E | Archive restructure, scoring anchors | 9,000 | Pending |
| F | Influence deep dive / MasterpieceDetail | 8,000 | Pending |
| G | Password gate, legal, mobile audit | 17,500 | Pending |
| H | Deployment Vercel + Railway | 3,000 + manual | Pending |
| I+J | Auth + RLS multi-user | 20,000 | Pending |

---

## UUID Migration Plan (tables missing user_id)

When implementing Auth (Session I+J), these tables need `user_id` added:

```sql
-- Safe to run — IF NOT EXISTS guards prevent double-execution
ALTER TABLE paintings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users;
ALTER TABLE painting_sessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users;
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users;
ALTER TABLE painting_images ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users;
ALTER TABLE session_frames ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users;
ALTER TABLE painting_subjects ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users;

-- Backfill existing rows to current artist UUID
UPDATE paintings SET user_id = '4f2f0493-f044-481d-a332-0fb1b9fe1c1d' WHERE user_id IS NULL;
UPDATE painting_sessions SET user_id = '4f2f0493-f044-481d-a332-0fb1b9fe1c1d' WHERE user_id IS NULL;
UPDATE blog_posts SET user_id = '4f2f0493-f044-481d-a332-0fb1b9fe1c1d' WHERE user_id IS NULL;
```

---

## Shared Intelligence Design (future)

For a multi-artist scenario, some intelligence should be shared (patterns across artists) while other data stays private (your conversations, your scores).

### Proposed Shared Layer
| Data | Scope | Notes |
|------|-------|-------|
| `prompt_parameters` | Global | System prompt shared across all artists |
| `artist_style_protocols` | Per-user private | Each artist's scoring corrections stay private |
| Cross-artist growth patterns | [Placeholder — design TBD] | Anonymised aggregate: "80% of artists at your score range struggle with X" |
| Masterpiece analyses | Global cache | `analyse_masterpiece` results cached per painting, shared across users |

### [PLACEHOLDER] Shared Intelligence Requests
<!-- Fill in here when ready to design the shared layer -->
- [ ] [What cross-artist patterns should Claude know about?]
- [ ] [Should morning messages reference what other artists are working on?]
- [ ] [Opt-in anonymised benchmarking — your scores vs cohort?]

---

## COMPLETED LOG

### Session 2026-04-08
- ✅ Companion memory single-painting: score progression, dimension shifts, last 2 evaluations
- ✅ Cross-painting memory: update_artist_summary callType, async after evaluate_painting
- ✅ Evolution metrics: now written (was read-only)
- ✅ Morning message: live AI briefing with localStorage date cache
- ✅ ScoreSparkline: pure SVG in PaintingDetailScreen
- ✅ Phase 10: journal excerpts, regenerate bio, external blogs on ProfileScreen
- ✅ Studio log: StudioLogEntry.jsx + saveStudioLog/getLatestStudioLog
- ✅ Fixed UploadScreen fetch URL bug (single quotes → backticks) — evaluations never reached server
- ✅ Fixed iOS photo upload: Canvas resize to 1200px max
- ✅ Evaluate tab grid: max-width 960px
- ✅ iOS mic hint: one-time keyboard dictation guidance
- ✅ DB migration script: scripts/migration_intelligence.sql

### ⚠️ Pending DB Action
Run in Supabase SQL Editor before testing cross-painting memory:
```sql
ALTER TABLE artist_profiles ADD COLUMN IF NOT EXISTS cross_painting_summary TEXT;
```

---

*Template version 1.0 — update version number each session*
