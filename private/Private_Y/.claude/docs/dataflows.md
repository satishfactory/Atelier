# Atelier — Use Case Dataflow Reference
## Every flow: frontend form → API call → tables touched

---

## 1. Morning Message

**When:** HomeScreen mounts, once per calendar day (localStorage date cache)
**Frontend:** `HomeScreen.jsx` — auto-triggered on load, no form. Displayed in morning card with `SpeakButton`.

```
HomeScreen mounts
  └─ localStorage check: last_morning_date === today?
       ├─ YES → render cached JSON (no API call)
       └─ NO  → POST /api/evaluate { callType: 'morning_message', userId }
                   └─ artmind_evaluate.js
                        ├─ fetchDynamicContext: recent_paintings, open_wips,
                        │   top_inspirations, evolution_metrics, artist_cross_summary
                        ├─ Tables READ:
                        │   paintings (status, score_overall, title)
                        │   evolution_metrics (avg_overall, growth_edge, growth_guidance)
                        │   artist_profiles (cross_painting_summary)
                        │   inspirations (title, creator, intensity)
                        ├─ Claude API → JSON { briefing, challenge }
                        └─ Returns JSON (NOT saved to DB)
                             └─ HomeScreen saves to localStorage + renders
```

---

## 2. Evaluate Painting (streaming)

**When:** UploadScreen — "Evaluate" button clicked after painting selected and photo attached
**Frontend:** `UploadScreen.jsx` — painting dropdown, multi-photo file input (multiple), evaluate button. Streams response via SSE into `<ReactMarkdown>`.

```
User selects painting + attaches 1–n photos → clicks Evaluate
  └─ readFiles(files) → base64 array
  └─ POST /api/evaluate {
       callType: 'evaluate_painting',
       paintingSlug, userId,
       paintingImage: images[0],   ← first image (compat)
       paintingImages: images[],   ← all images
       userMessage
     }
       └─ artmind_evaluate.js
            ├─ fetchDynamicContext: painting_history, wip_sessions, studio_state,
            │   painting_subject, recent_paintings, evolution_metrics, artist_cross_summary
            ├─ Tables READ:
            │   companion_conversations (last 5 per painting)
            │   painting_sessions (all versions — scores, notes, summaries)
            │   studio_states (latest state + note)
            │   painting_subjects (subject_note)
            │   paintings (recent 5 — title, score, status)
            │   evolution_metrics (growth_edge, guidance)
            │   artist_profiles (cross_painting_summary)
            │   artist_style_protocols (colour/complexity corrections)
            ├─ sharp: resize each image to ≤1200px
            ├─ Claude API (streaming SSE) → evaluation text
            ├─ Tables WRITTEN:
            │   companion_conversations (user row + companion row)
            │   paintings (score_overall + 8 dimensions via streaming parse)
            │   painting_sessions (new version row with scores)
            └─ setImmediate (async, non-blocking):
                 ├─ POST /api/evaluate { callType: 'update_artist_summary' }
                 │    ├─ Tables READ: paintings.rolling_summary (last 5)
                 │    ├─ Claude API → 150-word cross-painting synthesis
                 │    └─ Tables WRITTEN:
                 │         artist_profiles (cross_painting_summary)
                 │         evolution_metrics (avg_overall, growth_edge, guidance)
                 └─ getPaintingEmbedding(slug)
                      ├─ Tables READ: paintings (embedding, title, summaries)
                      ├─ OpenAI text-embedding-3-small (if no embedding)
                      └─ Tables WRITTEN: paintings (embedding)
```

---

## 3. Free Evaluation (no painting record)

**When:** UploadScreen — "Free Evaluation" tab, photo attached
**Frontend:** `UploadScreen.jsx` — free photo file input, evaluate button. No painting selector.

```
User attaches photo → clicks Free Evaluate
  └─ POST /api/evaluate {
       callType: 'evaluate_painting',
       paintingSlug: undefined,
       userId,
       paintingImage: freeImg[0]
     }
       └─ Same flow as #2 but:
            - No context fetched (no slug)
            - No DB writes (no slug to write to)
            - Streams response only
```

---

## 4. Companion Dialogue

**When:** PaintingDetailScreen — conversation thread, user types message and sends
**Frontend:** `PaintingDetailScreen.jsx` → `ConversationThread.jsx` — text input + send button.

```
User types message → sends
  └─ POST /api/evaluate {
       callType: 'companion_dialogue',
       paintingSlug, userId, userMessage
     }
       └─ artmind_evaluate.js
            ├─ fetchDynamicContext: recent_dialogue, current_painting,
            │   studio_state, painting_subject
            ├─ Tables READ:
            │   companion_conversations (last 6 messages)
            │   paintings (current version, score, notes)
            │   studio_states (latest)
            │   painting_subjects (subject_note)
            ├─ Claude API (streaming SSE)
            └─ Tables WRITTEN:
                 companion_conversations (user row + companion row)
```

---

## 5. Create New Painting

**When:** UploadScreen — "New Painting" form submitted
**Frontend:** `UploadScreen.jsx` — title input, slug input, optional photo.

```
User fills title + slug → submits
  └─ POST /api/create-painting { title, slug, imageBase64?, userId }
       ├─ Tables WRITTEN: paintings (slug, title, type='artist_work', status='wip', user_id)
       └─ If imageBase64:
            ├─ sharp: resize to 1200px
            ├─ Supabase Storage UPLOAD: paintings/{slug}/v1.jpg
            ├─ Tables WRITTEN: paintings (image_url)
            └─ Tables WRITTEN: painting_images (painting_slug, image_url, version_label='v1')
```

---

## 6. Upload / Add Versioned Photo

**When:** PaintingDetailScreen — WipImageManager, add photo button
**Frontend:** `WipImageManager.jsx` — file input per version label.

```
User selects photo → uploads
  └─ POST /api/upload-painting-image { slug, imageBase64, versionLabel }
       ├─ Tables READ: painting_images (count existing → determine vN)
       ├─ sharp: resize 1200px (full) + 300px (thumb)
       ├─ Supabase Storage UPLOAD:
       │   paintings/{slug}/vN.jpg
       │   paintings/{slug}/vN_thumb.jpg
       └─ Tables WRITTEN: painting_images (painting_slug, image_url, version_label)

Set as main image:
  └─ POST /api/set-main-image { slug, imageUrl }
       └─ Tables WRITTEN: paintings (image_url)
```

---

## 7. Artist Journal Note

**When:** PaintingDetailScreen → PaintingJournalEntry — note textarea + save
**Frontend:** `PaintingJournalEntry.jsx` — textarea (voice-enabled via MicButton), photo attach, save button.

```
User writes/speaks note → saves
  └─ addSessionNote(paintingSlug, noteText, userId)   [supabase.js direct]
       └─ Tables READ: painting_sessions (latest version)
       └─ Tables WRITTEN: painting_sessions (new version row: artist_note, session_date, user_id)
```

---

## 8. Studio Session Recording (Audio/Video)

**When:** PaintingDetailScreen (WIP only) → SessionRecorder — record button
**Frontend:** `SessionRecorder.jsx` — record/stop button, live timer. Uploads on stop.

```
User records → stops
  └─ MediaRecorder API → webm blob
  └─ POST /api/sessions/media (multipart: file + paintingSlug + userId)
       ├─ multer: temp file
       ├─ ffprobe: get duration
       ├─ ffmpeg: extract N frames as JPEG (frameCount based on duration + media_config)
       ├─ Supabase Storage UPLOAD:
       │   paintings/{slug}/sessions/{sessionId}/audio.webm
       │   paintings/{slug}/sessions/{sessionId}/frame_{i}.jpg
       ├─ Tables WRITTEN: painting_sessions (session_type='audio', media_url, user_id)
       ├─ Tables WRITTEN: session_frames (session_id, frame_url, frame_index)
       ├─ OpenAI Whisper: transcribe audio → transcript text
       ├─ Tables WRITTEN: painting_sessions (transcript)
       └─ POST /api/evaluate { callType: 'analyse_session', sessionId, transcript, frameUrls }
            ├─ Tables READ: paintings (rolling_summary), painting_sessions (last summary)
            ├─ Claude API (with frame images as URLs) → session summary text
            └─ Tables WRITTEN:
                 painting_sessions (session_summary)
                 paintings (rolling_summary — appended)
```

---

## 9. Session Dialogue (during/after recording)

**When:** PastSessionCard — text input while reviewing a past session
**Frontend:** `PastSessionCard.jsx` — text input, send button.

```
User asks question about session
  └─ POST /api/evaluate {
       callType: 'session_dialogue',
       sessionId, userId, userMessage
     }
       └─ artmind_evaluate.js
            ├─ fetchDynamicContext: rolling_summary, session_transcript
            ├─ Tables READ:
            │   paintings (rolling_summary)
            │   painting_sessions (transcript for sessionId)
            ├─ Claude API (streaming SSE)
            └─ Tables WRITTEN: companion_conversations (user + companion rows)
```

---

## 10. Generate Blog Post

**When:** BlogScreen — "Generate" button for a finished painting
**Frontend:** `BlogScreen.jsx` — painting selector dropdown, generate button.

```
User selects painting → clicks Generate
  └─ POST /api/evaluate {
       callType: 'generate_blog',
       paintingSlug, userId, userMessage
     }
       └─ artmind_evaluate.js
            ├─ fetchDynamicContext: all_wip_sessions, painting_subject,
            │   linked_inspirations, studio_sessions
            ├─ Tables READ:
            │   painting_sessions (all — scores, notes, summaries, transcripts)
            │   painting_subjects (subject_note)
            │   inspirations (linked to painting)
            │   studio_states (last 3)
            ├─ Claude API → markdown blog text
            └─ server.js intercepts res.json:
                 Tables WRITTEN: blog_posts (painting_slug, title, full_text,
                                             word_count, status='draft', user_id)
```

---

## 11. Regenerate Blog (streaming edit)

**When:** BlogScreen or PaintingDetailScreen — artist edits blog text → regenerate
**Frontend:** Blog editor textarea + Regenerate button.

```
User edits text → clicks Regenerate
  └─ POST /api/regenerate-blog { postId, paintingSlug, editedText }
       ├─ Tables READ: paintings (title, year, appraisal_strengths, etc.)
       ├─ Reads private/artmind_system_prompt.txt
       ├─ Claude API claude-opus-4-6 (streaming SSE) → polished prose
       └─ Tables WRITTEN: blog_posts (full_text, word_count, title, updated_at)
```

---

## 12. Collector Brief

**When:** PaintingDetailScreen — "Generate collector brief →" button
**Frontend:** `CollectorBrief.jsx` — button → loading → rendered brief + market value.

```
User clicks button
  └─ POST /api/evaluate {
       callType: 'collector_brief',
       paintingSlug, userId
     }
       └─ artmind_evaluate.js
            ├─ fetchDynamicContext: rolling_summary, painting_history,
            │   painting_subject, top_inspirations
            ├─ Tables READ:
            │   paintings (rolling_summary, scores, title)
            │   painting_sessions (all versions)
            │   painting_subjects (subject_note)
            │   inspirations (top by intensity)
            ├─ Claude API → JSON { brief, market_value, value_rationale }
            └─ Returns to client only (NOT saved to DB)
```

---

## 13. Similar Paintings

**When:** CollectorBrief.jsx — "Find similar paintings →" button (after brief generated)
**Frontend:** `CollectorBrief.jsx` — button → gallery of similar PaintingCards.

```
User clicks Find Similar
  └─ GET /api/similar-paintings/:slug
       └─ getPaintingEmbedding(slug)
            ├─ Tables READ: paintings (embedding, title, summaries)
            └─ If no embedding: OpenAI text-embedding-3-small → Tables WRITTEN: paintings (embedding)
       └─ supabase.rpc('similar_paintings', { query_embedding, exclude_slug, match_count: 3 })
            └─ pgvector cosine similarity on paintings.embedding
            └─ Returns: painting rows (slug, title, image_url, score_overall)
```

---

## 14. WIP Vision (DALL-E 3)

**When:** PaintingDetailScreen (WIP only) — "Envision completed work →" button
**Frontend:** `WipVision.jsx` — button → loading → generated image + prompt text.

```
User clicks button
  └─ POST /api/wip-vision { paintingSlug, userId }
       ├─ Tables READ: paintings (image_url)
       └─ Internal fetch → POST /api/evaluate {
            callType: 'wip_vision_prompt',
            paintingSlug, userId,
            paintingImageUrl: paintings.image_url
          }
            ├─ Claude API (image via URL source) → DALL-E 3 prompt text (120 words)
            └─ Returns prompt text
       └─ OpenAI DALL-E 3: generate({ prompt, size: '1024x1024' })
       └─ Returns { imageUrl, prompt } to client (NOT saved to DB)
```

---

## 15. Style DNA Radar

**When:** HomeScreen — renders automatically when ≥2 paintings have been evaluated
**Frontend:** `StyleDNARadar.jsx` — pure SVG, no interaction. Data passed as prop.

```
HomeScreen mounts
  └─ getPaintings(userId)        [supabase.js direct]
       └─ Tables READ: paintings (all 8 score_ columns + score_overall)
  └─ paintings prop → StyleDNARadar
       └─ Filter: score_overall != null
       └─ Average each dimension across evaluated paintings
       └─ Render SVG octagonal radar (no API call)
```

---

## 16. Artist Profile — Edit

**When:** ProfileScreen — edit form submitted
**Frontend:** `ProfileScreen.jsx` — display_name, location, practice_description, website inputs.

```
User edits + saves
  └─ POST /api/update-artist-profile { display_name, location, practice_description, website, userId }
       └─ Tables WRITTEN: artist_profiles (display_name, location, practice_description, website)

Regenerate bio:
  └─ POST /api/evaluate { callType: 'regenerate_bio', userId }
       ├─ Tables READ: paintings (recent 5), inspirations (top 5)
       ├─ Claude API → 2-sentence practice statement
       └─ Returns to client (artist reviews before saving)
```

---

## 17. Profile Photo Upload

**When:** ProfileScreen — photo picker
**Frontend:** `ProfileScreen.jsx` — file input.

```
User picks photo
  └─ POST /api/upload-profile-photo { imageBase64, userId }
       ├─ sharp: resize to 400×400 cover crop
       ├─ Supabase Storage UPLOAD: paintings/profiles/{userId}/photo.jpg
       └─ Tables WRITTEN: artist_profiles (image_url)
```

---

## 18. Studio Log

**When:** HomeScreen — "Log today's session" button
**Frontend:** `StudioLogEntry.jsx` — painting selector, mood (focused/flowing/struggling), free-text note.

```
User fills form → saves
  └─ saveStudioLog(userId, { painting_slug, mood, note })   [supabase.js direct]
       └─ Tables WRITTEN: studio_states (user_id, painting_slug, state, note, session_date)
```

---

## 19. Set Painting Status (WIP ↔ Finished)

**When:** PaintingDetailScreen — "Mark Finished" / "Mark WIP" button
**Frontend:** `PaintingDetailScreen.jsx` — toggle button.

```
User clicks toggle
  └─ POST /api/set-painting-status { slug, status }
       └─ Tables WRITTEN: paintings (status)
```

---

## Table → Use Case Matrix

| Table | Read by | Written by |
|-------|---------|-----------|
| `paintings` | evaluate, morning, blog, companion, collector_brief, similar, wip_vision, style_dna | evaluate (scores), upload-photo, create-painting, set-painting-status, set-main-image, embedding |
| `painting_sessions` | evaluate, blog, session_dialogue | evaluate (new version), add-session-note, analyse_session |
| `painting_images` | PaintingDetailScreen | upload-painting-image, create-painting, add-painting-image |
| `companion_conversations` | evaluate (context), companion_dialogue | evaluate, companion_dialogue, session_dialogue |
| `blog_posts` | BlogScreen, PaintingDetailScreen | generate_blog, regenerate-blog, update-blog-post |
| `artist_profiles` | evaluate (cross_summary), morning, profile | update_artist_summary, update-artist-profile, upload-profile-photo |
| `evolution_metrics` | evaluate, morning | update_artist_summary (async after evaluate) |
| `artist_style_protocols` | evaluate (context injection) | — (manual/admin) |
| `prompt_parameters` | loadStaticPrompt() on every evaluate | — (manual/admin) |
| `studio_states` | evaluate (context), morning | saveStudioLog, setStudioState |
| `painting_subjects` | evaluate, blog | — (manual/admin) |
| `inspirations` | evaluate, morning, blog, collector_brief | — (manual/admin) |
| `session_frames` | analyse_session (frame URLs) | /api/sessions/media |
| `media_config` | server.js startup (frameCount logic) | — (manual/admin) |
| `score_history` | — (not yet actively used) | — (not yet written) |

---

## API Call Timing Reference

| Trigger | Sync/Async | Streaming |
|---------|-----------|-----------|
| Morning message | Sync | No |
| evaluate_painting | Sync | Yes (SSE) |
| update_artist_summary | Async (setImmediate) | No |
| Embedding refresh | Async (setImmediate) | No |
| companion_dialogue | Sync | Yes (SSE) |
| analyse_session | Sync (within media upload) | No |
| session_dialogue | Sync | Yes (SSE) |
| generate_blog | Sync | No |
| regenerate_blog | Sync | Yes (SSE) |
| collector_brief | Sync | No |
| wip_vision_prompt | Sync (internal chain) | No |
| DALL-E 3 call | Sync (within wip-vision) | No |
| regenerate_bio | Sync | No |
| similar_paintings | Sync | No |
