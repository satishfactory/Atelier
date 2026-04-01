# Atelier — Development Roadmap
Generated: April 1, 2026

---

## HOW TO START TOMORROW
```
cd ~/Projects/atelier
claude
```
First message in Claude Code:
> "Read CLAUDE.md and ROADMAP.md and confirm current state before we build anything."

---

## CURRENT STATE (April 1, 2026)

**App:** React + Vite frontend (port 5173) + Express server (port 3001)
**Database:** Supabase project "Mantra" — wtowmjwdqbgpesajogyd.supabase.co
**Storage:** Supabase Storage bucket "paintings" — real images uploaded

**Sessions complete:**
- Session 1: Design system, Supabase module, ScoreRing component
- Session 2: PaintingCard component
- Session 3: HomeScreen — morning briefing layout
- Session 4: GalleryScreen — filters, WIP/My Work/Masterpieces
- Session 5: UploadScreen — evaluation pipeline working end to end
- Session 6: PaintingDetailScreen — chronological journal, version photos, EXIF fix
- Session 7: BlogScreen — generates, saves, editable, react-markdown rendering
- Session 8: ProfileScreen — stats, finished work, influences

**Paintings in database:**
- WIP: satish_memory_lane, satish_after_the_loss, satish_dance_of_life_lisbon
- Finished: satish_woman_with_vessels, satish_absent_chair, satish_room_with_view
- Masterpieces: cezanne_card_players, cezanne_large_bathers, munch_dance_of_life,
  matisse_open_window, matisse_moroccans, vangogh_night_cafe, vangogh_bedroom_arles,
  picasso_demoiselles, picasso_saltimbanques

**Tables in Supabase:**
paintings, painting_sessions, painting_images, companion_conversations,
blog_posts, inspirations, artist_profiles, prompt_parameters,
artist_style_protocols, painting_subjects, studio_states, score_history

**companion_conversations seeded for:**
Memory Lane v1, v2, v3 — After the Loss — Woman with Vessels —
The Absent Chair — Room with a View — Dance of Life Lisbon

**Key files (private — never commit):**
- private/artmind_system_prompt.txt — full secret recipe framework
- private/artmind_style_protocol.txt — computational style corrections
- api/evaluate.js — complete server route with all 4 call types

---

## PHASE 1 — Critical (Do first)

### Onboarding — fixes Q13 empty state
- [ ] 1. Build onboarding screen — welcome to upload 2 paintings to first evaluation to home screen with data
- [ ] 2. Empty states for every screen — each blank screen has a clear action button
- [ ] 3. Sample data option — load masterpiece set so app feels alive before own uploads

### Trust and transparency — fixes Q18 condition
- [ ] 4. Score disclaimer — one line below every score ring: "Scores reflect a neuroaesthetic framework, not objective measurement. Use them as a tool for reflection."
- [ ] 5. AI output labelling — "Companion analysis" label on every generated evaluation and blog post
- [ ] 6. Specific error messages — replace all "Evaluation failed" with actionable errors

---

## PHASE 2 — This week (Technical improvements)

- [ ] 7. Streaming responses — stream evaluation token by token. One parameter change. Transforms the experience.
- [ ] 8. Prompt caching — add cache_control to static system prompt in server.js. 90% cost reduction. 10 minutes.
- [ ] 9. Image resizing before API call — resize to 1024px max before sending to Claude. 60-70% token reduction.
- [ ] 10. Git push to GitHub — push to private repo using HTTPS + personal access token. Insurance against Mac failure.

---

## PHASE 3 — This week (Mobile)

- [ ] 11. Test on iPhone over local WiFi — get Mac IP, Safari on phone, http://[IP]:5173. Note what breaks.
- [ ] 12. Fix touch targets — all interactive elements minimum 44px tall.
- [ ] 13. Voice input on evaluate screen — Web Speech API, zero cost, zero tokens. Essential for studio use.

---

## PHASE 4 — This week (Archive restructure)

- [ ] 14. Archive My Work tab — finished paintings only (status=finished, type=artist_work)
- [ ] 15. Archive References tab — replaces Masterpieces. Sections: Artists, Books, Places, Films.

---

## PHASE 5 — Next week (Secret recipe — desk work, not code)

- [ ] 16. Write evaluation prompts for 7 remaining dimensions — Sheet 8 of spreadsheet
- [ ] 17. Write scoring anchors for all 8 dimensions — Sheet 3 of spreadsheet
- [ ] 18. Seed masterpiece evaluations — companion analyses for 6 masterpiece paintings

---

## PHASE 6 — Before any public launch (Legal minimums)

- [ ] 19. Privacy policy page — GDPR required
- [ ] 20. Terms of service
- [ ] 21. North star metric — count evaluations per user per week in Supabase

---

## PHASE 7 — Deployment (One afternoon)

- [ ] 22. Deploy frontend to Vercel — connect GitHub, set env vars, get URL
- [ ] 23. Deploy Express server to Railway — set env vars, get server URL
- [ ] 24. Update API endpoint — change localhost:3001 to Railway URL. App is live.

---

## Architecture rules (never break)
1. ONE component per file. Never combine.
2. ALL colours from CSS variables in design-system.css only.
3. NO Tailwind. NO shadcn. NO component libraries. Raw CSS only.
4. ALL Supabase calls in src/lib/supabase.js only.
5. ALL Claude API calls through server.js only. Never from browser.
6. No file exceeds 150 lines. Split if needed.
7. private/ folder is gitignored. Never commit. Never expose.

---

## Design language
- Headings: Playfair Display (serif)
- Body: Inter (sans-serif)
- Background: #F4F2EC (warm off-white)
- Accent: #C8773D (--warm)
- Text: #1E1E1C (--dark)
- Borders: 0.5px solid #D8D5CC (--stone)
- Companion voice: italic Playfair with warm left border

---

## Environment variables (.env.local — never commit)
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_KEY
- ANTHROPIC_API_KEY

---

## npm scripts
- npm run dev — Vite frontend on port 5173
- npm run server — Express server on port 3001
- npm run upload-images — upload painting-images/ to Supabase Storage
- npm run create-folders — create painting-images subfolders from database slugs
- npm run thumbnails — generate thumbnails from existing images

---

## Paste this at the start of every new Claude session

"I am building Atelier — an AI creative companion for serious artists.
Read CLAUDE.md and ROADMAP.md in ~/Projects/atelier.
Confirm you understand the current state before building anything.
Do not create any files until you have confirmed the architecture."



## Next session — start here
Read ROADMAP.md first. Then start with item 1: build the onboarding screen.
Before building anything, show me a proposed layout for the onboarding flow and wait for approval.
Do not build more than one item per message without checking in.
