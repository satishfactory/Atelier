import dotenv from 'dotenv'
import { readdir, readFile } from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const IMAGES_DIR = path.join(process.cwd(), 'painting-images')
const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tiff'])

const files = await readdir(IMAGES_DIR)
const images = files.filter(f => SUPPORTED.has(path.extname(f).toLowerCase()))

if (images.length === 0) {
  console.log('No images found in painting-images/')
  process.exit(0)
}

console.log(`Found ${images.length} image(s)\n`)

for (const filename of images) {
  const slug = path.basename(filename, path.extname(filename))
  const filepath = path.join(IMAGES_DIR, filename)

  process.stdout.write(`${slug} … `)

  try {
    const raw = await readFile(filepath)
    const resized = await sharp(raw)
      .resize(300, null, { withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()
    const b64 = resized.toString('base64')

    const { error } = await supabase
      .from('paintings')
      .update({ thumbnail_b64: b64 })
      .eq('slug', slug)

    if (error) throw error
    console.log(`✓  (${(resized.length / 1024).toFixed(1)} KB)`)
  } catch (err) {
    console.log(`✗  ${err.message}`)
  }
}

console.log('\nDone.')
