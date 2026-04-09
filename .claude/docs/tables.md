# Atelier — Supabase Table Reference
## All tables: purpose, columns, usage status

**Confirmed in DB:** paintings, painting_sessions, blog_posts, painting_images,
artist_profiles, companion_conversations, inspirations, session_frames, media_config
**⚠️ Not confirmed in DB** (referenced in code, skipped from auth migration Apr 5):
studio_states, evolution_metrics, artist_style_protocols, painting_subjects, prompt_parameters, score_history

---

## 1. paintings
**Purpose:** Master record for every painting — artist works and reference masterpieces.
**PK:** `slug` (text, e.g. `satish_memory_lane`)
**RLS:** `user_id = auth.uid()`

| Column | Type | Purpose | Used |
|--------|------|---------|------|
| slug | TEXT PK | Unique identifier | ✅ everywhere |
| title | TEXT | Display name | ✅ |
| artist | TEXT | Artist name | ✅ |
| year | TEXT | Year created | ✅ |
| type | TEXT | `artist_work` or `masterpiece` or `reference` | ✅ filtering |
| status | TEXT | `wip` or `finished` | ✅ HomeScreen, PaintingDetailScreen |
| visibility | TEXT | `private` / `public` | ⚠️ written, not read in UI |
| image_url | TEXT | Primary display image (Supabase Storage public URL) | ✅ |
| thumbnail_b64 | TEXT | Legacy base64 thumbnail | ⚠️ set to null on image upload |
| score_overall | SMALLINT | 0–100 overall AI score | ✅ |
| score_salience | SMALLINT | Salience dimension | ✅ |
| score_gaze | SMALLINT | Gaze dimension | ✅ |
| score_fluency | SMALLINT | Fluency dimension | ✅ |
| score_emotion | SMALLINT | Emotion dimension | ✅ |
| score_complexity | SMALLINT | Complexity dimension | ✅ |
| score_mirror | SMALLINT | Mirror dimension | ✅ |
| score_colour | SMALLINT | Colour dimension | ✅ |
| score_narrative | SMALLINT | Narrative dimension | ✅ |
| bot_formalist…bot_colour_theorist | SMALLINT | Per-bot sub-scores | ⚠️ in DB, not read in UI |
| viewer_experience | TEXT | AI-written viewer description | ⚠️ in DB, not displayed |
| practice_connection | TEXT | AI-written practice connection | ⚠️ in DB, not displayed |
| appraisal_strengths | TEXT | AI strengths text | ⚠️ used in embedding generation |
| appraisal_develop | TEXT | AI development areas | ⚠️ in DB, not displayed |
| market_positioning | TEXT | Market positioning text | ⚠️ in DB, not displayed |
| tags | TEXT[] | Freeform tags | ⚠️ fetched, not displayed |
| evaluated_at | TIMESTAMPTZ | Last evaluation timestamp | ⚠️ in DB, not displayed |
| first_fixation | TEXT | First fixation point note | ⚠️ in DB, not displayed |
| evaluated_by | TEXT | Who evaluated | ⚠️ in DB, not displayed |
| rolling_summary | TEXT | Cumulative AI narrative (appended each session) | ✅ injected into every evaluate context |
| embedding | VECTOR(1536) | OpenAI text embedding for similarity search | ✅ similar_paintings rpc |
| user_id | UUID | Auth owner | ✅ RLS |

**Written by:** evaluate_painting (scores), upload-painting-image, create-painting, set-main-image, set-painting-status, update_artist_summary (rolling_summary)

---

## 2. painting_sessions
**Purpose:** One row per evaluation version per painting. Tracks score progression, artist notes, and studio session recordings.
**PK:** `id` (UUID)
**RLS:** `user_id = auth.uid()`

| Column | Type | Purpose | Used |
|--------|------|---------|------|
| id | UUID PK | | ✅ |
| painting_slug | TEXT FK → paintings.slug | | ✅ |
| version | INTEGER | Version number (v1, v2…) | ✅ journal ordering |
| artist_note | TEXT | Artist's written/spoken note for this version | ✅ journal display |
| session_date | DATE | Date of session | ✅ |
| score_overall | SMALLINT | Score at this version | ✅ sparkline |
| score_salience…score_narrative | SMALLINT ×8 | Dimension scores at this version | ✅ dimension bars |
| session_type | TEXT | `text` / `audio` / `video` / `audio_video` | ✅ |
| transcript | TEXT | Whisper transcription of audio | ✅ session_dialogue context |
| duration_secs | INTEGER | Recording duration | ✅ PastSessionCard |
| frame_count | INTEGER | Number of extracted frames | ✅ |
| session_summary | TEXT | Claude's 150-word session summary | ✅ PastSessionCard |
| recorded_at | TIMESTAMPTZ | When recording happened | ✅ |
| user_id | UUID | Auth owner | ✅ RLS |

**Written by:** evaluate_painting (new version row + scores), addSessionNote (text version), /api/sessions/media (audio/video session), analyse_session (session_summary, transcript)
**Read by:** evaluate context, blog generation, session_dialogue, ScoreSparkline, PaintingJournalEntry, PastSessionCard

---

## 3. painting_images
**Purpose:** Versioned photo uploads per painting. Multiple images per version label.
**PK:** `id` (UUID)
**RLS:** `user_id = auth.uid()`

| Column | Type | Purpose | Used |
|--------|------|---------|------|
| id | UUID PK | | |
| painting_slug | TEXT FK → paintings.slug | | ✅ |
| image_url | TEXT | Supabase Storage public URL | ✅ WipImageManager, journal |
| version_label | TEXT | e.g. `v1`, `v2`, `untitled` | ✅ filtering per version |
| uploaded_at | TIMESTAMPTZ | | ✅ ordering |
| user_id | UUID | Auth owner | ✅ RLS |

**Written by:** upload-painting-image, add-painting-image, create-painting
**Read by:** PaintingDetailScreen (WipImageManager), PaintingJournalEntry (image strip per version)

---

## 4. companion_conversations
**Purpose:** Full history of all AI dialogue — evaluations, companion chat, session dialogue. One row per message (user and companion paired).
**PK:** `id` (UUID)
**RLS:** `user_id = auth.uid()`

| Column | Type | Purpose | Used |
|--------|------|---------|------|
| id | UUID PK | | ✅ update-conversation |
| painting_slug | TEXT FK → paintings.slug | | ✅ all queries |
| role | TEXT | `user` or `companion` | ✅ |
| message | TEXT | Full message text | ✅ |
| session_date | DATE | | ✅ |
| language | TEXT | `en` | ⚠️ written, not used in UI |
| created_at | TIMESTAMPTZ | | ✅ ordering |
| user_id | UUID | Auth owner | ✅ RLS |

**Written by:** evaluate_painting, companion_dialogue, session_dialogue
**Read by:** evaluate context (last 5–6), ConversationThread, PaintingJournalEntry (journal matching), update-conversation route

---

## 5. blog_posts
**Purpose:** AI-generated process journal entries per painting.
**PK:** `id` (UUID)
**RLS:** `user_id = auth.uid()`

| Column | Type | Purpose | Used |
|--------|------|---------|------|
| id | UUID PK | | ✅ |
| painting_slug | TEXT FK → paintings.slug | | ✅ |
| title | TEXT | Extracted from first # heading | ✅ |
| full_text | TEXT | Full markdown content | ✅ |
| word_count | INTEGER | Auto-calculated | ✅ |
| status | TEXT | `draft` or `published` | ✅ filtering |
| generated_by | TEXT | `artmind` | ⚠️ written, not displayed |
| created_at | TIMESTAMPTZ | | ✅ ordering |
| updated_at | TIMESTAMPTZ | | ✅ |
| user_id | UUID | Auth owner | ✅ RLS |

**Written by:** generate_blog (server.js intercept), regenerate-blog, update-blog-post
**Read by:** BlogScreen, PaintingDetailScreen (related writing section), HomeBlogRow

---

## 6. artist_profiles
**Purpose:** Single row per artist. Bio, photo, practice statement, cross-painting AI summary.
**PK:** `id` (UUID), unique on `user_id`
**RLS:** `user_id = auth.uid()`

| Column | Type | Purpose | Used |
|--------|------|---------|------|
| id | UUID PK | | |
| user_id | UUID | Auth owner (unique) | ✅ all queries |
| display_name | TEXT | Artist's display name | ✅ ProfileScreen |
| location | TEXT | City/country string | ✅ ProfileScreen |
| city | TEXT | Separate city field | ⚠️ in schema, not in UI form |
| country | TEXT | Separate country field | ⚠️ in schema, not in UI form |
| practice_description | TEXT | Artist's practice statement | ✅ ProfileScreen |
| practice_statement | TEXT | AI-regenerated bio | ⚠️ in schema, used by regenerate_bio |
| website | TEXT | Website URL | ✅ ProfileScreen |
| image_url | TEXT | Profile photo URL | ✅ ProfileScreen |
| cross_painting_summary | TEXT | AI synthesis across all paintings (150 words) | ✅ injected into every evaluate context |

**Written by:** update-artist-profile, upload-profile-photo, update_artist_summary (cross_painting_summary), getArtistProfile (auto-creates row for new users)
**Read by:** evaluate context (cross_painting_summary), ProfileScreen, regenerate_bio context

---

## 7. inspirations
**Purpose:** Artist's influences — painters, books, artworks, ideas. Weighted by intensity.
**PK:** `id` (UUID)
**RLS:** `user_id = auth.uid()`

| Column | Type | Purpose | Used |
|--------|------|---------|------|
| id | UUID PK | | |
| user_id | UUID | Auth owner | ✅ RLS |
| title | TEXT | Name of work or artist | ✅ |
| creator | TEXT | Author/artist name | ✅ |
| type | TEXT | `painter` / `book` / `concept` / etc. | ✅ filtering |
| intensity | INTEGER | 1–10 influence weight | ✅ ordering |
| influence_note | TEXT | Personal note on the influence | ✅ context injection |
| active | BOOLEAN | Shown in active influences | ✅ |
| painting_slug | TEXT | Linked painting (optional) | ✅ blog context |

**Written by:** — (manual entry via Supabase dashboard or future UI)
**Read by:** evaluate context (top_inspirations, linked_inspirations), morning message, blog generation, collector_brief, HomeScreen (InfluencesSection)

---

## 8. session_frames
**Purpose:** Individual video frames extracted by ffmpeg from studio session recordings.
**PK:** `id` (UUID)
**RLS:** open access policy (no user_id filter)

| Column | Type | Purpose | Used |
|--------|------|---------|------|
| id | UUID PK | | |
| session_id | UUID FK → painting_sessions.id (CASCADE DELETE) | | ✅ |
| painting_slug | TEXT | Denormalised for direct queries | ✅ |
| frame_index | INTEGER | 0-based frame order | ✅ ordering |
| frame_url | TEXT | Supabase Storage public URL | ✅ sent to Claude in analyse_session |
| captured_at_sec | FLOAT | Timestamp in video | ✅ PastSessionCard display |
| created_at | TIMESTAMPTZ | | |
| user_id | UUID | Auth owner | ✅ RLS |

**Written by:** /api/sessions/media (ffmpeg frame extraction)
**Read by:** analyse_session (frame URLs sent to Claude), getMediaSessions (PastSessionCard)

---

## 9. media_config
**Purpose:** DB-driven configuration for the audio/video pipeline. 29 keys. Loaded at server startup, refreshed every 5 min. No per-user scope.
**PK:** `id` (UUID), unique on `config_key`

| Key category | Keys | Purpose |
|-------------|------|---------|
| recording | max_video/audio_duration_secs, recording_preview_enabled | Hard stops + UX |
| processing | frames_short/medium/long_video, frames_hard_cap, frame_max_width_px, frame_quality_percent, upload_image/thumb_max_px, api_image_max_px/quality | Sharp resize params, frame extraction |
| ai | analyse_session/session_dialogue/evaluate_painting/companion_dialogue/generate_blog/morning_message_max_tokens, analyse_session_frames, rolling_summary_max_words, context_past_sessions, context_recent_dialogue, context_recent_paintings | Token limits + context window sizes |
| storage | storage_bucket_paintings/sessions, storage_path_sessions | Supabase Storage paths |
| processing | whisper_model, whisper_language | Transcription config |

**Written by:** — (seeded in migration, edited manually in Supabase dashboard)
**Read by:** server.js startup `loadMediaConfig()`, used in /api/sessions/media (frameCount, resize params)

---

## ⚠️ 10. studio_states
**Purpose:** Daily mood/state logs — what the artist worked on, how they felt.
**Note:** Not confirmed in Supabase DB (skipped from auth migration Apr 5). Code exists for it.

| Column | Type | Purpose | Used |
|--------|------|---------|------|
| id | UUID PK | | |
| user_id | UUID | Auth owner | ✅ RLS |
| painting_slug | TEXT | Associated painting (optional) | ✅ |
| state | TEXT | `focused` / `flowing` / `struggling` | ✅ |
| note | TEXT | Free-text note | ✅ |
| session_date | DATE | | ✅ |
| created_at | TIMESTAMPTZ | | ✅ ordering |

**Written by:** saveStudioLog (StudioLogEntry), setStudioState
**Read by:** evaluate context (studio_state per painting), HomeScreen (getLatestStudioLog)

---

## ⚠️ 11. evolution_metrics
**Purpose:** Aggregated growth metrics per artist — written async after every evaluation.
**Note:** Not confirmed in Supabase DB (skipped from auth migration Apr 5).

| Column | Type | Purpose | Used |
|--------|------|---------|------|
| id | UUID PK | | |
| user_id | UUID | Auth owner | ✅ |
| avg_overall | FLOAT | Average score across all paintings | ✅ context injection |
| growth_edge | TEXT | Current growth area (AI-identified) | ✅ context injection |
| growth_guidance | TEXT | Specific guidance for growth edge | ✅ context injection |
| updated_at | TIMESTAMPTZ | | |

**Written by:** update_artist_summary (async after evaluate_painting)
**Read by:** evaluate context (growth_edge, guidance), morning_message context

---

## ⚠️ 12. artist_style_protocols
**Purpose:** Per-artist scoring corrections — overrides how Claude interprets certain dimensions for this artist's style.
**Note:** Not confirmed in Supabase DB (skipped from auth migration Apr 5).

| Column | Type | Purpose | Used |
|--------|------|---------|------|
| id | UUID PK | | |
| user_id | UUID | Auth owner | ✅ |
| colour_correction | TEXT | e.g. "This artist intentionally uses muted palette" | ✅ context injection |
| complexity_correction | TEXT | Style-specific complexity note | ✅ context injection |
| (other dimensions) | TEXT | Per-dimension style notes | ✅ |

**Written by:** — (manual entry, future UI planned)
**Read by:** evaluate context (style-specific corrections block)

---

## ⚠️ 13. painting_subjects
**Purpose:** Artist's confirmed meaning/intention for a painting — separate from AI interpretation.
**Note:** Not confirmed in Supabase DB (skipped from auth migration Apr 5).

| Column | Type | Purpose | Used |
|--------|------|---------|------|
| id | UUID PK | | |
| painting_slug | TEXT FK → paintings | | ✅ |
| subject_note | TEXT | "What this painting is really about" | ✅ context injection |
| confirmed | BOOLEAN | Artist has confirmed this | ✅ |
| user_id | UUID | | ⚠️ not in auth migration |

**Written by:** — (manual entry or future UI)
**Read by:** evaluate context, blog context, collector_brief context

---

## ⚠️ 14. prompt_parameters
**Purpose:** DB-driven system prompt components. Allows editing the AI persona without redeployment.
**Note:** Not confirmed in Supabase DB (skipped from auth migration Apr 5). Falls back to `private/artmind_system_prompt.txt`.

| Column | Type | Purpose | Used |
|--------|------|---------|------|
| id | UUID PK | | |
| key | TEXT | Parameter name | ✅ |
| value | TEXT | Parameter content | ✅ |
| active | BOOLEAN | Whether to include | ✅ |

**Written by:** — (manual entry in Supabase dashboard)
**Read by:** loadStaticPrompt() on every API call — DB version takes precedence over file

---

## ⚠️ 15. score_history
**Purpose:** Historical score tracking per painting over time — for progress charts.
**Note:** Not confirmed in Supabase DB. Not actively written by any current code.
**Status: UNUSED — planned for Session E (P2 — Scoring anchors)**

| Column | Type | Purpose | Used |
|--------|------|---------|------|
| painting_slug | TEXT | | |
| score | INTEGER | Overall score at point in time | |
| recorded_at | TIMESTAMPTZ | | |
| session_id | UUID | | |

**Written by:** — (nothing writes to this yet)
**Read by:** — (nothing reads from this yet)

---

## Summary by Status

| Status | Tables |
|--------|--------|
| ✅ Active — confirmed in DB, actively used | paintings, painting_sessions, painting_images, companion_conversations, blog_posts, artist_profiles, inspirations, session_frames, media_config |
| ⚠️ Code exists, DB not confirmed | studio_states, evolution_metrics, artist_style_protocols, painting_subjects, prompt_parameters |
| ❌ Unused — exists in plan only | score_history |
| 🔮 Planned (future sessions) | travel_inspirations (S1), generated_visions (I4 — no table yet), exhibition_proposals (I6), collector_briefs (I3 — no table yet) |

## Columns to investigate / clean up

| Table | Column | Status |
|-------|--------|--------|
| paintings | bot_formalist…bot_colour_theorist | In DB, never shown in UI |
| paintings | viewer_experience, practice_connection, appraisal_develop, market_positioning | Written by evaluate, never displayed |
| paintings | visibility, evaluated_by, first_fixation | Written, never read in UI |
| artist_profiles | city, country | In schema, not in edit form |
| artist_profiles | practice_statement | In schema, distinct from practice_description — usage unclear |
| companion_conversations | language | Always `en`, never filtered on |
| blog_posts | generated_by | Always `artmind`, never filtered on |
