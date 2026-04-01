import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

process.env.SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL

console.log('[env] SUPABASE_URL:        ', process.env.SUPABASE_URL        ? '✓ set' : '✗ missing')
console.log('[env] SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✓ set' : '✗ missing')
console.log('[env] ANTHROPIC_API_KEY:   ', process.env.ANTHROPIC_API_KEY    ? '✓ set' : '✗ missing')

import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

const { default: handler } = await import('./api/artmind_evaluate.js')

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

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
        const firstLine = content.split('\n').find(l => l.trim()) || ''
        const title = firstLine.replace(/^#+\s*/, '').trim()
        const wordCount = content.split(/\s+/).filter(Boolean).length

        const { data: post, error } = await supabase
          .from('blog_posts')
          .insert({
            painting_slug: paintingSlug,
            title,
            full_text:  content,
            word_count: wordCount,
            status:     'draft',
            generated_by: 'artmind',
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
  } catch (err) {
    console.error('[route error]', err)
    res.status(500).json({ error: err.message })
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
      .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
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
      .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
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

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`ArtMind server running on http://localhost:${PORT}`)
})
