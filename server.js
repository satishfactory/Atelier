import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

process.env.SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL

console.log('[env] SUPABASE_URL:        ', process.env.SUPABASE_URL        ? '✓ set' : '✗ missing')
console.log('[env] SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✓ set' : '✗ missing')
console.log('[env] ANTHROPIC_API_KEY:   ', process.env.ANTHROPIC_API_KEY    ? '✓ set' : '✗ missing')
console.log('[env] OPENAI_API_KEY:      ', process.env.OPENAI_API_KEY       ? '✓ set' : '✗ missing')

import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

// ── Media config — loaded at startup, refreshed every 5 min ──────────────────
export let mediaConfig = {}
async function loadMediaConfig() {
  const { data, error } = await supabase.from('media_config').select('config_key,config_value,value_type')
  if (error) { console.warn('[media_config] load failed:', error.message); return }
  data.forEach(r => {
    if (r.value_type === 'integer') mediaConfig[r.config_key] = parseInt(r.config_value)
    else if (r.value_type === 'float') mediaConfig[r.config_key] = parseFloat(r.config_value)
    else if (r.value_type === 'boolean') mediaConfig[r.config_key] = r.config_value === 'true'
    else mediaConfig[r.config_key] = r.config_value
  })
  console.log('[media_config] loaded', Object.keys(mediaConfig).length, 'keys')
}
loadMediaConfig()
setInterval(loadMediaConfig, 5 * 60 * 1000)

const { default: handler } = await import('./api/artmind_evaluate.js')

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use((req, _res, next) => { console.log(`[req] ${req.method} ${req.path}`); next() })

app.post('/api/evaluate', async (req, res) => {
  const { callType, paintingSlug, userId } = req.body || {}
  console.log('[req] callType:', callType, '| userId:', userId, '| slug:', paintingSlug)

  // For generate_blog: intercept res.json to save the post before responding
  if (callType === 'generate_blog') {
    let statusCode = 200
    const originalStatus = res.status.bind(res)
    res.status = (code) => { statusCode = code; return res }

    const originalJson = res.json.bind(res)
    res.json = async (data) => {
      res.status = originalStatus  // restore
      res.json   = originalJson

      if (statusCode === 200 && data.response) {
        const content = data.response
        const wordCount = content.split(/\s+/).filter(Boolean).length
        const headingLine = content.split('\n').find(l => l.trimStart().startsWith('#'))
        const extractedTitle = headingLine
          ? headingLine.replace(/^#+\s*/, '').trim()
          : content.replace(/\n+/g, ' ').trim().slice(0, 60)
        const { data: pRow } = await supabase.from('paintings').select('title').eq('slug', paintingSlug).single()
        const title = pRow?.title
          ? `${pRow.title} — Process Journal`
          : extractedTitle

        const { data: post, error } = await supabase
          .from('blog_posts')
          .insert({
            painting_slug: paintingSlug,
            title,
            full_text:  content,
            word_count: wordCount,
            status:     'draft',
            generated_by: 'artmind',
            ...(userId ? { user_id: userId } : {}),
          })
          .select('id')
          .single()

        if (error) console.error('[blog save error]', error.message)
        else console.log('[blog saved] id:', post.id, '| words:', wordCount)

        return originalJson({ ...data, postId: post?.id ?? null })
      }

      return originalJson(data)
    }
  }

  try {
    await handler(req, res)
    // After evaluate_painting: async cross-painting memory + embedding refresh
    if (callType === 'evaluate_painting' && paintingSlug && userId) {
      setImmediate(() => {
        fetch(`http://localhost:${process.env.PORT || 3001}/api/evaluate`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callType: 'update_artist_summary', paintingSlug, userId }),
        }).catch(e => console.error('[update_artist_summary async]', e.message))
        getPaintingEmbedding(paintingSlug).catch(e => console.error('[embedding refresh]', e.message))
      })
    }
  } catch (err) {
    console.error('[route error]', err)
    res.status(500).json({ error: err.message, stack: err.stack })
  }
})

// ── Upload photo (resize + store, no AI tokens) ───────────────
import sharp from 'sharp'
app.post('/api/upload-photo', async (req, res) => {
  const { slug, imageBase64 } = req.body || {}
  if (!slug || !imageBase64) return res.status(400).json({ error: 'slug and imageBase64 required' })
  try {
    const buffer = Buffer.from(imageBase64, 'base64')
    const resized = await sharp(buffer)
      .rotate()
      .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()
    const path = `${slug}/${Date.now()}.jpg`
    const { error: upErr } = await supabase.storage
      .from('paintings').upload(path, resized, { contentType: 'image/jpeg', upsert: false })
    if (upErr) throw new Error(upErr.message)
    const url = `${process.env.SUPABASE_URL}/storage/v1/object/public/paintings/${path}`
    const { error: dbErr } = await supabase.from('paintings').update({ image_url: url }).eq('slug', slug)
    if (dbErr) throw new Error(dbErr.message)
    res.json({ url })
  } catch (err) {
    console.error('[upload-photo]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Add painting image (versioned, no paintings.image_url update) ─
app.post('/api/add-painting-image', async (req, res) => {
  const { slug, imageBase64, version_label } = req.body || {}
  if (!slug || !imageBase64) return res.status(400).json({ error: 'slug and imageBase64 required' })
  const label = (version_label || 'untitled').replace(/[^a-z0-9_-]/gi, '_').toLowerCase()
  try {
    const buffer = Buffer.from(imageBase64, 'base64')
    const resized = await sharp(buffer)
      .rotate()
      .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()
    const path = `${slug}/${label}_${Date.now()}.jpg`
    const { error: upErr } = await supabase.storage
      .from('paintings').upload(path, resized, { contentType: 'image/jpeg', upsert: false })
    if (upErr) throw new Error(upErr.message)
    const url = `${process.env.SUPABASE_URL}/storage/v1/object/public/paintings/${path}`
    const { error: dbErr } = await supabase.from('painting_images').insert({
      painting_slug: slug, image_url: url, version_label: version_label || null,
    })
    if (dbErr) throw new Error(dbErr.message)
    res.json({ url })
  } catch (err) {
    console.error('[add-painting-image]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Update blog post (content + status) ──────────────────────
app.post('/api/update-blog-post', async (req, res) => {
  const { id, full_text, status } = req.body || {}
  if (!id) return res.status(400).json({ error: 'id required' })
  const updates = {}
  if (full_text !== undefined) {
    updates.full_text  = full_text
    updates.word_count = full_text.split(/\s+/).filter(Boolean).length
    const firstLine    = full_text.split('\n').find(l => l.trim()) || ''
    updates.title      = firstLine.replace(/^#+\s*/, '').trim() || null
  }
  if (status !== undefined) updates.status = status
  const { error } = await supabase.from('blog_posts').update(updates).eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

// ── Upload painting image ─────────────────────────────────────
app.post('/api/upload-painting-image', async (req, res) => {
  const { slug, imageBase64, versionLabel } = req.body || {}
  if (!slug || !imageBase64) return res.status(400).json({ error: 'slug and imageBase64 required' })
  try {
    const buffer = Buffer.from(imageBase64, 'base64')
    // Count existing images to name the file
    const { data: existing } = await supabase.from('painting_images').select('id').eq('painting_slug', slug)
    const n = (existing?.length ?? 0) + 1
    const resized = await sharp(buffer).rotate().resize(1200, null, { withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer()
    const thumb   = await sharp(buffer).rotate().resize(300, null, { withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer()
    const path      = `${slug}/v${n}.jpg`
    const thumbPath = `${slug}/v${n}_thumb.jpg`
    const bucket = 'paintings'
    const { error: e1 } = await supabase.storage.from(bucket).upload(path,      resized, { contentType: 'image/jpeg', upsert: true })
    const { error: e2 } = await supabase.storage.from(bucket).upload(thumbPath, thumb,   { contentType: 'image/jpeg', upsert: true })
    if (e1 || e2) throw new Error((e1 || e2).message)
    const base = `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}`
    const imageUrl = `${base}/${path}?t=${Date.now()}`
    const thumbUrl = `${base}/${thumbPath}?t=${Date.now()}`
    const { error: e3 } = await supabase.from('painting_images').insert({ painting_slug: slug, image_url: imageUrl, version_label: versionLabel || `v${n}` })
    if (e3) throw new Error(e3.message)
    res.json({ imageUrl, thumbUrl })
  } catch (err) {
    console.error('[upload-painting-image]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Set main painting image ───────────────────────────────────
app.post('/api/set-main-image', async (req, res) => {
  const { slug, imageUrl } = req.body || {}
  if (!slug || !imageUrl) return res.status(400).json({ error: 'slug and imageUrl required' })
  const thumbUrl = imageUrl.replace(/v(\d+)\.jpg/, 'v$1_thumb.jpg')
  const { error } = await supabase.from('paintings').update({ image_url: imageUrl, thumbnail_b64: null }).eq('slug', slug)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true, imageUrl, thumbUrl })
})

// ── Regenerate blog from edited text (streaming) ─────────────
app.post('/api/regenerate-blog', async (req, res) => {
  const { postId, paintingSlug, editedText } = req.body || {}
  if (!postId || !paintingSlug) return res.status(400).json({ error: 'postId and paintingSlug required' })

  const { default: handler } = await import('./api/artmind_evaluate.js').catch(() => ({ default: null }))
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const { data: pRow } = await supabase.from('paintings')
    .select('title, year, appraisal_strengths, viewer_experience, practice_connection')
    .eq('slug', paintingSlug).single()

  const systemPrompt = (await import('fs')).readFileSync('./private/artmind_system_prompt.txt', 'utf8')

  const userMsg = `The artist has edited their process journal entry. Rewrite it as a polished final version in the artist's voice, preserving all personal details, edits, and intentions — but improving the prose flow where needed. Do not add new facts. Keep the same structure.

PAINTING: ${pRow?.title || paintingSlug} (${pRow?.year || ''})
ARTIST'S EDITED TEXT:
${editedText}

Return only the rewritten blog post in Markdown. Include the # title.`

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  let fullText = ''
  const stream = anthropic.messages.stream({
    model: 'claude-opus-4-6', max_tokens: 1500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMsg }],
  })
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
      fullText += chunk.delta.text
      res.write(`data: ${JSON.stringify({ delta: chunk.delta.text })}\n\n`)
    }
  }
  const wordCount = fullText.split(/\s+/).filter(Boolean).length
  const titleLine = fullText.split('\n').find(l => l.startsWith('#'))
  const title = titleLine ? titleLine.replace(/^#+\s*/, '').trim() : null
  await supabase.from('blog_posts').update({
    full_text: fullText, word_count: wordCount,
    ...(title ? { title } : {}),
    updated_at: new Date().toISOString(),
  }).eq('id', postId)
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
  res.end()
})

// ── Upload profile photo (resize 400px square cover) ─────────
app.post('/api/upload-profile-photo', async (req, res) => {
  const { imageBase64, userId } = req.body || {}
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 required' })
  if (!userId) return res.status(400).json({ error: 'userId required' })
  try {
    const buffer = Buffer.from(imageBase64, 'base64')
    const resized = await sharp(buffer)
      .rotate()
      .resize(400, 400, { fit: 'cover' })
      .jpeg({ quality: 85 })
      .toBuffer()
    const path = `profiles/${userId}/photo.jpg`
    const { error: upErr } = await supabase.storage
      .from('paintings').upload(path, resized, { contentType: 'image/jpeg', upsert: true })
    if (upErr) throw new Error(upErr.message)
    const url = `${process.env.SUPABASE_URL}/storage/v1/object/public/paintings/${path}?t=${Date.now()}`
    const { error: dbErr } = await supabase.from('artist_profiles').update({ image_url: url }).eq('user_id', userId)
    if (dbErr) throw new Error(dbErr.message)
    res.json({ url })
  } catch (err) {
    console.error('[upload-profile-photo]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Update artist profile ─────────────────────────────────────
app.post('/api/update-artist-profile', async (req, res) => {
  const { display_name, location, practice_description, website, userId } = req.body || {}
  if (!userId) return res.status(400).json({ error: 'userId required' })
  const updates = {}
  if (display_name         !== undefined) updates.display_name         = display_name
  if (location             !== undefined) updates.location             = location
  if (practice_description !== undefined) updates.practice_description = practice_description
  if (website              !== undefined) updates.website              = website
  const { error } = await supabase.from('artist_profiles').update(updates).eq('user_id', userId)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true })
})

// ── External blogs from satishfactory.com ────────────────────
app.get('/api/external-blogs', async (req, res) => {
  try {
    const feeds = [
      'https://satishfactory.com/blogs/art-blog.atom',
      'https://satishfactory.com/blogs/travel-blogs.atom',
      'https://satishfactory.com/blogs/news.atom',
    ]
    const allPosts = []
    for (const feedUrl of feeds) {
      const r = await fetch(feedUrl)
      if (!r.ok) continue
      const xml = await r.text()
      const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) || []
      for (const entry of entries) {
        const title = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]
          ?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim()
        const link = entry.match(/<link[^>]*href="([^"]+)"/)?.[1]
        const published = entry.match(/<published>(.*?)<\/published>/)?.[1]
        const summary = entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)?.[1]
          ?.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim().slice(0, 200)
        if (title && link) allPosts.push({ title, url: link, published, summary })
      }
    }
    allPosts.sort((a, b) => new Date(b.published) - new Date(a.published))
    res.json({ posts: allPosts })
  } catch (err) {
    console.error('[external-blogs]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Update painting status ────────────────────────────────────
app.post('/api/set-painting-status', async (req, res) => {
  const { slug, status } = req.body || {}
  if (!slug || !status) return res.status(400).json({ error: 'slug and status required' })
  const { error } = await supabase.from('paintings').update({ status }).eq('slug', slug)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ ok: true, slug, status })
})

// ── Create new painting record ────────────────────────────────
app.post('/api/create-painting', async (req, res) => {
  const { title, slug, imageBase64, userId } = req.body || {}
  if (!title || !slug) return res.status(400).json({ error: 'title and slug required' })
  try {
    const row = { slug, title, artist: 'Satish', type: 'artist_work', status: 'wip' }
    if (userId) row.user_id = userId
    const { error: pErr } = await supabase.from('paintings').insert(row)
    if (pErr) throw new Error(pErr.message)
    if (imageBase64) {
      const buffer = Buffer.from(imageBase64, 'base64')
      const resized = await sharp(buffer).rotate()
        .resize(1200, null, { withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer()
      const filePath = `${slug}/v1.jpg`
      const { error: upErr } = await supabase.storage
        .from('paintings').upload(filePath, resized, { contentType: 'image/jpeg', upsert: true })
      if (!upErr) {
        const url = `${process.env.SUPABASE_URL}/storage/v1/object/public/paintings/${filePath}`
        await supabase.from('paintings').update({ image_url: url }).eq('slug', slug)
        await supabase.from('painting_images').insert({ painting_slug: slug, image_url: url, version_label: 'v1' })
      }
    }
    res.json({ ok: true, slug })
  } catch (err) {
    console.error('[create-painting]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Update companion conversation message ─────────────────────
app.post('/api/update-conversation', async (req, res) => {
  const { id, message } = req.body || {}
  if (!id || !message?.trim()) return res.status(400).json({ error: 'id and message required' })
  try {
    const { error } = await supabase.from('companion_conversations').update({ message: message.trim() }).eq('id', id)
    if (error) throw error
    res.json({ ok: true })
  } catch (err) {
    console.error('[update-conversation]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Similar paintings via pgvector cosine similarity ─────────
app.get('/api/similar-paintings/:slug', async (req, res) => {
  const { slug } = req.params
  try {
    const embedding = await getPaintingEmbedding(slug)
    if (!embedding) return res.json({ paintings: [] })
    const { data, error } = await supabase.rpc('similar_paintings', {
      query_embedding: embedding, exclude_slug: slug, match_count: 3,
    })
    if (error) throw new Error(error.message)
    res.json({ paintings: data || [] })
  } catch (err) {
    console.error('[similar-paintings]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/wip-vision — DALL-E 3 completion vision ───────────────────────
app.post('/api/wip-vision', async (req, res) => {
  const { paintingSlug, userId } = req.body || {}
  if (!paintingSlug) return res.status(400).json({ error: 'paintingSlug required' })
  try {
    const { data: p } = await supabase.from('paintings').select('image_url').eq('slug', paintingSlug).single()
    if (!p?.image_url) return res.status(400).json({ error: 'No image available — add a photo first' })
    const port = process.env.PORT || 3001
    const promptRes = await fetch(`http://localhost:${port}/api/evaluate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callType: 'wip_vision_prompt', paintingSlug, userId, paintingImageUrl: p.image_url })
    })
    const promptData = await promptRes.json()
    if (!promptRes.ok) throw new Error(promptData.error)
    const imgRes = await openai.images.generate({ model: 'dall-e-3', prompt: promptData.response, n: 1, size: '1024x1024' })
    res.json({ imageUrl: imgRes.data[0].url, prompt: promptData.response })
  } catch (err) {
    console.error('[wip-vision]', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/sessions/media — audio/video processing pipeline ───────────────
import multer from 'multer'
import { createReadStream } from 'fs'
import { unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import ffmpeg from 'fluent-ffmpeg'
import OpenAI, { toFile } from 'openai'

// Point fluent-ffmpeg at bundled binaries (no Homebrew required)
const __dirname = dirname(fileURLToPath(import.meta.url))
ffmpeg.setFfmpegPath(join(__dirname, 'bin', 'ffmpeg'))
ffmpeg.setFfprobePath(join(__dirname, 'bin', 'ffprobe'))

const openai  = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const upload  = multer({ dest: tmpdir(), limits: { fileSize: 150 * 1024 * 1024 } })

// ── Painting embedding — generate + cache ────────────────────
async function getPaintingEmbedding(slug) {
  const { data } = await supabase.from('paintings')
    .select('embedding, title, appraisal_strengths, practice_connection, viewer_experience, rolling_summary')
    .eq('slug', slug).single()
  if (!data) return null
  if (data.embedding) return data.embedding
  const text = [data.title, data.appraisal_strengths, data.practice_connection, data.viewer_experience, data.rolling_summary]
    .filter(Boolean).join('. ')
  if (!text) return null
  const resp = await openai.embeddings.create({ model: 'text-embedding-3-small', input: text.slice(0, 8000) })
  const embedding = resp.data[0].embedding
  await supabase.from('paintings').update({ embedding }).eq('slug', slug)
  return embedding
}

function frameCount(durationSecs, cfg) {
  if (durationSecs <= 30)  return cfg.frames_short_video  ?? 3
  if (durationSecs <= 60)  return cfg.frames_medium_video ?? 4
  return Math.min(cfg.frames_long_video ?? 5, cfg.frames_hard_cap ?? 5)
}

async function extractFrames(videoPath, duration, cfg) {
  const n        = frameCount(duration, cfg)
  const interval = duration / (n + 1)
  const frames   = []
  for (let i = 1; i <= n; i++) {
    const sec     = +(interval * i).toFixed(2)
    const outPath = join(tmpdir(), `frame_${Date.now()}_${i}.jpg`)
    await new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .seekInput(sec).frames(1).output(outPath)
        .on('end', resolve).on('error', reject).run()
    })
    const compressed = await sharp(outPath)
      .resize(cfg.frame_max_width_px ?? 1024, null, { withoutEnlargement: true })
      .webp({ quality: cfg.frame_quality_percent ?? 85 })
      .toBuffer()
    await unlink(outPath).catch(() => {})
    frames.push({ buffer: compressed, capturedAt: sec, index: i - 1 })
  }
  return frames
}

async function transcribeFile(filePath, mimeType, language) {
  const m = mimeType || ''
  let ext = m.includes('mp4') || m.includes('m4a') ? 'mp4'
    : m.includes('ogg')  ? 'ogg'
    : m.includes('wav')  ? 'wav'
    : m.includes('webm') ? 'webm'
    : m.includes('flac') ? 'flac'
    : m.includes('mpeg') || m.includes('mp3') ? 'mp3'
    : null  // unsupported (e.g. video/quicktime)

  let transcribePath = filePath
  let tmpAudio = null

  if (!ext) {
    // Unsupported format (e.g. iPhone quicktime/mov) — extract audio as mp3 via ffmpeg
    tmpAudio = join(tmpdir(), `whisper_${Date.now()}.mp3`)
    await new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .noVideo().audioCodec('libmp3lame').output(tmpAudio)
        .on('end', resolve).on('error', reject).run()
    })
    transcribePath = tmpAudio
    ext = 'mp3'
    mimeType = 'audio/mpeg'
  }

  try {
    const resp = await openai.audio.transcriptions.create({
      file: await toFile(createReadStream(transcribePath), `audio.${ext}`, { type: mimeType }),
      model: 'whisper-1',
      language: language ?? 'en',
    })
    return resp.text
  } finally {
    if (tmpAudio) await unlink(tmpAudio).catch(() => {})
  }
}

async function getVideoDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, meta) => {
      if (err) reject(err)
      else resolve(meta.format.duration ?? 60)
    })
  })
}

app.post('/api/sessions/media',
  upload.fields([{ name: 'audioBlob', maxCount: 1 }, { name: 'videoBlob', maxCount: 1 }]),
  async (req, res) => {
    const cfg          = mediaConfig
    const { paintingSlug, sessionNotes, sessionType, userId } = req.body || {}
    const audioFile    = req.files?.audioBlob?.[0]
    const videoFile    = req.files?.videoBlob?.[0]
    const tmpPaths     = [audioFile?.path, videoFile?.path].filter(Boolean)

    if (!paintingSlug) return res.status(400).json({ error: 'paintingSlug required' })
    if (!audioFile && !videoFile) return res.status(400).json({ error: 'audio or video required' })

    let transcript = '', frames = [], durationSecs = 0
    try {
      // ── Transcribe / extract frames ──────────────────────────
      try {
        if (videoFile) {
          durationSecs = Math.round(await getVideoDuration(videoFile.path))
          frames       = await extractFrames(videoFile.path, durationSecs, cfg)
          transcript   = await transcribeFile(videoFile.path, videoFile.mimetype, cfg.whisper_language)
        } else if (audioFile) {
          transcript = await transcribeFile(audioFile.path, audioFile.mimetype, cfg.whisper_language)
        }
      } finally {
        await Promise.all(tmpPaths.map(p => unlink(p).catch(() => {})))
      }

      // ── Upload frames to Supabase Storage ────────────────────
      const bucket     = cfg.storage_bucket_sessions ?? 'paintings'
      const pathPrefix = cfg.storage_path_sessions   ?? 'sessions'
      const ts         = Date.now()
      const frameUrls  = await Promise.all(frames.map(async f => {
        const storagePath = `${pathPrefix}/${paintingSlug}/${ts}/frame_${f.index}.webp`
        const { error }   = await supabase.storage.from(bucket)
          .upload(storagePath, f.buffer, { contentType: 'image/webp', upsert: true })
        if (error) throw error
        const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(storagePath)
        return { url: publicUrl, capturedAt: f.capturedAt, index: f.index }
      }))

      // ── Save session to DB ────────────────────────────────────
      const type = videoFile ? 'video' : 'audio'
      const { data: versionRow } = await supabase.from('painting_sessions')
        .select('version').eq('painting_slug', paintingSlug)
        .order('version', { ascending: false }).limit(1)
      const nextVersion = ((versionRow?.[0]?.version) ?? 0) + 1

      const insertRow = {
        painting_slug: paintingSlug,
        session_type:  type,
        transcript:    transcript || null,
        duration_secs: durationSecs || null,
        frame_count:   frameUrls.length,
        recorded_at:   new Date().toISOString(),
        session_date:  new Date().toISOString().slice(0, 10),
        artist_note:   sessionNotes || transcript?.slice(0, 200) || 'Media session',
        version:       nextVersion,
        ...(userId ? { user_id: userId } : {}),
      }
      console.log('[sessions/media] inserting:', JSON.stringify(insertRow))
      const { data: session, error: sessErr } = await supabase
        .from('painting_sessions')
        .insert(insertRow)
        .select('id').single()
      if (sessErr) throw sessErr

      if (frameUrls.length) {
        await supabase.from('session_frames').insert(
          frameUrls.map(f => ({
            session_id:      session.id,
            painting_slug:   paintingSlug,
            frame_index:     f.index,
            frame_url:       f.url,
            captured_at_sec: f.capturedAt,
          }))
        )
      }

      // ── Fire analyse_session async — non-blocking ─────────────
      setImmediate(() => {
        fetch(`http://localhost:${process.env.PORT || 3001}/api/evaluate`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callType: 'analyse_session',
            paintingSlug,
            sessionId: session.id,
            transcript,
            frameUrls: frameUrls.slice(0, cfg.analyse_session_frames ?? 3).map(f => f.url),
          }),
        }).catch(e => console.error('[analyse_session async]', e.message))
      })

      res.json({ sessionId: session.id, transcript, frameCount: frameUrls.length, frameUrls })
    } catch (err) {
      console.error('[sessions/media]', err.message)
      res.status(500).json({ error: err.message })
    }
  }
)

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`ArtMind server running on http://localhost:${PORT}`)
})
