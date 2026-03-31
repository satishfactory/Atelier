# Atelier — Bolt.new Build Prompt 01
## Foundation: Design System + Supabase Connection
## Paste this as your FIRST message in a new Bolt.new project

---

Build a React web application called **Atelier**. 

This is the foundation session. Build ONLY the design system and 
the Supabase connection module. Do not build any screens yet.
I will ask for screens one at a time in subsequent messages.

---

## CRITICAL RULES FOR THIS ENTIRE PROJECT

1. ONE component per file. Never combine components.
2. ALL colours and typography come from CSS variables only — 
   never hardcode hex values in components.
3. NO Tailwind. NO shadcn. NO component libraries. Raw CSS only.
4. Every component must be independently editable without 
   touching any other file.
5. All Supabase calls go in ONE file: src/lib/supabase.js
6. All API calls go in ONE file: src/lib/api.js
7. No file should exceed 150 lines. If it would, split it.

---

## STEP 1: Create the design system file
## File: src/styles/design-system.css

:root {
  /* ── Base palette ── */
  --warm:        #C8773D;   /* primary accent — the artist */
  --warm-light:  #E8A87C;
  --warm-dark:   #8B4E20;
  --cool:        #4A7FA5;   /* secondary — the database */
  --cool-light:  #7AAFD4;
  --cool-dark:   #2C5F82;
  --violet:      #7F77DD;   /* AI companion */
  --teal:        #1D9E75;   /* success / growth */
  --coral:       #D85A30;   /* alert / important */

  /* ── Neutral scale (warm-tinted, not blue-grey) ── */
  --dark:        #1E1E1C;   /* primary text, dark surfaces */
  --mid:         #5A5A56;   /* secondary text */
  --stone:       #D8D5CC;   /* borders */
  --light:       #F4F2EC;   /* warm off-white background */
  --white:       #FFFFFF;

  /* ── Semantic ── */
  --bg:          var(--light);
  --surface:     var(--white);
  --text:        var(--dark);
  --text-muted:  var(--mid);
  --border:      var(--stone);
  --accent:      var(--warm);

  /* ── Score ring colours (one per dimension) ── */
  --dim-salience:   #7F77DD;
  --dim-gaze:       #D85A30;
  --dim-fluency:    #EF9F27;
  --dim-emotion:    #1D9E75;
  --dim-complexity: #D4537E;
  --dim-mirror:     #534AB7;
  --dim-colour:     #0F6E56;
  --dim-narrative:  #993C1D;

  /* ── Typography ── */
  --font-serif:  'Playfair Display', Georgia, serif;
  --font-sans:   'Inter', system-ui, sans-serif;
  --font-mono:   'JetBrains Mono', monospace;

  /* ── Spacing ── */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  24px;
  --space-6:  32px;
  --space-7:  48px;
  --space-8:  64px;

  /* ── Radius ── */
  --radius-sm:  6px;
  --radius-md:  12px;
  --radius-lg:  20px;
  --radius-full: 9999px;

  /* ── Animation ── */
  --transition: 200ms ease;
  --transition-slow: 500ms ease;
}

/* ── Global reset ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: var(--font-sans);
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

/* ── Typography scale ── */
.t-display  { font-family: var(--font-serif); font-size: 3rem;   font-weight: 400; line-height: 1.1; }
.t-title    { font-family: var(--font-serif); font-size: 2rem;   font-weight: 400; line-height: 1.2; }
.t-heading  { font-family: var(--font-serif); font-size: 1.5rem; font-weight: 400; line-height: 1.3; }
.t-body     { font-family: var(--font-sans);  font-size: 1rem;   font-weight: 400; line-height: 1.7; }
.t-small    { font-family: var(--font-sans);  font-size: 0.875rem; line-height: 1.5; }
.t-micro    { font-family: var(--font-sans);  font-size: 0.75rem;  letter-spacing: 0.06em; text-transform: uppercase; }
.t-mono     { font-family: var(--font-mono);  font-size: 0.875rem; }

/* ── Companion voice text ── */
.companion-text {
  font-family: var(--font-serif);
  font-size: 1.125rem;
  font-weight: 400;
  line-height: 1.8;
  color: var(--dark);
  font-style: italic;
}

/* ── Surface cards ── */
.card {
  background: var(--surface);
  border: 0.5px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-5);
}

.card-dark {
  background: var(--dark);
  border: none;
  border-radius: var(--radius-md);
  padding: var(--space-5);
  color: var(--light);
}

/* ── Buttons ── */
.btn {
  font-family: var(--font-sans);
  font-size: 0.875rem;
  font-weight: 500;
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  border: 0.5px solid var(--border);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  transition: all var(--transition);
  letter-spacing: 0.01em;
}
.btn:hover { background: var(--light); border-color: var(--mid); }
.btn-primary {
  background: var(--dark);
  color: var(--white);
  border-color: transparent;
}
.btn-primary:hover { background: var(--mid); }
.btn-warm {
  background: var(--warm);
  color: var(--white);
  border-color: transparent;
}

/* ── Score ring container ── */
.score-ring-container {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* ── Companion message ── */
.companion-message {
  border-left: 2px solid var(--warm);
  padding-left: var(--space-4);
  margin: var(--space-5) 0;
}

/* ── Loading state ── */
.skeleton {
  background: linear-gradient(90deg, var(--stone) 25%, var(--light) 50%, var(--stone) 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
}
@keyframes skeleton-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

---

## STEP 2: Create the Google Fonts import
## File: index.html (update the <head>)

Add this link tag in <head>:
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Inter:wght@300;400;500&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">

---

## STEP 3: Create the Supabase connection module
## File: src/lib/supabase.js
## This is the ONLY file that imports from @supabase/supabase-js

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Paintings ────────────────────────────────────────────────
export async function getPaintings(userId, filters = {}) {
  let query = supabase
    .from('paintings')
    .select(`
      slug, title, artist, year, type, status,
      thumbnail_b64, score_overall, score_salience,
      score_gaze, score_fluency, score_emotion,
      score_complexity, score_mirror, score_colour,
      score_narrative, tags, series_name, medium
    `)
    .order('updated_at', { ascending: false })

  if (filters.type) query = query.eq('type', filters.type)
  if (filters.status) query = query.eq('status', filters.status)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getPainting(slug) {
  const { data, error } = await supabase
    .from('paintings')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data
}

// ── WIP Sessions ─────────────────────────────────────────────
export async function getSessions(paintingSlug) {
  const { data, error } = await supabase
    .from('painting_sessions')
    .select('*')
    .eq('painting_slug', paintingSlug)
    .order('version', { ascending: false })
  if (error) throw error
  return data
}

// ── Inspirations ─────────────────────────────────────────────
export async function getInspirations(filters = {}) {
  let query = supabase
    .from('inspirations')
    .select('*')
    .eq('active', true)
    .order('intensity', { ascending: false })

  if (filters.type) query = query.eq('type', filters.type)

  const { data, error } = await query
  if (error) throw error
  return data
}

// ── Blog posts ───────────────────────────────────────────────
export async function getBlogPosts() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, subtitle, status, published_date, painting_slug, word_count')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ── Companion conversations ──────────────────────────────────
export async function getRecentDialogue(paintingSlug, limit = 6) {
  const { data, error } = await supabase
    .from('companion_conversations')
    .select('role, message, session_date')
    .eq('painting_slug', paintingSlug)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data.reverse()
}

export async function saveDialogue(userId, paintingSlug, userMsg, companionMsg) {
  const { error } = await supabase
    .from('companion_conversations')
    .insert([
      { user_id: userId, painting_slug: paintingSlug,
        role: 'user', message: userMsg },
      { user_id: userId, painting_slug: paintingSlug,
        role: 'companion', message: companionMsg }
    ])
  if (error) throw error
}

// ── Painting subject ─────────────────────────────────────────
export async function getPaintingSubject(paintingSlug) {
  const { data } = await supabase
    .from('painting_subjects')
    .select('subject_note, confirmed')
    .eq('painting_slug', paintingSlug)
    .single()
  return data
}

// ── Studio state ─────────────────────────────────────────────
export async function getStudioState(paintingSlug) {
  const { data } = await supabase
    .from('studio_states')
    .select('state, note, session_date')
    .eq('painting_slug', paintingSlug)
    .order('created_at', { ascending: false })
    .limit(1)
  return data?.[0] || null
}

export async function setStudioState(userId, paintingSlug, state, note = '') {
  const { error } = await supabase
    .from('studio_states')
    .insert({ user_id: userId, painting_slug: paintingSlug, state, note })
  if (error) throw error
}

---

## STEP 4: Create environment variables file
## File: .env.local

VITE_SUPABASE_URL=https://wtowmjwdqbgpesajogyd.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_X3fy2JVVbj9zZszFRBQkaw_x_UiYYDF
VITE_APP_NAME=Atelier

---

## STEP 5: Create the score ring component
## File: src/components/ScoreRing.jsx
## This component is used on every painting card and detail view

import '../styles/design-system.css'

const DIMENSIONS = [
  { key: 'salience',   color: 'var(--dim-salience)',   label: 'Salience'   },
  { key: 'gaze',       color: 'var(--dim-gaze)',       label: 'Gaze'       },
  { key: 'fluency',    color: 'var(--dim-fluency)',     label: 'Fluency'    },
  { key: 'emotion',    color: 'var(--dim-emotion)',     label: 'Emotion'    },
  { key: 'complexity', color: 'var(--dim-complexity)',  label: 'Complexity' },
  { key: 'mirror',     color: 'var(--dim-mirror)',      label: 'Mirror'     },
  { key: 'colour',     color: 'var(--dim-colour)',      label: 'Colour'     },
  { key: 'narrative',  color: 'var(--dim-narrative)',   label: 'Narrative'  },
]

function polarToXY(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * (Math.PI / 180)
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function segmentPath(cx, cy, innerR, outerR, startDeg, endDeg) {
  const s1 = polarToXY(cx, cy, innerR, startDeg)
  const s2 = polarToXY(cx, cy, outerR, startDeg)
  const e1 = polarToXY(cx, cy, outerR, endDeg)
  const e2 = polarToXY(cx, cy, innerR, endDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return [
    `M ${s1.x} ${s1.y}`,
    `L ${s2.x} ${s2.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${e1.x} ${e1.y}`,
    `L ${e2.x} ${e2.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${s1.x} ${s1.y}`,
    'Z'
  ].join(' ')
}

export default function ScoreRing({ scores = {}, size = 80, showLabels = false, onDimensionClick }) {
  const cx = size / 2
  const cy = size / 2
  const outerR = size * 0.44
  const innerR = size * 0.22
  const gap = 4
  const segAngle = (360 / 8) - gap

  const overall = scores.overall ||
    Math.round(Object.values(scores).filter(v => typeof v === 'number').reduce((a, b) => a + b, 0) /
    Object.values(scores).filter(v => typeof v === 'number').length) || 0

  return (
    <div className="score-ring-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {DIMENSIONS.map((dim, i) => {
          const score = scores[dim.key] || 0
          const startDeg = i * (360 / 8)
          const endDeg = startDeg + segAngle
          const fillR = innerR + (outerR - innerR) * (score / 100)
          return (
            <g key={dim.key}
               style={{ cursor: onDimensionClick ? 'pointer' : 'default' }}
               onClick={() => onDimensionClick?.(dim)}>
              {/* Background arc */}
              <path d={segmentPath(cx, cy, innerR, outerR, startDeg, endDeg)}
                    fill={dim.color} opacity={0.15} />
              {/* Filled arc */}
              <path d={segmentPath(cx, cy, innerR, fillR, startDeg, endDeg)}
                    fill={dim.color} opacity={0.9} />
            </g>
          )
        })}
        {/* Centre score */}
        <text x={cx} y={cy - 4} textAnchor="middle"
              style={{ fontFamily: 'var(--font-sans)', fontSize: size * 0.18,
                       fontWeight: 600, fill: 'var(--dark)' }}>
          {overall}
        </text>
        <text x={cx} y={cy + size * 0.12} textAnchor="middle"
              style={{ fontFamily: 'var(--font-sans)', fontSize: size * 0.1,
                       fill: 'var(--mid)' }}>
          overall
        </text>
      </svg>
    </div>
  )
}

---

## DO NOT BUILD ANYTHING ELSE YET.

After this session I will ask for:
- Message 2: PaintingCard component
- Message 3: Home screen (morning companion message)
- Message 4: Gallery screen
- Message 5: Upload flow
- Message 6: Companion dialogue
- Message 7: Blog generator

Each message will build ONE component or ONE screen.
If a message asks for more than one screen, refuse and 
ask me to split it.

---

## CONFIRM WHEN DONE:
When complete, confirm:
[ ] design-system.css created with all CSS variables
[ ] Google Fonts imported in index.html
[ ] supabase.js created with all query functions
[ ] .env.local created with Supabase credentials
[ ] ScoreRing.jsx created and renders correctly
[ ] No other files were created
