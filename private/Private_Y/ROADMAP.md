# Atelier — Master Roadmap
## Updated: 2026-04-06

---

## 🚀 Next: Public launch sequence
1. **Auth + RLS** ✅ DONE — Supabase email/password, LoginScreen, userId props, RLS policies, cross-user data isolation
2. **Bug-fix sprint** ✅ DONE — Testing plan executed; P1 bugs resolved (see atelier_testing_plan.xlsx)
3. **Run migrations** ⚠️ REQUIRED before launch:
   - `scripts/migration_auth.sql` — adds user_id + RLS to all tables
   - `scripts/migration_artist_profiles.sql` — adds missing columns to artist_profiles
   - `scripts/migration_relink_owner.sql` — re-links existing data to real auth UUID
4. **Mobile audit** (P3) — full 390px pass all screens before sharing
5. **Deployment** (X1) — Vercel + Railway, nixpacks.toml, env vars
6. **Legal** (P5) — privacy policy + ToS pages
7. **Features continue** — Session B (DALL-E), C (Field Notes), etc.

---

## Completed ✅
- Phase 1: Onboarding, empty states, disclaimers
- Phase 2: Streaming, prompt caching, image resizing
- Phase 3: iPhone WiFi, 44px touch targets, voice input
- Phase 8/8b: Morning message wired, PaintingCard unified
- Phase 9: PaintingDetailScreen — images-first, journal, edit mode
- Phase 10: Journal excerpts, regenerate bio
- Phase 11: Audio/video pipeline — Whisper, ffmpeg, SessionRecorder, PastSessionCard; iPhone quicktime video fixed
- Session A: Voice output (SpeakButton), daily challenge, collector brief, similar paintings (pgvector)
- Auth + RLS: Supabase Auth, LoginScreen, userId prop-drilled to all screens, RLS policies
- Data isolation: all queries scoped by userId; blog/painting inserts carry user_id; profile routes scoped per user
- Testing sprint: P1 bugs fixed — profile save/photo (multi-user safe), Safari mic message, Masterpieces tab removed, external blogs removed, version copy clarified

---

## Feature Registry — All Pending Work

### Intelligence & AI
| ID | Feature | Tokens | API Cost | Depends On | Session |
|----|---------|--------|----------|------------|---------|
| I1 | Voice output — app speaks (Web Speech API) | 1,500 | Free | — | A |
| I2 | Daily creative challenge in morning message | 2,000 | Free | Morning message ✅ | A |
| I3 | Collector brief — AI-generated per painting | 3,000 | ~$0.01/call | — | A |
| I4 | WIP vision — DALL-E 3 shows painting's potential | 6,000 | $0.04/image | OpenAI key ✅ | B |
| I5 | Style DNA — radar chart from score data | 4,000 | Free | Scores in DB ✅ | B |
| I6 | Exhibition proposal generator | 4,000 | ~$0.02/call | Finished paintings | C |
| I7 | Influence deep dive (MasterpieceDetail screen) | 8,000 | ~$0.03/call | — | F |

### New Screens
| ID | Feature | Tokens | API Cost | Depends On | Session |
|----|---------|--------|----------|------------|---------|
| S1 | Field Notes / Travel tab — photo → creative ideas | 7,000 | ~$0.02/call | — | C |
| S2 | Studio reel — ffmpeg timelapse per painting | 8,000 | Free | session_frames ✅ | D |

### Polish & Architecture
| ID | Feature | Tokens | API Cost | Depends On | Session |
|----|---------|--------|----------|------------|---------|
| P1 | Archive restructure — My Work / References tabs | 5,000 | Free | — | E |
| P2 | Scoring anchors (Phase 5 — secret recipe) | 4,000 | Free | — | E |
| P3 | Mobile layout audit — full 390px pass all screens | 12,000 | Free | Stable screens | G |
| P4 | Password gate — before sharing | 1,500 | Free | — | G |
| P5 | Legal screens — privacy, ToS | 4,000 | Free | — | G |

### Infrastructure
| ID | Feature | Tokens | Manual | Depends On | Session |
|----|---------|--------|--------|------------|---------|
| X1 | Deployment — Vercel + Railway | 3,000 | High | P3, P4 ✅ | H |
| X2 | Auth + RLS — Supabase multi-user | 20,000 | Medium | X1 | I+J |

---

## Dependency Map

```
I1  voice output          ──────────────────── no deps
I2  daily challenge       ── morning message ✅
I3  collector brief       ──────────────────── no deps
I4  DALL-E vision         ── OpenAI key ✅
I5  style DNA             ── score data in DB ✅
I6  exhibition proposal   ── finished paintings with evaluations
I7  influence deep dive   ──────────────────── no deps
S1  travel tab            ──────────────────── no deps
S2  studio reel           ── session_frames ✅
P1  archive               ──────────────────── no deps
P2  scoring anchors       ──────────────────── no deps
P3  mobile audit          ── all screens stable
P4  password gate         ──────────────────── no deps
P5  legal                 ──────────────────── no deps
X1  deploy                ── P3 mobile + P4 gate
X2  auth + RLS            ── X1 deployed
```

---

## Session Plan

### Session A — Voice + Intelligence quick wins (~6,500 tokens)
**Goal:** App speaks. Morning sets a challenge. Paintings become shareable.
| Step | Feature | Tokens |
|------|---------|--------|
| 1 | I1 — Voice: speak button on morning message + companion evaluations | 1,500 |
| 2 | I2 — Daily challenge: structured output from morning_message callType | 2,000 |
| 3 | I3 — Collector brief: new callType + button on PaintingDetailScreen | 3,000 |

### Session B — Visual intelligence (~10,000 tokens)
**Goal:** Artist sees their potential. Style becomes visible data.
| Step | Feature | Tokens |
|------|---------|--------|
| 1 | I4 — WIP vision (DALL-E 3): analyse → generate → display potential completion | 6,000 |
| 2 | I5 — Style DNA: SVG radar from aggregated scores across all paintings | 4,000 |

### Session C — New screens (~11,000 tokens)
**Goal:** World feeds into work. Body of work becomes a statement.
| Step | Feature | Tokens |
|------|---------|--------|
| 1 | S1 — Field Notes tab: upload travel photo → Claude extracts palette + 3 creative prompts | 7,000 |
| 2 | I6 — Exhibition proposal: multi-painting selector + 400-word curatorial draft | 4,000 |

### Session D — Studio reel (~8,000 tokens)
**Goal:** Every painting has a visual document of its making.
| Step | Feature | Tokens |
|------|---------|--------|
| 1 | S2 — /api/compile-reel: fetch session_frames → ffmpeg → MP4 → Supabase Storage | 8,000 |

### Session E — Archive + Scoring (~9,000 tokens)
**Goal:** Gallery is organised. Evaluation is deeper.
| Step | Feature | Tokens |
|------|---------|--------|
| 1 | P1 — Archive: My Work / References / Masterpieces tabs in GalleryScreen | 5,000 |
| 2 | P2 — Scoring anchors: refine evaluation dimensions | 4,000 |

### Session F — Influence deep dive (~8,000 tokens)
**Goal:** Masterpiece paintings become active teachers.
| Step | Feature | Tokens |
|------|---------|--------|
| 1 | I7 — MasterpieceDetail: full-screen analysis, analyse_masterpiece callType, cached | 8,000 |

### Session G — Pre-deploy polish (~17,500 tokens)
**Goal:** App is ready to share.
| Step | Feature | Tokens |
|------|---------|--------|
| 1 | P4 — Password gate | 1,500 |
| 2 | P5 — Legal screens | 4,000 |
| 3 | P3 — Mobile audit: full 390px pass every screen | 12,000 |

### Session H — Deployment (~3,000 tokens + manual ~2hrs)
**Goal:** Live on Vercel + Railway.
| Step | Feature | Tokens |
|------|---------|--------|
| 1 | X1 — nixpacks.toml, env vars, VITE_API_URL, test checklist | 3,000 |

### Sessions I + J — Auth + RLS (~20,000 tokens)
**Goal:** App can be shared with a second artist.
| Step | Feature | Tokens |
|------|---------|--------|
| 1 | X2 — Supabase Auth email/password, LoginScreen, RLS policies | 20,000 |

---

## Token + Cost Summary

| Session | Goal | Tokens | Est. Duration |
|---------|------|--------|---------------|
| A | Voice + challenges + collector brief | 6,500 | 1 session |
| B | DALL-E vision + Style DNA | 10,000 | 1 session |
| C | Travel tab + Exhibition proposal | 11,000 | 1 session |
| D | Studio reel | 8,000 | 1 session |
| E | Archive + Scoring | 9,000 | 1 session |
| F | Influence deep dive | 8,000 | 1 session |
| G | Pre-deploy polish | 17,500 | 1–2 sessions |
| H | Deployment | 3,000 + manual | 1 session |
| I+J | Auth + RLS | 20,000 | 2 sessions |
| **Total** | | **~93,000** | **~11 sessions** |

---

## Running API cost estimate (beyond Claude tokens)
- DALL-E 3 vision: $0.04/image × estimated 50 uses = $2.00
- All other features: Claude API tokens only (covered by your plan)
- Storage (reels, images): <$1/month on Supabase free tier

---

## Rules — carry forward always
- ONE component per file, max 150 lines
- ALL colours from CSS variables in design-system.css only
- NO Tailwind, NO component libraries, raw CSS only
- ALL Supabase calls in src/lib/supabase.js only
- ALL Claude API calls in api/artmind_evaluate.js only
- ADD only — never modify existing working routes or components without reading first
- private/ folder — never read aloud, never commit
- paintings table — never remove or rename existing columns
