import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { readdir, readFile } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const IMAGES_DIR = path.join(process.cwd(), 'painting-images')
const BUCKET     = 'paintings'
const SUPPORTED  = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tiff'])

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
function publicUrl(slug, filename) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${slug}/${filename}`
}

// ── Find subfolders ───────────────────────────────────────────
const entries = await readdir(IMAGES_DIR, { withFileTypes: true })
const folders = entries.filter(e => e.isDirectory()).map(e => e.name)

if (!folders.length) {
  console.log('No subfolders found in painting-images/. Each subfolder should be named after a painting slug.')
  process.exit(0)
}

console.log(`Found ${folders.length} folder(s)\n`)
let uploaded = 0, skipped = 0

for (const slug of folders) {
  const folderPath = path.join(IMAGES_DIR, slug)
  const files = (await readdir(folderPath)).filter(f => SUPPORTED.has(path.extname(f).toLowerCase()))

  if (!files.length) {
    console.log(`  ${slug}: ✗ skipped — no supported image file found`)
    skipped++
    continue
  }

  const imagePath = path.join(folderPath, files[0])
  process.stdout.write(`  ${slug} (${files[0]}) … `)

  try {
    const raw = await readFile(imagePath)

    // Full image — max 2000px on longest side
    const full = await sharp(raw)
      .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer()

    // Thumbnail — max 400px on longest side
    const thumb = await sharp(raw)
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()

    // Upload full
    const { error: errFull } = await supabase.storage
      .from(BUCKET)
      .upload(`${slug}/full.jpg`, full, { contentType: 'image/jpeg', upsert: true })
    if (errFull) throw new Error(`full upload: ${errFull.message}`)

    // Upload thumb
    const { error: errThumb } = await supabase.storage
      .from(BUCKET)
      .upload(`${slug}/thumb.jpg`, thumb, { contentType: 'image/jpeg', upsert: true })
    if (errThumb) throw new Error(`thumb upload: ${errThumb.message}`)

    // Update paintings table
    const { error: errDb } = await supabase
      .from('paintings')
      .update({
        image_url:     publicUrl(slug, 'full.jpg'),
        thumbnail_b64: thumb.toString('base64'),
      })
      .eq('slug', slug)
    if (errDb) throw new Error(`db update: ${errDb.message}`)

    console.log(`✓  full ${(full.length / 1024).toFixed(0)}KB  thumb ${(thumb.length / 1024).toFixed(0)}KB`)
    uploaded++

  } catch (err) {
    console.log(`✗  ${err.message}`)
    skipped++
  }
}

console.log(`\n${uploaded} uploaded, ${skipped} skipped.`)
