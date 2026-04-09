# Architecture reference

## Server routes (port 3001)
- POST /api/evaluate — streaming: evaluate_painting, companion_dialogue, session_dialogue; batch: analyse_session, generate_blog, morning_message
- POST /api/sessions/media — audio/video pipeline (multer → Whisper → ffmpeg → Sharp → Supabase Storage → DB)
- POST /api/regenerate-blog — streaming blog rewrite
- POST /api/upload-painting-image — resize + upload + painting_images row
- POST /api/set-main-image — update paintings.image_url
- POST /api/add-painting-image — versioned image upload
- POST /api/upload-photo — resize + upload, updates paintings.image_url
- POST /api/upload-profile-photo — 400px square, profiles/{userId}/photo.jpg
- POST /api/update-artist-profile — update artist_profiles table
- POST /api/create-painting — insert painting row + optional image
- POST /api/update-conversation — update companion_conversations message by id
- POST /api/set-painting-status — toggle wip/finished
- POST /api/update-blog-post — update blog_posts fields

## Supabase tables
paintings: title, artist, year, type, status, visibility, image_url, thumbnail_b64,
  score_overall, score_salience, score_gaze, score_fluency, score_emotion, score_complexity, score_mirror, score_colour, score_narrative,
  bot_formalist…bot_colour_theorist (smallint 0–100),
  viewer_experience, practice_connection, appraisal_strengths, appraisal_develop, market_positioning,
  tags (text[]), evaluated_at, first_fixation, evaluated_by, rolling_summary
  NOTE: NO user_id on paintings or painting_sessions

artist_profiles: display_name, location, practice_description, website, image_url

## Audio/Video pipeline (Phase 11)
- bin/ffmpeg, bin/ffprobe — static arm64 binaries, gitignored
- OPENAI_API_KEY in .env.local — Whisper only
- media_config table — 29 DB-driven config keys, refreshed every 5 min
- Call types: analyse_session (600 tokens, async) · session_dialogue (1000 tokens, streaming)
- Tables: session_frames; painting_sessions +6 cols; paintings +rolling_summary
- iOS: video hidden (MediaRecorder video/webm unsupported)
- Migration: scripts/migration_audio_video.sql

## Streaming SSE pattern
Server: `res.write('data: ' + JSON.stringify({ delta }) + '\n\n')` → `{ done: true }`
Client: `res.body.getReader()` → decode → split `\n\n` → parse JSON → append delta

## Archive workflow
Source: painting-images/atelier_archive_seed_four_paintings_v2.xlsx (Sheet: Archive Import, headers row 5)
Script: `node scripts/archive-workflow.js` (--dry-run / --force slug)
Docs: docs/archive-creation-workflow.md
Rule: Never overwrite filled cells. proposed_* columns for AI suggestions.
