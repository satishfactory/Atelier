// Backfill viewer_experience, market_positioning, appraisal_develop, appraisal_strengths
// Reads existing companion_conversations — no new evaluations needed
// Run: node scripts/backfill_text_fields.js

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function extractTextFields(evaluationText) {
  const resp = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{ role: 'user', content: `Extract these four sections from the painting evaluation below. Return ONLY valid JSON with these exact keys (string values, 1-3 sentences each, null if not present):
{"viewer_experience":null,"market_positioning":null,"appraisal_develop":null,"appraisal_strengths":null}

viewer_experience = how a viewer reads/experiences the painting formally
market_positioning = positioning, influences, references, or collector appeal
appraisal_develop = what needs development or process notes
appraisal_strengths = overall strengths or summary

EVALUATION:
${evaluationText.slice(0, 3000)}` }]
  })
  const raw = resp.content[0].text.match(/\{[\s\S]*\}/)
  if (!raw) throw new Error('No JSON in response')
  return JSON.parse(raw[0])
}

async function run() {
  // Get all paintings
  const { data: paintings, error } = await supabase.from('paintings').select('slug, title, viewer_experience')
  if (error) throw error

  const toBackfill = paintings.filter(p => !p.viewer_experience)
  console.log(`Found ${paintings.length} paintings. ${toBackfill.length} need backfill.`)

  for (const painting of toBackfill) {
    // Get latest companion evaluation for this painting
    const { data: convs } = await supabase
      .from('companion_conversations')
      .select('message')
      .eq('painting_slug', painting.slug)
      .eq('role', 'companion')
      .order('created_at', { ascending: false })
      .limit(1)

    if (!convs?.length || !convs[0].message) {
      console.log(`  ⚠️  ${painting.title} — no evaluation found, skipping`)
      continue
    }

    try {
      const fields = await extractTextFields(convs[0].message)
      await supabase.from('paintings').update(fields).eq('slug', painting.slug)
      console.log(`  ✅  ${painting.title}`)
    } catch (e) {
      console.log(`  ❌  ${painting.title} — ${e.message}`)
    }

    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500))
  }

  console.log('Done.')
}

run().catch(console.error)
