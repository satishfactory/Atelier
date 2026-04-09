/**
 * Archive Creation Workflow
 * -------------------------
 * Reads new painting rows from the workbook, uploads images,
 * syncs to Supabase, scores with AI, and generates blog posts.
 *
 * Usage:
 *   node scripts/archive-workflow.js              # process all new rows
 *   node scripts/archive-workflow.js --dry-run    # preview only
 *   node scripts/archive-workflow.js --force slug # reprocess one slug
 *
 * See docs/archive-creation-workflow.md for full reference.
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient }  from '@supabase/supabase-js'
import Anthropic         from '@anthropic-ai/sdk'
import sharp             from 'sharp'
import { execSync }      from 'child_process'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { resolve, join } from 'path'

// ── Config ────────────────────────────────────────────────────
const WORKBOOK    = resolve('./painting-images/atelier_archive_seed_four_paintings_v2.xlsx')
const IMG_DIR     = resolve('./painting-images')
const BLOG_DIR    = resolve('./output/blogs')
const TODAY       = new Date().toISOString().split('T')[0]
const ISO_NOW     = new Date().toISOString()

const DRY_RUN     = process.argv.includes('--dry-run')
const FORCE_IDX   = process.argv.indexOf('--force')
const FORCE_SLUG  = FORCE_IDX !== -1 ? process.argv[FORCE_IDX + 1] : null

const sb          = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const anthropic   = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const BASE_URL    = `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/paintings`
const systemPrompt = readFileSync('./private/artmind_system_prompt.txt', 'utf8')

mkdirSync(BLOG_DIR, { recursive: true })

// ── Step 1: Read workbook via Python ─────────────────────────
function readWorkbook() {
  const pyFile = '/tmp/atelier_read_wb.py'
  writeFileSync(pyFile, `
import openpyxl, json
wb = openpyxl.load_workbook('${WORKBOOK}')
ws = wb['Archive Import']
headers = {cell.column: cell.value for cell in ws[5] if cell.value}
rows = []
for dr in range(6, ws.max_row + 1):
    row = {headers[c]: ws.cell(row=dr, column=c).value for c in headers}
    if any(v for v in row.values() if v):
        rows.append(row)
print(json.dumps(rows, default=str))
`.trimStart())
  const out = execSync(`python3 ${pyFile}`, { encoding: 'utf8' })
  return JSON.parse(out)
}

// ── Step 2: Find image file ───────────────────────────────────
function findImage(filename) {
  if (!filename) return null
  const variants = [filename, filename.toLowerCase(),
    filename.replace(/\.(jpe?g|png)$/i, '.jpeg'),
    filename.replace(/\.(jpe?g|png)$/i, '.jpg'),
    filename.replace(/\.(jpe?g|png)$/i, '.JPG'),
  ]
  for (const v of variants) {
    const p = join(IMG_DIR, v)
    if (existsSync(p)) return p
  }
  return null
}

// ── Step 3b: Upload image ─────────────────────────────────────
async function uploadImage(imagePath, slug) {
  const buf   = readFileSync(imagePath)
  const full  = await sharp(buf).rotate().resize(1200, null, { withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer()
  const thumb = await sharp(buf).rotate().resize(300,  null, { withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer()

  for (const [name, data] of [['full.jpg', full], ['thumb.jpg', thumb]]) {
    const { error } = await sb.storage.from('paintings').upload(`${slug}/${name}`, data, { contentType: 'image/jpeg', upsert: true })
    if (error) throw new Error(`Storage upload ${name}: ${error.message}`)
  }
  return `${BASE_URL}/${slug}/full.jpg?t=${Date.now()}`
}

// ── Step 3c: Build paintings row ──────────────────────────────
function buildPaintingRow(row, imageUrl) {
  const isSold = row.sale_status === 'Sold'
  const veParts = [
    row.art_review_composition && `[Composition] ${row.art_review_composition}`,
    row.art_review_colour      && `[Colour] ${row.art_review_colour}`,
    row.art_review_space       && `[Space] ${row.art_review_space}`,
    row.art_review_surface     && `[Surface] ${row.art_review_surface}`,
  ].filter(Boolean)

  return {
    slug:                row.slug,
    title:               row.working_title,
    artist:              'Satish',
    year:                row.year,
    type:                'artist_work',
    status:              row.status || 'archive_draft',
    visibility:          isSold ? 'sold' : 'private',
    image_url:           imageUrl,
    tags:                [row.medium, row.size, row.sale_status, row.location_series].filter(Boolean),
    viewer_experience:   veParts.length ? veParts.join('\n\n') : null,
    practice_connection: row.art_review_mood       || null,
    appraisal_strengths: row.art_review_overall    || null,
    appraisal_develop:   row.process_note          || null,
    market_positioning:  [row.creative_notes, row.influence_refs && `References: ${row.influence_refs}`].filter(Boolean).join('\n\n') || null,
  }
}

// ── Step 3f: AI scoring ───────────────────────────────────────
async function scoreWithAI(imageUrl, title, year) {
  const imgBuf = Buffer.from(await (await fetch(imageUrl)).arrayBuffer())
  const imgB64 = imgBuf.toString('base64')

  const prompt = `Score this painting on each dimension 0–100. Respond ONLY with valid JSON, no other text.
{"score_salience":<int>,"score_gaze":<int>,"score_fluency":<int>,"score_emotion":<int>,"score_complexity":<int>,"score_mirror":<int>,"score_colour":<int>,"score_narrative":<int>,"score_overall":<int>,"bot_formalist":<int>,"bot_neuroscientist":<int>,"bot_phenomenologist":<int>,"bot_art_historian":<int>,"bot_collector":<int>,"bot_colour_theorist":<int>,"first_fixation":"<phrase>"}
Painting: ${title} (${year}, Mixed-media Acrylic)`

  const msg = await anthropic.messages.create({
    model: 'claude-opus-4-6', max_tokens: 400, system: systemPrompt,
    messages: [{ role: 'user', content: [
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imgB64 } },
      { type: 'text', text: prompt }
    ]}]
  })
  const raw = msg.content[0].text.trim()
  return JSON.parse(raw.startsWith('{') ? raw : raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
}

// ── Step 3g: Generate blog ────────────────────────────────────
async function generateBlog(row) {
  const prompt = `Write a process journal entry for this painting. First person, artist's voice, for the private archive — not marketing. Honest and specific.

PAINTING: ${row.working_title} (${row.year})
MEDIUM: ${row.medium || 'Mixed-media Acrylic'}, ${row.size || ''}
STATUS: ${row.sale_status}
SUBJECT: ${row.subject_note}
PROCESS: ${row.process_note || ''}
REFERENCES: ${row.influence_refs || ''}
ARTIST NOTES: ${row.creative_notes || ''}
FORMAL — Composition: ${row.art_review_composition || ''}
FORMAL — Colour: ${row.art_review_colour || ''}
FORMAL — Mood: ${row.art_review_mood || ''}
OVERALL: ${row.art_review_overall || ''}

Write 350–500 words. Markdown. # title at top. Paragraphs only, no bullet points.
Opening: what the painting is and why it matters personally.
Middle: how it was built — decisions, references, discoveries.
Close: what it means now, what remains open.`

  const msg = await anthropic.messages.create({
    model: 'claude-opus-4-6', max_tokens: 1200, system: systemPrompt,
    messages: [{ role: 'user', content: prompt }]
  })
  return msg.content[0].text
}

// ── Step 3j: Write revision back to workbook ─────────────────
function markWorkbookDone(slug, note) {
  const pyFile = '/tmp/atelier_mark_wb.py'
  writeFileSync(pyFile, `
import openpyxl
wb = openpyxl.load_workbook('${WORKBOOK}')
ws = wb['Archive Import']
headers = {cell.value: cell.column for cell in ws[5] if cell.value}
rn_col  = headers.get('revision_note')
rt_col  = headers.get('revision_timestamp')
s_col   = headers.get('slug')
if rn_col and rt_col and s_col:
    for row in ws.iter_rows(min_row=6):
        if row[s_col - 1].value == '${slug}':
            row[rn_col - 1].value = '${note}'
            row[rt_col - 1].value = '${ISO_NOW}'
            break
wb.save('${WORKBOOK}')
`.trimStart())
  execSync(`python3 ${pyFile}`, { encoding: 'utf8' })
}

// ── Main ──────────────────────────────────────────────────────
async function run() {
  console.log(`\n╔══════════════════════════════════════════════╗`)
  console.log(`║   ARCHIVE CREATION WORKFLOW${DRY_RUN ? ' — DRY RUN' : '          '}   ║`)
  console.log(`╚══════════════════════════════════════════════╝\n`)

  // Step 1: Read workbook
  console.log('Step 1 — Reading workbook…')
  const allRows = readWorkbook()
  const validRows = allRows.filter(r => r.slug && r.filename)
  console.log(`  Found ${validRows.length} valid rows in workbook.\n`)

  // Step 2: Detect new rows
  const { data: existing } = await sb.from('paintings').select('slug').in('slug', validRows.map(r => r.slug))
  const existingSlugs = new Set((existing || []).map(r => r.slug))

  const toProcess = validRows.filter(r =>
    FORCE_SLUG ? r.slug === FORCE_SLUG : !existingSlugs.has(r.slug)
  )

  if (toProcess.length === 0) {
    console.log('✓ No new rows to process. All slugs already in Supabase.')
    if (FORCE_SLUG) console.log(`  (--force slug "${FORCE_SLUG}" not found in workbook)`)
    process.exit(0)
  }

  console.log(`Step 2 — ${toProcess.length} row(s) to process:`)
  toProcess.forEach(r => console.log(`  → ${r.slug}  "${r.working_title}"  (${r.year})`))
  if (DRY_RUN) { console.log('\n[DRY RUN] No changes made.'); process.exit(0) }
  console.log()

  const results = []

  for (const row of toProcess) {
    console.log(`\n── Processing: ${row.slug} ─────────────────────────`)

    try {
      // 3a: Find image
      const imgPath = findImage(row.filename)
      if (!imgPath) throw new Error(`Image file not found: "${row.filename}" in painting-images/`)
      console.log(`  3a ✓ Image: ${imgPath.split('/').pop()}`)

      // 3b: Upload image
      console.log(`  3b   Uploading to Supabase Storage…`)
      const imageUrl = await uploadImage(imgPath, row.slug)
      console.log(`  3b ✓ Uploaded: ${row.slug}/full.jpg`)

      // 3c: Insert paintings row
      const paintingRow = buildPaintingRow(row, imageUrl)
      const { error: pe } = await sb.from('paintings').upsert(paintingRow, { onConflict: 'slug' })
      if (pe) throw new Error(`Paintings insert: ${pe.message}`)
      console.log(`  3c ✓ paintings row inserted`)

      // 3d: Insert painting_sessions v1
      const { error: se } = await sb.from('painting_sessions').upsert({
        painting_slug: row.slug, version: 1, session_date: TODAY,
        artist_note: row.subject_note || null,
      }, { onConflict: 'painting_slug,version' })
      if (se) throw new Error(`Sessions insert: ${se.message}`)
      console.log(`  3d ✓ painting_sessions v1 inserted`)

      // 3e: Insert painting_images row
      await sb.from('painting_images').upsert({
        painting_slug: row.slug, image_url: imageUrl, version_label: 'v1 — archive'
      }, { onConflict: 'painting_slug,version_label' })
      console.log(`  3e ✓ painting_images row inserted`)

      // 3f: AI scoring
      console.log(`  3f   Running AI scoring…`)
      const scores = await scoreWithAI(imageUrl, row.working_title, row.year)
      const scoreFields = {
        score_salience: scores.score_salience, score_gaze: scores.score_gaze,
        score_fluency: scores.score_fluency,   score_emotion: scores.score_emotion,
        score_complexity: scores.score_complexity, score_mirror: scores.score_mirror,
        score_colour: scores.score_colour,     score_narrative: scores.score_narrative,
        score_overall: scores.score_overall,
        bot_formalist: scores.bot_formalist,   bot_neuroscientist: scores.bot_neuroscientist,
        bot_phenomenologist: scores.bot_phenomenologist, bot_art_historian: scores.bot_art_historian,
        bot_collector: scores.bot_collector,   bot_colour_theorist: scores.bot_colour_theorist,
        first_fixation: scores.first_fixation, evaluated_at: ISO_NOW,
      }
      await sb.from('paintings').update(scoreFields).eq('slug', row.slug)
      await sb.from('painting_sessions').update({
        score_salience: scores.score_salience, score_gaze: scores.score_gaze,
        score_fluency: scores.score_fluency,   score_emotion: scores.score_emotion,
        score_complexity: scores.score_complexity, score_mirror: scores.score_mirror,
        score_colour: scores.score_colour,     score_narrative: scores.score_narrative,
        score_overall: scores.score_overall,
      }).eq('painting_slug', row.slug).eq('version', 1)
      console.log(`  3f ✓ Scores: overall=${scores.score_overall} salience=${scores.score_salience} emotion=${scores.score_emotion}`)

      // 3g: Generate blog
      console.log(`  3g   Generating blog post…`)
      const blogText = await generateBlog(row)
      const wordCount = blogText.split(/\s+/).filter(Boolean).length
      console.log(`  3g ✓ Blog: ${wordCount} words`)

      // 3h: Save locally
      const blogFile = join(BLOG_DIR, `${row.slug}.md`)
      writeFileSync(blogFile, blogText, 'utf8')
      console.log(`  3h ✓ Saved: output/blogs/${row.slug}.md`)

      // 3i: Insert blog_posts
      const titleLine = blogText.split('\n').find(l => l.startsWith('#'))
      const blogTitle = titleLine ? titleLine.replace(/^#+\s*/, '').trim() : row.working_title
      const { error: be } = await sb.from('blog_posts').insert({
        painting_slug: row.slug, title: blogTitle,
        full_text: blogText, word_count: wordCount,
        reading_minutes: Math.ceil(wordCount / 200),
        status: 'draft', visibility: 'private',
        generated_by: 'claude-opus-4-6',
      })
      if (be) throw new Error(`Blog insert: ${be.message}`)
      console.log(`  3i ✓ blog_posts row inserted: "${blogTitle}"`)

      // 3j: Mark workbook done
      markWorkbookDone(row.slug, `Archive workflow completed — ${TODAY}`)
      console.log(`  3j ✓ Workbook updated: revision_note written`)

      results.push({ slug: row.slug, title: row.working_title, overall: scores.score_overall, words: wordCount, status: 'ok' })

    } catch (err) {
      console.error(`  ✗ FAILED: ${err.message}`)
      results.push({ slug: row.slug, title: row.working_title, status: 'failed', error: err.message })
    }
  }

  // Step 4: Summary
  console.log(`\n╔══════════════════════════════════════════════╗`)
  console.log(`║   SUMMARY                                    ║`)
  console.log(`╚══════════════════════════════════════════════╝`)
  const ok     = results.filter(r => r.status === 'ok')
  const failed = results.filter(r => r.status === 'failed')
  console.log(`  Processed: ${ok.length} of ${results.length}`)
  ok.forEach(r => console.log(`  ✓ ${r.slug.padEnd(20)} overall=${r.overall}  blog=${r.words}w`))
  failed.forEach(r => console.log(`  ✗ ${r.slug.padEnd(20)} ${r.error}`))
  console.log()
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1) })
