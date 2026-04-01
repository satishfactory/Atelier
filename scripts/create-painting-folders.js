import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { mkdir, access } from 'fs/promises'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const IMAGES_DIR = path.join(process.cwd(), 'painting-images')

await mkdir(IMAGES_DIR, { recursive: true })

const { data, error } = await supabase
  .from('paintings')
  .select('slug, title')
  .eq('type', 'artist_work')
  .order('slug')

if (error) { console.log('Error:', error.message); process.exit(1) }

console.log(`${data.length} artist_work painting(s) found\n`)

let created = 0, skipped = 0

for (const { slug, title } of data) {
  const folderPath = path.join(IMAGES_DIR, slug)
  try {
    await access(folderPath)
    console.log(`  skip    ${slug}`)
    skipped++
  } catch {
    await mkdir(folderPath)
    console.log(`  created ${slug}  (${title})`)
    created++
  }
}

console.log(`\n${created} created, ${skipped} skipped.`)
