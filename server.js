import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// Alias VITE_ vars to the server-side names expected by artmind_evaluate.js
// SUPABASE_SERVICE_KEY must be set separately in .env.local
process.env.SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL

console.log('[env] SUPABASE_URL:        ', process.env.SUPABASE_URL        ? '✓ set' : '✗ missing')
console.log('[env] SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✓ set' : '✗ missing')
console.log('[env] ANTHROPIC_API_KEY:   ', process.env.ANTHROPIC_API_KEY    ? '✓ set' : '✗ missing')

import express from 'express'
import cors from 'cors'

// Dynamic import AFTER dotenv has run so env vars are set when
// artmind_evaluate.js creates the Supabase client at module level
const { default: handler } = await import('./api/artmind_evaluate.js')

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.post('/api/evaluate', async (req, res) => {
  console.log('[req] callType:', req.body?.callType, '| userId:', req.body?.userId, '| slug:', req.body?.paintingSlug)
  try {
    await handler(req, res)
  } catch (err) {
    console.error('[route error]', err)
    res.status(500).json({ error: err.message })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`ArtMind server running on http://localhost:${PORT}`)
})
