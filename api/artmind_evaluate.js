// ================================================================
// ArtMind — Server Route: evaluate.js
// Optimised architecture — all 4 optimisations included
// Bolt.new: paste this as /api/evaluate.js (server-side)
// Version 1.0 · March 2026
// PRIVATE — Contains secret recipe architecture
// ================================================================

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service key — server only, never browser
)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// ── Call type routing table ──────────────────────────────────
// Each call type fetches only what it needs.
// This saves 200-400 tokens per call vs fetching everything.
const CALL_CONFIG = {
  evaluate_painting: {
    fetch: ['wip_sessions', 'studio_state', 'painting_subject', 'recent_paintings'],
    max_tokens: 1500,
    include_image: true
  },
  companion_dialogue: {
    fetch: ['recent_dialogue', 'current_painting', 'studio_state', 'painting_subject'],
    max_tokens: 800,
    include_image: false
  },
  generate_blog: {
    fetch: ['all_wip_sessions', 'painting_subject', 'linked_inspirations', 'studio_sessions'],
    max_tokens: 3000,
    include_image: true
  },
  morning_message: {
    fetch: ['recent_paintings', 'open_wips', 'top_inspirations', 'evolution_metrics'],
    max_tokens: 400,
    include_image: false
  }
}

// ── Load static system prompt ────────────────────────────────
// Reads from prompt_parameters table if available,
// falls back to the static file.
async function loadStaticPrompt() {
  const { data, error } = await supabase
    .from('prompt_parameters')
    .select('component, content, component_order')
    .eq('active', true)
    .eq('component_type', 'static')
    .order('component_order')

  if (data && data.length > 0) {
    return data.map(p => p.content).join('\n\n')
  }

  // Fallback: load from file (Phase 1 — before prompt_parameters table is seeded)
  const promptPath = path.join(process.cwd(), 'private', 'artmind_system_prompt.txt')
  return fs.readFileSync(promptPath, 'utf-8')
}

// ── Fetch dynamic context per call type ─────────────────────
async function fetchDynamicContext(callType, userId, paintingSlug) {
  const config = CALL_CONFIG[callType]
  const context = {}

  if (config.fetch.includes('recent_paintings')) {
    const { data } = await supabase
      .from('paintings')
      .select('title, score_overall, score_emotion, score_gaze, score_mirror, status, slug')
      .eq('user_id', userId)
      .eq('type', 'artist_work')
      .order('updated_at', { ascending: false })
      .limit(5)
    context.recentPaintings = data || []
  }

  if (config.fetch.includes('wip_sessions') && paintingSlug) {
    const { data } = await supabase
      .from('painting_sessions')
      .select('version, score_overall, score_emotion, score_fluency, artist_note, what_changed, what_to_do_next, session_date')
      .eq('painting_slug', paintingSlug)
      .eq('user_id', userId)
      .order('version', { ascending: false })
      .limit(3)
    context.wipSessions = data || []
  }

  if (config.fetch.includes('all_wip_sessions') && paintingSlug) {
    const { data } = await supabase
      .from('painting_sessions')
      .select('*')
      .eq('painting_slug', paintingSlug)
      .eq('user_id', userId)
      .order('version', { ascending: true })
    context.wipSessions = data || []
  }

  if (config.fetch.includes('studio_state') && paintingSlug) {
    const { data } = await supabase
      .from('studio_states')
      .select('state, note, session_date')
      .eq('painting_slug', paintingSlug)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
    context.studioState = data?.[0] || null
  }

  if (config.fetch.includes('painting_subject') && paintingSlug) {
    const { data } = await supabase
      .from('painting_subjects')
      .select('subject_note, confirmed, revealed_in_session')
      .eq('painting_slug', paintingSlug)
      .single()
    context.paintingSubject = data || null
  }

  if (config.fetch.includes('recent_dialogue')) {
    const { data } = await supabase
      .from('companion_conversations')
      .select('role, message, session_date')
      .eq('user_id', userId)
      .eq('painting_slug', paintingSlug)
      .order('created_at', { ascending: false })
      .limit(6)
    context.recentDialogue = (data || []).reverse()
  }

  if (config.fetch.includes('linked_inspirations') && paintingSlug) {
    const { data } = await supabase
      .from('inspirations')
      .select('title, creator, type, influence_note')
      .eq('user_id', userId)
      .contains('linked_paintings', [paintingSlug])
      .limit(5)
    context.linkedInspirations = data || []
  }

  if (config.fetch.includes('top_inspirations')) {
    const { data } = await supabase
      .from('inspirations')
      .select('title, creator, type, influence_note, intensity')
      .eq('user_id', userId)
      .eq('active', true)
      .order('intensity', { ascending: false })
      .limit(3)
    context.topInspirations = data || []
  }

  if (config.fetch.includes('open_wips')) {
    const { data } = await supabase
      .from('paintings')
      .select('title, slug, score_overall, updated_at')
      .eq('user_id', userId)
      .eq('status', 'wip')
      .order('updated_at', { ascending: false })
      .limit(3)
    context.openWips = data || []
  }

  if (config.fetch.includes('evolution_metrics')) {
    const { data } = await supabase
      .from('evolution_metrics')
      .select('avg_overall, weakest_dimension, growth_edge, growth_guidance, calculated_date')
      .eq('user_id', userId)
      .order('calculated_date', { ascending: false })
      .limit(1)
    context.evolution = data?.[0] || null
  }

  // Load artist style protocol
  const { data: styleData } = await supabase
    .from('artist_style_protocols')
    .select('style_name, colour_correction, complexity_correction, salience_correction, fluency_method')
    .eq('user_id', userId)
    .limit(1)
  context.styleProtocol = styleData?.[0] || null

  return context
}

// ── Build dynamic context string ─────────────────────────────
function buildDynamicContextString(context, callType) {
  const lines = ['── CURRENT ARTIST STATE ────────────────────────────────']

  if (context.recentPaintings?.length) {
    lines.push('Recent paintings: ' +
      context.recentPaintings
        .map(p => `${p.title} (${p.score_overall})`)
        .join(', ')
    )
  }

  if (context.openWips?.length) {
    lines.push('Open WIP paintings: ' +
      context.openWips.map(p => p.title).join(', ')
    )
  }

  if (context.wipSessions?.length) {
    const latest = context.wipSessions[0]
    lines.push(`Current WIP version: ${latest.version}, overall: ${latest.score_overall}`)
    if (latest.artist_note) lines.push(`Last artist note (truncated): ${latest.artist_note.slice(0, 120)}`)
    if (latest.what_to_do_next) lines.push(`Planned next: ${latest.what_to_do_next.slice(0, 100)}`)
  }

  if (context.paintingSubject) {
    lines.push(`Confirmed painting meaning: ${context.paintingSubject.subject_note}`)
  }

  if (context.studioState) {
    lines.push(`Studio state: ${context.studioState.state}`)
    if (context.studioState.note) lines.push(`State note: ${context.studioState.note.slice(0, 80)}`)
  }

  if (context.evolution) {
    lines.push(`Growth edge: ${context.evolution.growth_edge}`)
    lines.push(`Current guidance: ${context.evolution.growth_guidance?.slice(0, 100)}`)
  }

  if (context.styleProtocol) {
    lines.push('── STYLE-SPECIFIC CORRECTIONS ──────────────────────────')
    if (context.styleProtocol.colour_correction)
      lines.push(`Colour: ${context.styleProtocol.colour_correction.slice(0, 150)}`)
    if (context.styleProtocol.complexity_correction)
      lines.push(`Complexity: ${context.styleProtocol.complexity_correction.slice(0, 150)}`)
  }

  if (context.recentDialogue?.length) {
    lines.push('── RECENT DIALOGUE ─────────────────────────────────────')
    context.recentDialogue.forEach(d => {
      lines.push(`${d.role}: ${d.message.slice(0, 150)}`)
    })
  }

  if (context.linkedInspirations?.length) {
    lines.push('── LINKED INSPIRATIONS ─────────────────────────────────')
    context.linkedInspirations.forEach(i => {
      lines.push(`${i.title} (${i.creator}): ${i.influence_note?.slice(0, 80)}`)
    })
  }

  if (context.topInspirations?.length) {
    lines.push('── TOP INSPIRATIONS ────────────────────────────────────')
    context.topInspirations.forEach(i => {
      lines.push(`${i.title} (${i.creator}, intensity ${i.intensity})`)
    })
  }

  return lines.join('\n')
}

// ── Resize image ─────────────────────────────────────────────
// Reduces image tokens by 60-70% with no quality loss for analysis
async function resizeImage(base64Image) {
  const buffer = Buffer.from(base64Image, 'base64')
  const resized = await sharp(buffer)
    .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer()
  return resized.toString('base64')
}

// ── Main handler ─────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    callType = 'evaluate_painting',
    paintingImage,       // base64 string, optional
    userMessage,         // text message from artist
    paintingSlug,        // e.g. 'satish_memory_lane'
    userId               // from Supabase auth session
  } = req.body

  if (!userId) return res.status(401).json({ error: 'Unauthorised' })
  if (!CALL_CONFIG[callType]) return res.status(400).json({ error: 'Unknown call type' })

  try {
    // STEP 1: Load static prompt (with caching)
    const staticPrompt = await loadStaticPrompt()

    // STEP 2: Fetch dynamic context (only what this call type needs)
    const context = await fetchDynamicContext(callType, userId, paintingSlug)
    const dynamicContext = buildDynamicContextString(context, callType)

    // STEP 3: Resize image if present
    let processedImage = null
    if (paintingImage && CALL_CONFIG[callType].include_image) {
      processedImage = await resizeImage(paintingImage)
    }

    // STEP 4: Build user message content
    const userContent = []
    if (processedImage) {
      userContent.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/jpeg', data: processedImage }
      })
    }
    userContent.push({ type: 'text', text: userMessage })

    // STEP 5: Call Claude API
    // Static prompt is cached — 90% cost reduction on those tokens
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: CALL_CONFIG[callType].max_tokens,
      system: [
        {
          type: 'text',
          text: staticPrompt,
          cache_control: { type: 'ephemeral' }  // PROMPT CACHING — biggest optimisation
        },
        {
          type: 'text',
          text: dynamicContext
          // Dynamic context is NOT cached — always fresh per call
        }
      ],
      messages: [{ role: 'user', content: userContent }]
    })

    const companionResponse = response.content[0].text

    // STEP 6: Save both sides of dialogue to database
    if (callType !== 'morning_message') {
      await supabase.from('companion_conversations').insert([
        {
          user_id: userId,
          painting_slug: paintingSlug,
          role: 'user',
          message: userMessage,
          language: 'en',
          session_date: new Date().toISOString().split('T')[0]
        },
        {
          user_id: userId,
          painting_slug: paintingSlug,
          role: 'companion',
          message: companionResponse,
          language: 'en',
          session_date: new Date().toISOString().split('T')[0]
        }
      ])
    }

    // STEP 7: Return ONLY the response to the browser
    // The browser never sees the system prompt, the dynamic context,
    // the API key, or anything from the database except the response.
    return res.status(200).json({
      response: companionResponse,
      callType,
      tokensUsed: response.usage
    })

  } catch (error) {
    console.error('ArtMind API error:', error)
    return res.status(500).json({ error: 'Evaluation failed' })
  }
}
