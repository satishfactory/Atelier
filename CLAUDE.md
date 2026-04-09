# Atelier — AI Creative Companion

React+Vite (5173) · Express (3001) · Supabase · private AI studio for serious artists.

## Token discipline (apply every action)
> If this file exceeds ~1,000 tokens (~70 lines), reorganize and economize it back down before proceeding.
- Read only files you will edit — one parallel batch, never re-read after editing
- Hold context; don't re-read a file already seen this session
- Grep/Glob before Read; Bash only when no dedicated tool fits
- Make all edits to a file before moving on; no read→edit→read cycles
- Strip stale cache: after any session compaction, verify you're not replaying dead context

## Architecture — never break
1. One component per file
2. All colours from CSS vars in design-system.css only — no inline colours
3. No Tailwind, no shadcn, no component libraries — raw CSS only
4. All Supabase calls → src/lib/supabase.js only
5. All Claude API calls → api/artmind_evaluate.js only
6. 150-line file limit — split if needed
7. private/ is gitignored — never read aloud

## Multi-user
- userId from supabase.auth.getSession() in App.jsx, prop-drilled everywhere
- All supabase.js functions accept userId as first param → .eq('user_id', userId)
- All server inserts accept userId in body → set user_id on row
- Profile photo: profiles/{userId}/photo.jpg
- NEVER hardcode UUID '4f2f0493-f044-481d-a332-0fb1b9fe1c1d'

## Supabase
URL: https://wtowmjwdqbgpesajogyd.supabase.co
Key: sb_publishable_X3fy2JVVbj9zZszFRBQkaw_x_UiYYDF
Service key: .env.local → SUPABASE_SERVICE_KEY (server-side only)
RLS on all tables: user_id = auth.uid()

## Design
Headings: Playfair Display · Body: Inter
Background: #F4F2EC · Text: #1E1E1C · Accent: #C8773D · Borders: 0.5px solid #D8D5CC
No shadows (except painting frames) · No gradients

## Key patterns
- PaintingCard — ONLY card for paintings. Props: painting, onClick, onCameraClick
  Grid: `<div className="gallery-grid gallery-grid--flush">`
- SERVER = `http://${window.location.hostname}:3001` — never hardcode localhost
- friendlyError(msg) from supabase.js — use for all API error alerts
- useVoiceInput() + MicButton — src/lib/useVoiceInput.jsx

## Dev
```
npm run dev        # Vite frontend :5173 (add --host for iPhone)
node server.js     # Express API :3001
```
iPhone: http://192.168.1.142:5173

## Deferred work
- ~~E-02~~: Multiple photos per evaluation — DONE 2026-04-07
- ~~E-03~~: Rich notes per journal entry — DONE 2026-04-07
- ~~J-03~~: Journal layout redesign — DONE 2026-04-07
