# ATELIER — Stories Module v2 (Corrected Spec)

> Replaces STORIES_MODULE_CLAUDE_CODE.md. Read this file, CLAUDE.md, and design-system.css before building.

---

## What this builds

Stories is a content type for travel writing — photos + raw notes → polished blog draft.
Stories appear in the WIP Archive under a [Paintings] [Stories] sub-tab.
Story blog drafts appear in BlogScreen alongside painting posts, labelled "Travel Story".

---

## Step 1 — Database Migration

```sql
-- ── Stories ───────────────────────────────────────────────────────────────────
CREATE TABLE stories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug          TEXT NOT NULL,
  title         TEXT NOT NULL,
  trip          TEXT,
  location      TEXT,
  travel_dates  TEXT,
  status        TEXT DEFAULT 'wip' CHECK (status IN ('wip', 'draft', 'published')),
  cover_image_url TEXT,

  -- Flavour fields
  mood          TEXT,
  artistic_ref  TEXT,
  philosophical TEXT,
  sensory       TEXT,
  moment_type   TEXT,

  -- Raw material
  raw_notes     TEXT,
  audio_url     TEXT,
  video_url     TEXT,

  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, slug)
);

-- ── Story media ───────────────────────────────────────────────────────────────
CREATE TABLE story_media (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_slug    TEXT NOT NULL,
  storage_path  TEXT UNIQUE NOT NULL,
  public_url    TEXT NOT NULL,
  caption       TEXT,
  sort_order    INTEGER DEFAULT 0,
  is_cover      BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Story sessions (journal entries) ─────────────────────────────────────────
CREATE TABLE story_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_slug    TEXT NOT NULL,
  session_date  DATE NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
  -- No unique constraint on (slug, date) — multiple entries per day are valid
);

-- ── Story blogs ───────────────────────────────────────────────────────────────
CREATE TABLE story_blogs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  story_slug    TEXT NOT NULL,
  title         TEXT,
  content       TEXT,
  status        TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  shopify_url   TEXT,
  generated_at  TIMESTAMPTZ DEFAULT now(),
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX idx_stories_user        ON stories(user_id);
CREATE INDEX idx_stories_status      ON stories(status);
CREATE INDEX idx_story_media_slug    ON story_media(story_slug);
CREATE INDEX idx_story_media_user    ON story_media(user_id);
CREATE INDEX idx_story_sessions_slug ON story_sessions(story_slug);
CREATE INDEX idx_story_blogs_slug    ON story_blogs(story_slug);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE stories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_media    ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_blogs    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner" ON stories        FOR ALL USING (user_id = auth.uid());
CREATE POLICY "owner" ON story_media    FOR ALL USING (user_id = auth.uid());
CREATE POLICY "owner" ON story_sessions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "owner" ON story_blogs    FOR ALL USING (user_id = auth.uid());
```

---

## Step 2 — Storage Bucket

In Supabase Dashboard → Storage, create bucket `story-images` with **public read** access.

---

## Step 3 — Supabase Library (add to `src/lib/supabase.js`)

Follows the exact same userId-first, guarded-filter pattern as `getPaintings()` and `getBlogPosts()`.

```javascript
// ─── Stories ─────────────────────────────────────────────────────────────────

export async function getStories(userId, status = null) {
  let query = supabase
    .from('stories')
    .select('*, story_media(public_url, is_cover, sort_order)')
    .order('created_at', { ascending: false })
  if (userId) query = query.eq('user_id', userId)
  if (status)  query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getStory(userId, slug) {
  let query = supabase
    .from('stories')
    .select('*, story_media(*), story_sessions(*), story_blogs(*)')
    .eq('slug', slug)
  if (userId) query = query.eq('user_id', userId)
  const { data, error } = await query.single()
  if (error) throw error
  return data
}

export async function upsertStory(userId, story) {
  const row = { ...story }
  if (userId) row.user_id = userId
  const { data, error } = await supabase
    .from('stories')
    .upsert(row, { onConflict: 'user_id,slug' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateStory(slug, updates) {
  const { data, error } = await supabase
    .from('stories')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('slug', slug)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function addStorySession(userId, session) {
  const row = { ...session }
  if (userId) row.user_id = userId
  const { data, error } = await supabase
    .from('story_sessions')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function uploadStoryImage(userId, slug, file, sortOrder = 0) {
  const ext = file.name.split('.').pop()
  const storagePath = `${slug}/${Date.now()}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('story-images')
    .upload(storagePath, file, { contentType: file.type })
  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage
    .from('story-images')
    .getPublicUrl(storagePath)

  const row = {
    story_slug: slug,
    storage_path: storagePath,
    public_url: urlData.publicUrl,
    sort_order: sortOrder,
    is_cover: sortOrder === 0,
  }
  if (userId) row.user_id = userId

  const { data, error } = await supabase
    .from('story_media')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateStoryMediaCaption(mediaId, caption) {
  const { error } = await supabase
    .from('story_media')
    .update({ caption })
    .eq('id', mediaId)
  if (error) throw error
}

export async function saveStoryBlog(userId, storySlug, title, content) {
  const row = { story_slug: storySlug, title, content, status: 'draft' }
  if (userId) row.user_id = userId
  const { data, error } = await supabase
    .from('story_blogs')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateStoryBlog(blogId, updates) {
  const { data, error } = await supabase
    .from('story_blogs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', blogId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getStoryBlogsForScreen(userId) {
  // Used by BlogScreen to show story drafts alongside painting posts
  let query = supabase
    .from('story_blogs')
    .select('id, title, status, story_slug, content, created_at')
    .order('created_at', { ascending: false })
  if (userId) query = query.eq('user_id', userId)
  const { data, error } = await query
  if (error) throw error
  return data
}
```

---

## Step 4 — API Endpoint: Story Blog Generator

Create `api/story-expand.js`. Register in `server.js`:
```javascript
import { storyExpand } from './api/story-expand.js'
app.post('/api/story-expand', storyExpand)
```

```javascript
// api/story-expand.js
// POST /api/story-expand
// Body: { story } — full story object with media, sessions, flavour fields

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function storyExpand(req, res) {
  const { story } = req.body
  if (!story) return res.status(400).json({ error: 'story object required' })

  const {
    title, trip, location, travel_dates,
    mood, artistic_ref, philosophical, sensory, moment_type,
    raw_notes, story_media = [], story_sessions = []
  } = story

  // Prefer cover image + captioned images — higher signal per token
  const prioritised = [
    ...story_media.filter(m => m.is_cover),
    ...story_media.filter(m => !m.is_cover && m.caption),
    ...story_media.filter(m => !m.is_cover && !m.caption),
  ]
  const mediaSample = prioritised.slice(0, 5)   // cap at 5 images

  const imageBlocks = []
  for (const media of mediaSample) {
    if (media.public_url) {
      imageBlocks.push({ type: 'image', source: { type: 'url', url: media.public_url } })
      if (media.caption) {
        imageBlocks.push({ type: 'text', text: `[Photo: ${media.caption}]` })
      }
    }
  }

  const sessionLog = story_sessions
    .sort((a, b) => a.session_date.localeCompare(b.session_date))
    .map(s => `${s.session_date}: ${s.notes}`)
    .join('\n')

  const userPrompt = `
Write a rich, personal travel blog post based on this artist's raw material.

STORY: ${title}
TRIP: ${trip || ''}
LOCATION: ${location || ''}
DATES: ${travel_dates || ''}

FLAVOUR NOTES:
- Mood: ${mood || 'not specified'}
- Artistic reference: ${artistic_ref || 'not specified'}
- Philosophical thread: ${philosophical || 'not specified'}
- Sensory details: ${sensory || 'not specified'}
- Moment type: ${moment_type || 'not specified'}

RAW NOTES:
${raw_notes || 'None provided.'}

JOURNAL SESSIONS:
${sessionLog || 'None.'}

${imageBlocks.length > 0 ? 'PHOTOS: See images — weave references to specific images naturally into the text.' : ''}

Write approximately 600–900 words. Voice: personal, painterly, reflective — not a tourist guide.
Draw on the artistic and philosophical threads for depth. Use sensory details to bring the reader in.
Flow naturally — arrival, discovery, artistic resonance, reflection — no section headers.
Output only the blog text, no title, no preamble.
  `.trim()

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const stream = client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 1200,
    system: `You are the artistic companion to a serious painter and traveller. You write in a voice that is personal, reflective, and painterly — never touristic or generic. You draw on art history, philosophy, and the physical sensation of being in a place. Your prose is rich but not overwrought.`,
    messages: [
      { role: 'user', content: [...imageBlocks, { type: 'text', text: userPrompt }] }
    ]
  })

  stream.on('text', text => res.write(`data: ${JSON.stringify({ text })}\n\n`))
  stream.on('end', () => { res.write('data: [DONE]\n\n'); res.end() })
  stream.on('error', err => {
    console.error('story-expand error:', err)
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  })
}
```

---

## Step 5 — React Components

### Component tree

```
StoriesScreen          ← list view, sub-tab in WIP Archive
  StoryCard            ← one card per story
  NewStoryModal        ← create modal

StoryDetailScreen      ← vertical scroll, same structure as PaintingDetailScreen
  StoryPhotoGrid       ← photo upload + caption grid
  StoryJournal         ← session list + add note
  StoryBlogPanel       ← generate + streaming + saved drafts
    StoryBlogEditor    ← editable single draft
```

**150-line rule:** StoryDetailScreen delegates to four sub-components so the screen itself stays a thin coordinator (state + layout only).

---

### `src/screens/StoriesScreen.jsx`

```
Props: userId, onStoryClick

Layout: filter tabs [All][WIP][Draft][Published]
        gallery-grid of StoryCards + one "+" card

- Load: getStories(userId, activeFilter)
- Click story card → onStoryClick(slug)
- Click "+" card → open NewStoryModal
- After create → onStoryClick(newSlug)
```

---

### `src/components/StoryCard.jsx`

```
Props: story, onClick

Renders: cover image, title, location, trip, status badge
Visual: same language as PaintingCard — border var(--border),
        0.5px, borderRadius var(--radius-md)
Status badge colours: wip → var(--warm), draft → var(--mid),
                      published → var(--teal)
```

---

### `src/components/NewStoryModal.jsx`

```
Props: userId, onCreated, onClose

Fields: title (required), trip, location
Slug: title.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
On submit: upsertStory(userId, { slug, title, trip, location, status: 'wip' })
           → onCreated(slug)
```

---

### `src/screens/StoryDetailScreen.jsx`

Matches PaintingDetailScreen structure exactly: vertical sections with `detail-label` headers, no tabs.

```
Props: userId, slug, onBack

State: story (full object), saving (bool)

Sections (vertical scroll):
  ← Back  [title]  [status badge]  [Mark Draft / Mark Published]

  ─── PHOTOS ─────────────────────────────
  <StoryPhotoGrid userId story onMediaChange />

  ─── DETAILS ────────────────────────────
  Title / Trip / Location / Dates — inline editable inputs
  [Save] → updateStory(slug, fields)

  ─── FLAVOUR ────────────────────────────
  Mood / Artistic ref / Philosophical / Sensory / Moment type
  [Save] → updateStory(slug, fields)

  ─── RAW NOTES ──────────────────────────
  Large textarea + MicButton for voice input
  [Save] → updateStory(slug, { raw_notes })

  ─── JOURNAL ────────────────────────────
  <StoryJournal userId slug sessions />

  ─── TRAVEL BLOG ────────────────────────
  <StoryBlogPanel userId story />
```

---

### `src/components/StoryPhotoGrid.jsx`

```
Props: userId, story, onMediaChange

- Display story.story_media sorted by sort_order
- Each photo: thumbnail (80×80) + caption input below
- Caption input: onBlur → updateStoryMediaCaption(id, caption)
- [+ Add Photos] → file input (multiple) → uploadStoryImage() for each,
  sortOrder = existing.length + index
- First upload sets is_cover automatically (handled in supabase.js)
- Show per-image upload progress spinner
```

---

### `src/components/StoryJournal.jsx`

```
Props: userId, slug, sessions (array), onSessionAdded

- List sessions descending by session_date
- Each entry: date label + notes text
- [Add Note] form: date input (defaults today) + textarea + MicButton
- Submit → addStorySession(userId, { story_slug: slug, session_date, notes })
          → onSessionAdded(newSession)
```

---

### `src/components/StoryBlogPanel.jsx`

```
Props: userId, story

State: streaming (bool), draft (string), savedBlogs (array)

Load: story.story_blogs (already in story object — no extra fetch)

[Generate Blog] button
  → POST /api/story-expand with full story object
  → SSE stream renders into draft textarea in real time
  → [Save Draft] → saveStoryBlog(userId, slug, title, draft)
                 → append to savedBlogs

Saved drafts list: each rendered as <StoryBlogEditor />
```

---

### `src/components/StoryBlogEditor.jsx`

```
Props: blog, onUpdate

- Textarea styled like existing BlogEditor (Playfair, lineHeight 1.8)
- [Save] → updateStoryBlog(blog.id, { content: edited, title })
- [Copy for Shopify] → navigator.clipboard.writeText(content)
- Shows generated_at timestamp in t-micro / var(--text-muted)
- Status toggle: [Mark Published] → updateStoryBlog(blog.id, { status: 'published' })
```

---

## Step 6 — Navigation Integration

### WIP Archive sub-tabs

In the screen that renders the WIP paintings grid (GalleryScreen or equivalent), add a sub-tab row above the grid:

```jsx
// Sub-tab row — same style as existing filter tabs
<div className="filter-tabs">
  <button className={tab === 'paintings' ? 'active' : ''} onClick={() => setTab('paintings')}>Paintings</button>
  <button className={tab === 'stories'   ? 'active' : ''} onClick={() => setTab('stories')}>Stories</button>
</div>

{tab === 'paintings' && /* existing paintings grid */}
{tab === 'stories'   && <StoriesScreen userId={userId} onStoryClick={slug => onNavigate('story', slug)} />}
```

### Blog screen

In `BlogScreen.jsx`, load story blogs alongside painting posts and render with a "Travel Story" type label:

```javascript
// Load both in parallel
const [posts, storyBlogs] = await Promise.all([
  getBlogPosts(userId),
  getStoryBlogsForScreen(userId)
])
```

Story blog cards render inline with painting post cards. Add a `type` prop to `BlogPostCard` (or create `StoryBlogPostCard`) that shows a pill label: `Travel Story` in `var(--teal)`.

---

## Step 7 — Ingestion Script

Create `scripts/ingest-stories.js`.

**Reads:** `Story_images/[slug]/notes.md` (frontmatter + sections).
**Uploads:** all jpeg/jpg/png/heic in the same folder.
**Uses service key** to bypass RLS. Sets `user_id` from env var `SUPABASE_SEED_USER_ID`.

```
Story_images/
  morocco/
    notes.md        ← frontmatter + ## Raw Notes + ## Photo Notes + ## Sessions
    morocco 4.jpeg
    …
  Malaga/
    notes.md
    pic1.jpeg
    …
```

**notes.md format:**
```markdown
---
title: Following Matisse in Morocco
slug: morocco_matisse
trip: Spain & Morocco 2024
location: Tangier, Morocco
travel_dates: October 2024
status: wip
mood: reverent, contemplative, suspended in time
artistic_ref: Matisse in Morocco 1912 — the same light, the same geometry
philosophical: Can you walk in a master's footsteps 100 years later and feel what he felt?
sensory: incense, cool marble floors, the sound of the call to prayer, green tiles
moment_type: pilgrimage, architecture, artistic discovery
audio_url:
video_url:
---

## Raw Notes

[voice transcription / bullet notes]

## Photo Notes

filename_without_ext: caption text
filename_without_ext: caption text

## Sessions

- YYYY-MM-DD | notes text
```

**Script behaviour (idempotent):**
1. Walk each `Story_images/[slug]/` directory
2. Parse notes.md frontmatter → upsert `stories` row (slug unique per user)
3. Parse `## Raw Notes` → set `raw_notes` on upsert
4. Parse `## Photo Notes` → map filename → caption
5. Upload each image file to `story-images` bucket at `slug/filename` (skip if exists via `upsertIgnoreDuplicates`)
6. Upsert `story_media` rows with captions, sort_order by filename alpha sort, is_cover for first
7. Parse `## Sessions` → upsert `story_sessions` (skip if identical date+notes row exists)
8. Set `user_id` on every row from `process.env.SUPABASE_SEED_USER_ID`

**Add to package.json:**
```json
"ingest-stories": "node scripts/ingest-stories.js"
```

**Add to .env.local:**
```
SUPABASE_SEED_USER_ID=<your-auth-user-uuid>
```

---

## Step 8 — Build Order

1. Run SQL migration in Supabase editor
2. Create `story-images` storage bucket (public read)
3. Add Supabase functions to `src/lib/supabase.js`
4. Create `api/story-expand.js`, register route in `server.js`
5. Create React components in order:
   - `StoryCard.jsx`
   - `NewStoryModal.jsx`
   - `StoryPhotoGrid.jsx`
   - `StoryJournal.jsx`
   - `StoryBlogEditor.jsx`
   - `StoryBlogPanel.jsx`
   - `StoryDetailScreen.jsx`
   - `StoriesScreen.jsx`
6. Add [Paintings][Stories] sub-tab to WIP Archive screen
7. Add story blogs to `BlogScreen.jsx`
8. Create `notes.md` in each `Story_images/` subfolder
9. Add `SUPABASE_SEED_USER_ID` to `.env.local`
10. Run `npm run ingest-stories`
11. Test: open Morocco story → Generate Blog → verify streaming → Save Draft → check BlogScreen

---

## Corrections from v1

| v1 issue | v2 fix |
|----------|--------|
| No `user_id` on any table | `user_id UUID NOT NULL` + RLS on all 4 tables |
| `artist_slug TEXT DEFAULT 'satish'` hardcoded | Removed entirely — identity is `user_id` |
| Supabase fns ignore userId | All list/create fns take `userId` first with guarded `.eq('user_id', userId)` |
| StoryDetail with 3 tabs → 300+ lines | Vertical scroll sections (matches PaintingDetailScreen) + 4 sub-components |
| `claude-opus-4-5` | `claude-opus-4-6` |
| Unique constraint on (slug, date) in story_sessions | Removed — multiple entries per day valid |
| All 6 images sent to Claude blindly | Prioritised: cover → captioned → uncaptioned, capped at 5 |
| No RLS policies in migration | Full `owner` policies on all 4 tables |
| ingestion script has no user_id | Reads from `SUPABASE_SEED_USER_ID` env var |
