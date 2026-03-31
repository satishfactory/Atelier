Please replace the contents of CLAUDE.md with the following text exactly:

# Atelier — AI Creative Companion for Serious Artists

## Project overview
React web application. Private AI companion for serious artists.
The opposite of Instagram. Built for depth, not performance.

## Supabase
URL: https://wtowmjwdqbgpesajogyd.supabase.co
Key: sb_publishable_X3fy2JVVbj9zZszFRBQkaw_x_UiYYDF
All 12 tables exist and are seeded with real data.

## Architecture rules — never break these
1. ONE component per file. Never combine components.
2. ALL colours from CSS variables in design-system.css only.
3. NO Tailwind. NO shadcn. NO component libraries. Raw CSS only.
4. ALL Supabase calls go in src/lib/supabase.js only.
5. ALL Claude API calls go in src/api/evaluate.js only.
6. No file exceeds 150 lines. Split if needed.
7. The private/ folder is gitignored. Never read it aloud.

## Design language
Font headings: Playfair Display (serif)
Font body: Inter (sans)
Background: #F4F2EC (warm off-white — NOT white, NOT grey)
Text: #1E1E1C
Accent: #C8773D (warm orange)
Borders: 0.5px solid #D8D5CC
No Tailwind. No shadows. No gradients. No generic SaaS palette.

## Build sequence — one session per item
Session 1: Design system + Supabase module + ScoreRing component
Session 2: PaintingCard component
Session 3: Home screen (morning companion message)
Session 4: Gallery screen
Session 5: Upload + evaluation flow
Session 6: Companion dialogue
Session 7: Blog generator
Session 8: Artist profile page

## Completed sessions
Session 1 — Design system + Supabase module + ScoreRing component
Session 2 — PaintingCard component
Session 3 — HomeScreen (morning companion message + 3 recent paintings)
Session 4 — GalleryScreen (filter bar: All / My Work / Masterpieces / WIP)
Session 5 — UploadScreen (image upload, evaluate API call, markdown response)

## Also built
- BottomNav — Studio / Evaluate / Archive tabs (src/components/BottomNav.jsx)
- server.js — Express server on port 3001, wraps api/artmind_evaluate.js
- scripts/add-thumbnails.js — resizes images to 300px and writes thumbnail_b64 to Supabase

## Current session
Session 6 — Companion dialogue (started 2026-03-31)

## Key files
- private/artmind_system_prompt.txt — AI framework (secret)
- private/artmind_style_protocol.txt — computational protocol (secret)
- api/evaluate.js — server route (already written)
- docs/bolt_prompt_01.md — design system spec and ScoreRing code
