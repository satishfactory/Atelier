# Atelier — Database & Intelligence Architecture Review
## Private document — do not commit, do not read aloud
## Last updated: 2026-04-07

---

# PART 1 — DATABASE INVENTORY

## Tables confirmed in Supabase

| Table | Purpose | RLS | user_id |
|-------|---------|-----|---------|
| paintings | Master record — scores, images, summaries, embeddings | ✅ | ✅ |
| painting_sessions | Per-version evaluation rows + audio/video sessions | ✅ | ✅ |
| painting_images | Versioned photo uploads per painting | ✅ | ✅ |
| companion_conversations | Full AI dialogue history | ✅ | ✅ |
| blog_posts | AI-generated process journals | ✅ | ✅ |
| artist_profiles | Bio, photo, cross-painting summary | ✅ | ✅ |
| inspirations | Artist influences — painters, books, concepts | ✅ | ✅ |
| session_frames | Video frames extracted by ffmpeg | ✅ | ✅ |
| media_config | 29 audio/video pipeline config keys (no user scope) | ❌ | ❌ |

## Tables referenced in code — confirmed created 2026-04-07

Previously missing, created via scripts/migration_missing_tables.sql:

| Table | Status | Notes |
|-------|--------|-------|
| studio_states | ✅ Created 2026-04-07 | Needs content via StudioLogEntry UI |
| evolution_metrics | ✅ Created 2026-04-07 | Populated async after each evaluation |
| artist_style_protocols | ✅ Created 2026-04-07 | Needs manual content in Supabase dashboard for now |
| painting_subjects | ✅ Created 2026-04-07 | Needs manual content — no UI yet |
| prompt_parameters | ✅ Created 2026-04-07 | Empty — falls back to private/artmind_system_prompt.txt until seeded |
| score_history | ❌ Still unused | No code reads or writes to it |

## Full column inventory — key tables

### paintings (38+ columns)
Core: slug (PK), title, artist, year, type, status, visibility, user_id
Images: image_url, thumbnail_b64 (legacy)
Scores: score_overall, score_salience, score_gaze, score_fluency, score_emotion, score_complexity, score_mirror, score_colour, score_narrative
Bot sub-scores: bot_formalist, bot_colour_theorist (+ others) — written, never displayed in UI
AI text: viewer_experience, practice_connection, appraisal_strengths, appraisal_develop, market_positioning — written, never displayed
Meta: tags, evaluated_at, first_fixation, evaluated_by — written, never displayed
Intelligence: rolling_summary (cumulative narrative), embedding VECTOR(1536)

### painting_sessions (15+ columns)
    Core: id (PK), painting_slug, version, artist_note, session_date, user_id
    Scores: score_overall + 8 dimensions (snapshot at evaluation time)
    Audio/video: session_type, transcript, duration_secs, frame_count, session_summary, recorded_at
    Legacy: what_changed, what_to_do_next (referenced in context builder but not in current UI forms)

### artist_profiles (11+ columns)
Core: id, user_id, display_name, location, city, country (city/country separate from location — drift)
Practice: practice_description (user-editable), practice_statement (AI-regenerated — different field)
Intelligence: cross_painting_summary (AI synthesis, updated async after each evaluation)
Visual: image_url, website

---

# PART 2 — VECTOR EMBEDDINGS

## Structure
- Model: OpenAI text-embedding-3-small (1536 dimensions, $0.02/1M tokens)
- Column: paintings.embedding VECTOR(1536)
- Extension: pgvector (enabled via migration_vectors.sql)
- Search function: similar_paintings() — cosine similarity via `<=>` operator

## What gets embedded
Only `paintings` rows are embedded. Text assembled from:
```
[title] + [appraisal_strengths] + [practice_connection] + [viewer_experience] + [rolling_summary]
```
Truncated to 8,000 characters before embedding. Fields that are null are skipped.

## When embedding is generated
1. Async after every `evaluate_painting` call (`setImmediate` in server.js)
2. On demand via `GET /api/similar-paintings/:slug` if no embedding exists yet
3. Cached — if `paintings.embedding` is already set, no re-generation

## Retrieval function (Supabase RPC)
```sql
similar_paintings(query_embedding, exclude_slug, match_count=3)
-- Returns: slug, title, image_url, score_overall, artist, status, similarity
-- Filter: type = 'artist_work', embedding IS NOT NULL
-- Order: cosine distance ascending (most similar first)
```

## Status: PARTIALLY IMPLEMENTED
| Component | Status |
|-----------|--------|
| pgvector extension | ✅ Enabled |
| paintings.embedding column | ✅ Added |
| Embedding generation (post-evaluate) | ✅ Live |
| similar_paintings() RPC function | ✅ Live |
| CollectorBrief "Find similar" button | ✅ Live |
| companion_conversations.embedding | ❌ Not added |
| painting_sessions.embedding | ❌ Not added |
| RAG retrieval (semantic search over conversations) | ❌ Not implemented |
| Embedding for masterpiece paintings | ❌ Not generated |
| Cross-user similarity (find artists working similarly) | ❌ Not designed |

## Open items
- Embeddings only exist on paintings, not on conversations or sessions. The companion cannot say "you mentioned this 6 sessions ago" — it can only reference the last 5 companion messages structurally.
- Masterpiece paintings (type='masterpiece') are excluded from similar_paintings() by `type = 'artist_work'` filter — intentional or oversight?
- No index on paintings.embedding (ivfflat) — cosine search is full scan. Fine for <100 paintings, will slow at scale.

---

# PART 3 — SHARED INTELLIGENCE

## What "shared intelligence" means in Atelier
The companion should grow smarter about the artist across all paintings over time — not just within one. This is implemented through cross-painting memory.

## What is implemented

### Cross-painting summary (artist_profiles.cross_painting_summary)
- Triggered: async (`setImmediate`) after every `evaluate_painting` call
- Flow:
  ```
  evaluate_painting completes
    └─ setImmediate → POST /api/evaluate { callType: 'update_artist_summary' }
         ├─ Reads: last 5 paintings' rolling_summaries + scores
         ├─ Claude synthesises 150-word cross-painting observation
         └─ Writes: artist_profiles.cross_painting_summary
                    evolution_metrics (avg_overall, growth_edge, growth_guidance)
  ```
- Injected into: every subsequent `evaluate_painting` 

### Evolution metrics (evolution_metrics table)
- Written by: update_artist_summary
- Fields: avg_overall, weakest_dimension, growth_edge, growth_guidance, calculated_date
- Injected into: evaluate_painting context, 
- Status: ⚠️ Table may not exist in DB — fetches silently return null

### Style protocols (artist_style_protocols table)
- Loaded on EVERY evaluate call (no callType gate — runs for all callTypes)
- Fields: style_name, colour_correction, complexity_correction, salience_correction, fluency_method
- Purpose: Overrides how Claude interprets scoring dimensions for this artist's style
- Status: ⚠️ Table may not exist in DB — fetches silently return null
- Written by: nothing in current code — manual entry only

## What is NOT implemented

| Intelligence Feature | Status | Session |
|--------------------|--------|---------|
| Art literature / philosophy library | ❌ No table, no UI, no context injection | I8 (new) |
| Masterpiece visual analysis stored in DB | ❌ No table, no AI call, no injection | F / I8 |
| Companion persona (named character) | ❌ Only in system prompt file, not DB-driven | I8 |
| Onboarding workflow to capture reading list | ❌ No screen exists | I8 |
| Cross-artist shared intelligence | ❌ No design, no table | Future |
| Semantic search over past conversations | ❌ No embeddings on conversations | RAG upgrade |
| Artist benchmarking (your scores vs cohort) | ❌ No design | Future |

## Object communication map

```
┌──────────────────────────────────────────────────────────────────┐
│  FRONTEND                                                         │
│                                                                   │
│  UploadScreen ──────────────────────────────────────────────────┐│
│  PaintingDetailScreen → PaintingJournalEntry                    ││
│  HomeScreen                                                     ││
│  ProfileScreen                                                  ││
└────────────────────────────────────────┬────────────────────────┘│
                                         │ POST /api/evaluate       │
                                         ▼                          │
┌──────────────────────────────────────────────────────────────────┤
│  SERVER.JS (Express :3001)                                        │
│                                                                   │
│  /api/evaluate ─── routes to ──► artmind_evaluate.js             │
│       │                                │                          │
│       │ after evaluate_painting:       │ loadStaticPrompt()       │
│       │ setImmediate (async)           │   └─ prompt_parameters   │
│       │   ├─ update_artist_summary     │       OR file            │
│       │   └─ getPaintingEmbedding      │                          │
│       │                               │ fetchDynamicContext()     │
│       ▼                               │   └─ 13 DB fetches        │
│  /api/wip-vision ─► /api/evaluate     │       (per callType)      │
│       └─► openai.images.generate()    │                          │
│                                       │ Claude API (Anthropic)   │
│  /api/sessions/media                  │   └─ streaming SSE       │
│       └─► OpenAI Whisper              │       OR batch JSON       │
│       └─► ffmpeg (frame extract)      │                          │
│       └─► /api/evaluate               │                          │
│             (analyse_session)         │                          │
└───────────────────────────────────────┴──────────────────────────┘
                    │                           │
                    ▼                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  SUPABASE                                                         │
│                                                                   │
│  paintings ◄──────── scores, embedding, rolling_summary          │
│       │                                                           │
│       ├─ painting_sessions ◄── versions, scores, transcripts     │
│       │       └─ session_frames ◄── frame URLs                   │
│       ├─ painting_images ◄── versioned photo uploads             │
│       ├─ companion_conversations ◄── all dialogue                │
│       └─ blog_posts ◄── AI-generated posts                       │
│                                                                   │
│  artist_profiles ◄── bio, photo, cross_painting_summary         │
│  evolution_metrics ◄── growth_edge, avg_overall (⚠️ unconfirmed) │
│  artist_style_protocols ◄── scoring corrections (⚠️ unconfirmed) │
│  studio_states ◄── mood logs (⚠️ unconfirmed)                    │
│  painting_subjects ◄── artist intentions (⚠️ unconfirmed)        │
│  inspirations ◄── influences (manual entry only)                 │
│  prompt_parameters ◄── system prompt components (⚠️ unconfirmed) │
│  media_config ◄── 29 pipeline config keys                        │
│                                                                   │
│  Storage bucket: "paintings"                                      │
│    paintings/{slug}/vN.jpg                                        │
│    paintings/{slug}/sessions/{id}/audio.webm                     │
│    paintings/{slug}/sessions/{id}/frame_N.jpg                    │
│    profiles/{userId}/photo.jpg                                    │
└──────────────────────────────────────────────────────────────────┘

Objects NOT currently speaking to each other:
  inspirations ──X──► painting_subjects  (no link between influence and intention)
  score_history ──X──► anything          (table unused, nothing writes to it)
  paintings.embedding ──X──► conversations (no semantic retrieval from past dialogue)
  studio_states ──X──► evolution_metrics  (mood not factored into growth tracking)
  artist_style_protocols ──X──► painting_subjects (style rules don't reference intentions)
```

---

        # PART 4 — RETRIEVAL PIPELINE

        ## Current approach: Structured SQL retrieval (NOT RAG)

        All context is assembled via direct SQL queries keyed on `user_id` and `painting_slug`. No semantic similarity. No vector search for context retrieval (only for similar paintings UI feature).

        ## fetchDynamicContext() — what each callType retrieves

        | callType | Fetches | DB queries |
        |----------|---------|-----------|
        | evaluate_painting | painting_history (companion_conversations last 5), allSessions (painting_sessions all), wipSessions (last 3), studio_state (studio_states), painting_subject, recent_paintings (paintings last 5), evolution_metrics, artist_cross_summary (artist_profiles), style_protocol (artist_style_protocols always) | 9 queries |
        | companion_dialogue | recent_dialogue (companion_conversations last 6), current_painting (painting_sessions latest), studio_state, painting_subject, style_protocol | 5 queries |
        | generate_blog | all_wip_sessions (painting_sessions all), painting_subject, linked_inspirations (inspirations by painting), studio_sessions (last 3), style_protocol | 5 queries |
        | morning_message | recent_paintings (last 5), open_wips (last 3), top_inspirations (top 3), evolution_metrics, artist_cross_summary, style_protocol | 6 queries |
        | analyse_session | rolling_summary (paintings), last_session_summary (painting_sessions), style_protocol | 3 queries |
        | session_dialogue | rolling_summary, session_transcript (from request body), style_protocol | 2 queries |
        | update_artist_summary | cross_painting_summaries (last 5 paintings with rolling_summary), style_protocol | 2 queries |
        | regenerate_bio | recent_paintings, top_inspirations, style_protocol | 3 queries |
        | collector_brief | rolling_summary, painting_history, painting_subject, top_inspirations, style_protocol | 5 queries |
        | wip_vision_prompt | (none — paintingImageUrl passed directly), style_protocol | 1 query |

        **Note:** `artist_style_protocols` is fetched on EVERY call regardless of callType — not gated by CALL_CONFIG.fetch. This means it runs even for `wip_vision_prompt` and `update_artist_summary` where style corrections are irrelevant.

## Context string structure (injected as dynamic system block)

Every call assembles a text block in this order (sections omitted if data is null):

```
── PAINTING HISTORY ─────────────────────── (evaluate_painting only)
Score progression: v1:72 → v2:78(+6) → v3:81(+3)
v1 | changed: [...80 chars] | note: [...80 chars]
Dimension shifts (v1→latest): emotion +8, fluency +2
Recent companion evaluations:
  [Previous — YYYY-MM-DD]: [first 250 chars]
  [Most recent — YYYY-MM-DD]: [first 250 chars]
Artist confirmed meaning: [painting_subjects.subject_note]

── CURRENT ARTIST STATE ─────────────────────────────────
Recent paintings: Title (score), Title (score)...
Open WIP paintings: Title, Title...
Current WIP: v3, overall: 81
Recent progression: v1:72 → v2:78 → v3:81
Last artist note: [120 chars]
Planned next: [100 chars]
Confirmed painting meaning: [subject_note]
Studio state: focused
State note: [80 chars]
Growth edge: [evolution_metrics.growth_edge]
Current guidance: [100 chars]

── CROSS-PAINTING PATTERNS ──────────────────────────────
[artist_profiles.cross_painting_summary — up to ~150 words]

── STYLE-SPECIFIC CORRECTIONS ───────────────────────────
Colour: [150 chars]
Complexity: [150 chars]

── RECENT DIALOGUE ──────────────────────────────────────
user: [150 chars]
companion: [150 chars]
... (last 6 messages)

── LINKED INSPIRATIONS ──────────────────────────────────
Title (Creator): [influence_note 80 chars]

── TOP INSPIRATIONS ─────────────────────────────────────
Title (Creator, intensity N)

── ROLLING STUDIO SUMMARY ───────────────────────────────
[paintings.rolling_summary — full text, no truncation]

── LAST SESSION SUMMARY ─────────────────────────────────
[painting_sessions.session_summary — full text]

── NEW SESSION TRANSCRIPT ───────────────────────────────
[transcript from Whisper — full text]
```

## Status: BASIC RETRIEVAL — IMPLEMENTED, ADVANCED — NOT STARTED

| Retrieval Feature | Status |
|-------------------|--------|
| Structured SQL per callType | ✅ Live |
| Score progression with deltas | ✅ Live |
| Last 2 companion evaluations (250 chars each) | ✅ Live |
| Rolling summary (cumulative narrative) | ✅ Live |
| Cross-painting summary (from artist_profiles) | ✅ Live (if table populated) |
| Studio state injection | ✅ Live (if table exists) |
| Style protocol corrections | ✅ Live (if table exists) |
| Semantic retrieval (RAG over conversations) | ❌ Not implemented |
| "You said this 3 paintings ago" references | ❌ Not possible without conversation embeddings |
| Art literature / philosophy injection | ❌ No table, no retrieval |
| Masterpiece analysis injection | ❌ No table, no retrieval |
| Session dialogue references past sessions semantically | ❌ Only rolling_summary (structured) |

## Open items — retrieval
1. `painting_sessions.what_changed` and `what_to_do_next` columns are referenced in context builder but no current UI form writes to them — they will always be null
2. Rolling summary has no length cap in context injection — a long-running painting could inject thousands of tokens
3. `linked_inspirations` requires `inspirations.linked_paintings` to be an array containing the painting's slug — this field is never populated by any current UI
4. Style protocol is fetched even when it won't be injected (wip_vision_prompt, update_artist_summary) — wasted query

---

# PART 5 — PROMPT CONTEXT

## System prompt (static layer)

**Primary source:** `prompt_parameters` table (columns: component, content, component_order, active, component_type)
**Fallback:** `private/artmind_system_prompt.txt`
**Loaded:** On every API call (with Anthropic prompt caching — ephemeral cache_control)
**Content:** Companion persona, evaluation framework, scoring rubric, secret recipe

Current state: prompt_parameters table may not exist in DB → falls back to file on every call. This means the system prompt cannot be edited without touching the file and restarting the server.

## Dynamic context (per-call layer)

Injected as a second system block (NOT cached — changes every call).
Built by `buildDynamicContextString()` — see Part 4 for full structure.

## Token budget analysis (evaluate_painting)

| Component | Approx tokens |
|-----------|--------------|
| System prompt (static, cached) | ~800–1,200 |
| Dynamic context | ~300–600 |
| Image(s) — 1024px JPEG | ~800–1,600 per image |
| User message | ~20–50 |
| Max output | 1,500 |
| **Total per 1-image evaluation** | **~3,400–4,000** |
| **Total per 3-image evaluation** | **~5,800–7,000** |

## What is implemented
- ✅ Static prompt with Anthropic prompt caching (ephemeral) — saves ~800 tokens on repeated calls
- ✅ Dynamic context string per callType — only fetches what each call needs
- ✅ Score progression with deltas (v1:72 → v2:78(+6))
- ✅ Cross-painting summary injected into evaluate + morning
- ✅ Style protocol corrections (if table exists)
- ✅ Linked inspirations in blog generation
- ✅ Image resizing before Claude API (1024px — saves 60–70% image tokens)

## What is NOT implemented
- ❌ Art literature / reading list in context — no table, no injection
- ❌ Masterpiece analysis in context — no table, no injection
- ❌ Companion persona as DB-editable entity — locked in file
- ❌ Semantic context retrieval — cannot retrieve "most relevant past conversation"
- ❌ painting_sessions.what_changed / what_to_do_next — fields exist in context builder but nothing populates them
- ❌ painting_subjects — UI to set artist's confirmed intention does not exist
- ❌ Prompt parameter hot-editing — table may not exist, falls back to file

## Open items — prompt context
1. System prompt cannot be updated without file edit + server restart (prompt_parameters table likely doesn't exist)
2. `what_changed` and `what_to_do_next` fields in painting_sessions are serialised into context but UI has no input for them — always null
3. No token counting or context overflow protection — if rolling_summary grows very long, context could silently degrade
4. Linked inspirations require inspirations.linked_paintings array to be populated — no UI to do this
5. `painting_subjects` table (artist's confirmed intention) has no UI entry point

---

# PART 6 — DECISION QUESTIONS FOR NEXT STEPS

## On the database

**Q1.** ✅ RESOLVED 2026-04-07 — All 5 tables created via migration_missing_tables.sql. Intelligence layer now fully active.

**Q2.** `paintings` has 10+ columns that are written by Claude (viewer_experience, practice_connection, appraisal_develop, market_positioning, bot_* scores) but never displayed in any UI. Do you want to surface any of these, or are they legacy?

**Q3.** `artist_profiles` has both `practice_description` (user-editable) and `practice_statement` (AI-regenerated). Should these be unified into one field with an edit/regenerate toggle?

**Q4.** `city` and `country` columns exist separately from `location` (a single text field in the edit form). Should the form be updated to use them, or should city/country be removed?

## On vector embeddings

**Q5.** Should embeddings be generated for companion_conversations? This would enable true semantic retrieval: "find past evaluations where I discussed light." Adds ~$0.02/1M tokens cost but enables RAG.

**Q6.** Should masterpiece paintings (type='masterpiece') be included in the embedding space for similar_paintings? Currently excluded by the filter.

**Q7.** Should an ivfflat index be added to paintings.embedding now, or wait until >100 paintings exist?

## On companion intelligence (I8 — new)

**Q8.** Art library — what format? A simple `art_library` table with (title, author, type, notes, userId) that the artist populates? Or should this be captured during onboarding only?

**Q9.** Masterpiece visual analysis — should Claude analyse the masterpiece images once and cache in DB (per painting, shared across users), or re-analyse per artist with their personal context injected?

**Q10.** The companion persona — do you want to give it a name and a distinct voice (e.g., a named studio assistant character)? This would be written into the system prompt and potentially configurable.

**Q11.** What's the priority order for I8 features?
- (a) Art library table + onboarding screen + context injection
- (b) Masterpiece analysis (analyse_masterpiece callType + MasterpieceDetail screen)
- (c) Companion persona DB-editable
- (d) All together in one session

## On shared intelligence

**Q12.** Should the companion reference other artists' anonymised patterns? (e.g., "80% of artists at your score range struggle with backgrounds") — this requires a shared intelligence layer across users. Worth designing?

**Q13.** Cross-painting summary currently synthesises rolling_summaries. Should it also synthesise studio_states (mood patterns over time)?

## On retrieval

**Q14.** `what_changed` and `what_to_do_next` columns in painting_sessions are in the context builder but nothing populates them. Add UI inputs to the journal note form, or remove from context builder?

**Q15.** Rolling summary has no length cap. Should it be capped (e.g., 400 words) and rewritten on each session, or kept as a growing document?

**Q16.** Linked inspirations (inspirations.linked_paintings[]) cannot be set from any current UI. Add a "link to painting" button in the influences section, or keep as manual Supabase entry?

## On deployment readiness

**Q17.** Before deploying, should the unconfirmed tables be verified and created if missing? This is a ~30-minute Supabase dashboard task.

**Q18.** ✅ RESOLVED 2026-04-07 — migration_relink_owner.sql has been run. All existing data is linked to the real Auth UUID.

---

# APPENDIX — Session roadmap with intelligence context

| Session | Features | Intelligence impact |
|---------|---------|-------------------|
| C | Field Notes (travel → palette + prompts), Exhibition proposal | New travel_inspirations table, new exhibition_proposals table |
| D | Studio reel (ffmpeg timelapse) | New reel_url on painting_sessions |
| E | Archive restructure, Scoring anchors (P2) | Refines painting type structure, scoring rubric update |
| F | Influence deep dive (MasterpieceDetail) | analyse_masterpiece callType, cached analysis in DB |
| I8 | Companion persona + Art library + Masterpiece knowledge base | New art_library table, onboarding screen, context injection |
| G | Password gate, Legal, Mobile audit | No intelligence impact |
| H | Deploy (Vercel + Railway) | No intelligence impact |
