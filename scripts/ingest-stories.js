// scripts/ingest-stories.js
// Reads Story_images/[slug]/notes.md + image files → seeds Supabase
// Usage: npm run ingest-stories
// Requires: SUPABASE_SERVICE_KEY and SUPABASE_SEED_USER_ID in .env.local

import dotenv    from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join, extname, basename, dirname } from 'path'
import { fileURLToPath } from 'url'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY
const USER_ID      = process.env.SUPABASE_SEED_USER_ID

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local')
  process.exit(1)
}
if (!USER_ID) {
  console.error('Missing SUPABASE_SEED_USER_ID in .env.local — add your auth user UUID')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const __dirname = dirname(fileURLToPath(import.meta.url))
const STORIES_DIR = join(__dirname, '..', 'Story_images')
const IMAGE_EXTS  = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic'])

// ── Frontmatter parser ────────────────────────────────────────────────────────
function parseFrontmatter(md) {
  const match = md.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!match) return { meta: {}, body: md }
  const meta = {}
  match[1].split('\n').forEach(line => {
    const i = line.indexOf(':')
    if (i === -1) return
    const key = line.slice(0, i).trim()
    const val = line.slice(i + 1).trim()
    if (key && val) meta[key] = val
  })
  return { meta, body: match[2].trim() }
}

// ── Section extractor ─────────────────────────────────────────────────────────
function extractSection(body, heading) {
  const re = new RegExp(`## ${heading}\\n([\\s\\S]*?)(?=\\n## |$)`)
  const m  = body.match(re)
  return m ? m[1].trim() : ''
}

// ── Photo notes parser: "filename: caption" ───────────────────────────────────
function parsePhotoNotes(section) {
  const map = {}
  section.split('\n').forEach(line => {
    const i = line.indexOf(': ')
    if (i === -1) return
    const key     = line.slice(0, i).trim().toLowerCase()
    const caption = line.slice(i + 2).trim()
    if (key && caption) map[key] = caption
  })
  return map
}

// ── Sessions parser: "- YYYY-MM-DD | notes" ──────────────────────────────────
function parseSessions(section) {
  return section.split('\n')
    .map(l => l.replace(/^-\s*/, '').trim())
    .filter(l => /^\d{4}-\d{2}-\d{2}/.test(l))
    .map(l => {
      const [date, ...rest] = l.split(' | ')
      return { session_date: date.trim(), notes: rest.join(' | ').trim() }
    })
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function ingest() {
  const dirs = readdirSync(STORIES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)

  for (const dir of dirs) {
    const folder   = join(STORIES_DIR, dir)
    const notesPath = join(folder, 'notes.md')

    if (!existsSync(notesPath)) {
      console.log(`[skip] ${dir} — no notes.md`)
      continue
    }

    const md = readFileSync(notesPath, 'utf8')
    const { meta, body } = parseFrontmatter(md)

    if (!meta.slug || !meta.title) {
      console.log(`[skip] ${dir} — missing slug or title in frontmatter`)
      continue
    }

    console.log(`\n── ${meta.slug} (${meta.title}) ──`)

    // 1. Upsert story row
    const storyRow = {
      user_id:      USER_ID,
      slug:         meta.slug,
      title:        meta.title,
      trip:         meta.trip         || null,
      location:     meta.location     || null,
      travel_dates: meta.travel_dates || null,
      status:       meta.status       || 'wip',
      mood:         meta.mood         || null,
      artistic_ref: meta.artistic_ref || null,
      philosophical:meta.philosophical|| null,
      sensory:      meta.sensory      || null,
      moment_type:  meta.moment_type  || null,
      audio_url:    meta.audio_url    || null,
      video_url:    meta.video_url    || null,
      raw_notes:    extractSection(body, 'Raw Notes') || null,
    }
    const { error: storyErr } = await supabase
      .from('stories')
      .upsert(storyRow, { onConflict: 'user_id,slug' })
    if (storyErr) { console.error(`  [stories upsert]`, storyErr.message); continue }
    console.log(`  ✓ story row upserted`)

    // 2. Parse photo notes + sessions
    const photoNotesMap = parsePhotoNotes(extractSection(body, 'Photo Notes'))
    const sessions      = parseSessions(extractSection(body, 'Sessions'))

    // 3. Upload images
    const files = readdirSync(folder)
      .filter(f => IMAGE_EXTS.has(extname(f).toLowerCase()))
      .sort()

    for (let i = 0; i < files.length; i++) {
      const filename    = files[i]
      const fileBase    = basename(filename, extname(filename)).toLowerCase()
      const storagePath = `${meta.slug}/${filename}`
      const caption     = photoNotesMap[fileBase] || null

      // Check if already uploaded
      const { data: existing } = await supabase
        .from('story_media')
        .select('id')
        .eq('storage_path', storagePath)
        .maybeSingle()
      if (existing) {
        console.log(`  ~ skip ${filename} (already uploaded)`)
        continue
      }

      const fileBytes = readFileSync(join(folder, filename))
      const mimeType  = extname(filename).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg'

      const { error: upErr } = await supabase.storage
        .from('story-images')
        .upload(storagePath, fileBytes, { contentType: mimeType, upsert: false })

      if (upErr && !upErr.message.includes('already exists')) {
        console.error(`  [upload] ${filename}:`, upErr.message)
        continue
      }

      const { data: urlData } = supabase.storage
        .from('story-images')
        .getPublicUrl(storagePath)

      const mediaRow = {
        user_id:      USER_ID,
        story_slug:   meta.slug,
        storage_path: storagePath,
        public_url:   urlData.publicUrl,
        caption,
        sort_order:   i,
        is_cover:     i === 0,
      }
      const { error: mediaErr } = await supabase
        .from('story_media')
        .insert(mediaRow)
      if (mediaErr) console.error(`  [story_media] ${filename}:`, mediaErr.message)
      else console.log(`  ✓ uploaded ${filename}${caption ? ` — "${caption.slice(0, 40)}"` : ''}`)
    }

    // 4. Seed sessions (skip if identical date+notes already exists)
    for (const s of sessions) {
      const { data: existing } = await supabase
        .from('story_sessions')
        .select('id')
        .eq('story_slug', meta.slug)
        .eq('session_date', s.session_date)
        .eq('notes', s.notes)
        .maybeSingle()
      if (existing) { console.log(`  ~ skip session ${s.session_date} (exists)`); continue }

      const { error: sessErr } = await supabase
        .from('story_sessions')
        .insert({ user_id: USER_ID, story_slug: meta.slug, ...s })
      if (sessErr) console.error(`  [session] ${s.session_date}:`, sessErr.message)
      else console.log(`  ✓ session ${s.session_date}`)
    }
  }

  console.log('\n── ingestion complete ──')
}

ingest().catch(err => { console.error(err); process.exit(1) })
