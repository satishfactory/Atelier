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
    fetch: ['painting_history', 'wip_sessions', 'studio_state', 'painting_subject', 'recent_paintings', 'evolution_metrics', 'artist_cross_summary'],
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
    fetch: ['recent_paintings', 'open_wips', 'top_inspirations', 'evolution_metrics', 'artist_cross_summary'],
    max_tokens: 500,
    include_image: false
  },
  analyse_session: {
    fetch: ['rolling_summary', 'last_session_summary'],
    max_tokens: 600,
    include_image: false
  },
  session_dialogue: {
    fetch: ['rolling_summary', 'session_transcript'],
    max_tokens: 1000,
    include_image: false
  },
  update_artist_summary: {
    fetch: ['cross_painting_summaries'],
    max_tokens: 300,
    include_image: false
  },
  regenerate_bio: {
    fetch: ['recent_paintings', 'top_inspirations'],
    max_tokens: 150,
    include_image: false
  },
  collector_brief: {
    fetch: ['rolling_summary', 'painting_history', 'painting_subject', 'top_inspirations'],
    max_tokens: 300,
    include_image: false
  },
  wip_vision_prompt: {
    fetch: [],
    max_tokens: 250,
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
    let q = supabase.from('paintings')
      .select('title, score_overall, score_emotion, score_gaze, score_mirror, status, slug')
      .eq('type', 'artist_work')
      .order('updated_at', { ascending: false }).limit(5)
    if (userId) q = q.eq('user_id', userId)
    const { data } = await q
    context.recentPaintings = data || []
  }

  if (config.fetch.includes('painting_history') && paintingSlug) {
    const { data: convData } = await supabase
      .from('companion_conversations')
      .select('message, session_date')
      .eq('painting_slug', paintingSlug)
      .eq('role', 'companion')
      .order('created_at', { ascending: false })
      .limit(5)
    context.previousEvaluations = (convData || []).reverse()

    const { data: sessData } = await supabase
      .from('painting_sessions')
      .select('version, score_overall, score_emotion, score_fluency, score_gaze, artist_note, what_changed, session_date')
      .eq('painting_slug', paintingSlug)
      .order('version', { ascending: true })
    context.allSessions = sessData || []
  }

  if (config.fetch.includes('wip_sessions') && paintingSlug) {
    const { data } = await supabase
      .from('painting_sessions')
      .select('version, score_overall, score_emotion, score_fluency, artist_note, what_changed, what_to_do_next, session_date')
      .eq('painting_slug', paintingSlug)
      .order('version', { ascending: false })
      .limit(3)
    context.wipSessions = data || []
  }

  if (config.fetch.includes('all_wip_sessions') && paintingSlug) {
    const { data } = await supabase
      .from('painting_sessions')
      .select('*')
      .eq('painting_slug', paintingSlug)
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
    let q = supabase.from('paintings')
      .select('title, slug, score_overall, updated_at')
      .eq('status', 'wip')
      .order('updated_at', { ascending: false }).limit(3)
    if (userId) q = q.eq('user_id', userId)
    const { data } = await q
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

  // Load artist style protocol — only for calls that need it
  if (['evaluate_painting', 'generate_blog'].includes(callType)) {
    const { data: styleData } = await supabase
      .from('artist_style_protocols')
      .select('style_name, colour_correction, complexity_correction, salience_correction, fluency_method')
      .eq('user_id', userId)
      .limit(1)
    context.styleProtocol = styleData?.[0] || null
  }

  // ── New: rolling summary + session context ───────────────────
  if (config.fetch.includes('rolling_summary') && paintingSlug) {
    const { data } = await supabase
      .from('paintings').select('rolling_summary, title').eq('slug', paintingSlug).single()
    context.rollingSummary = data?.rolling_summary || null
    context.paintingTitle  = data?.title || paintingSlug
  }

  if (config.fetch.includes('last_session_summary') && paintingSlug) {
    const { data } = await supabase
      .from('painting_sessions')
      .select('session_summary, recorded_at')
      .eq('painting_slug', paintingSlug)
      .not('session_summary', 'is', null)
      .order('recorded_at', { ascending: false })
      .limit(1)
    context.lastSessionSummary = data?.[0]?.session_summary || null
  }

  if (config.fetch.includes('session_transcript')) {
    // passed directly in request body — handled in main handler
  }

  if (config.fetch.includes('artist_cross_summary')) {
    try {
      const { data } = await supabase
        .from('artist_profiles')
        .select('cross_painting_summary')
        .limit(1)
        .maybeSingle()
      context.crossPaintingSummary = data?.cross_painting_summary || null
    } catch (_) {
      context.crossPaintingSummary = null
    }
  }

  if (config.fetch.includes('cross_painting_summaries')) {
    let q = supabase.from('paintings')
      .select('title, rolling_summary, score_overall, slug')
      .eq('type', 'artist_work')
      .not('rolling_summary', 'is', null)
      .order('updated_at', { ascending: false }).limit(5)
    if (userId) q = q.eq('user_id', userId)
    const { data } = await q
    context.crossPaintingSummaries = data || []
  }

  return context
}

// ── Build dynamic context string ─────────────────────────────
function buildDynamicContextString(context, callType) {
  const lines = []

  // Painting history block — prepended for evaluate_painting
  if (context.previousEvaluations !== undefined || context.allSessions !== undefined) {
    lines.push('── PAINTING HISTORY ────────────────────────────────────')

    if (context.allSessions?.length) {
      // Score progression with deltas
      const progression = context.allSessions.map((s, i) => {
        const prev = context.allSessions[i - 1]
        const delta = prev && s.score_overall != null && prev.score_overall != null
          ? (s.score_overall - prev.score_overall > 0 ? `+${s.score_overall - prev.score_overall}` : `${s.score_overall - prev.score_overall}`)
          : null
        return `v${s.version}:${s.score_overall ?? '?'}${delta ? `(${delta})` : ''}`
      }).join(' → ')
      lines.push(`Score progression: ${progression}`)

      // Per-session detail — what changed + artist note
      context.allSessions.forEach(s => {
        const parts = [`v${s.version}`]
        if (s.what_changed) parts.push(`changed: ${s.what_changed.slice(0, 80)}`)
        if (s.artist_note)  parts.push(`note: ${s.artist_note.slice(0, 80)}`)
        if (parts.length > 1) lines.push(parts.join(' | '))
      })

      // Key dimension changes (first vs last session)
      const first = context.allSessions[0]
      const last  = context.allSessions[context.allSessions.length - 1]
      if (context.allSessions.length > 1 && first !== last) {
        const dims = ['score_emotion', 'score_fluency', 'score_gaze']
        const changes = dims
          .filter(d => first[d] != null && last[d] != null && first[d] !== last[d])
          .map(d => {
            const diff = last[d] - first[d]
            return `${d.replace('score_', '')} ${diff > 0 ? `+${diff}` : diff}`
          })
        if (changes.length) lines.push(`Dimension shifts (v1→latest): ${changes.join(', ')}`)
      }
    }

    // Last 2 companion evaluations — enough for "last time I said X"
    if (context.previousEvaluations?.length) {
      lines.push('Recent companion evaluations:')
      context.previousEvaluations.slice(-2).forEach((e, i) => {
        const label = i === context.previousEvaluations.slice(-2).length - 1 ? 'Most recent' : 'Previous'
        lines.push(`  [${label} — ${e.session_date}]: ${e.message.slice(0, 250)}`)
      })
    }

    if (context.paintingSubject?.subject_note) {
      lines.push(`Artist confirmed meaning: ${context.paintingSubject.subject_note}`)
    }
    lines.push('')
  }

  lines.push('── CURRENT ARTIST STATE ────────────────────────────────')

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
    lines.push(`Current WIP: v${latest.version}, overall: ${latest.score_overall}`)
    if (context.wipSessions.length > 1) {
      const progression = [...context.wipSessions].reverse()
        .map(s => `v${s.version}:${s.score_overall ?? '?'}`)
        .join(' → ')
      lines.push(`Recent progression: ${progression}`)
    }
    if (latest.artist_note) lines.push(`Last artist note: ${latest.artist_note.slice(0, 120)}`)
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

  if (context.crossPaintingSummary) {
    lines.push('── CROSS-PAINTING PATTERNS ─────────────────────────────')
    lines.push(context.crossPaintingSummary)
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

  if (context.rollingSummary) {
    lines.push('── ROLLING STUDIO SUMMARY ──────────────────────────────')
    lines.push(context.rollingSummary)
  }

  if (context.lastSessionSummary) {
    lines.push('── LAST SESSION SUMMARY ────────────────────────────────')
    lines.push(context.lastSessionSummary)
  }

  if (context.sessionTranscript) {
    lines.push('── NEW SESSION TRANSCRIPT ──────────────────────────────')
    lines.push(context.sessionTranscript)
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
    paintingImage,       // base64 string, optional (first image, backwards compat)
    paintingImages,      // base64 array, optional (multi-photo)
    userMessage,         // text message from artist
    paintingSlug,        // e.g. 'satish_memory_lane'
    userId,              // from Supabase auth session
    sessionId,           // for analyse_session / session_dialogue
    transcript,          // raw transcript from Whisper
    frameUrls,           // array of Supabase Storage URLs
    paintingImageUrl,    // public Supabase Storage URL for wip_vision_prompt
  } = req.body

  // analyse_session and session_dialogue don't need userId
  const requiresAuth = !['analyse_session', 'session_dialogue'].includes(callType)
  if (requiresAuth && !userId) return res.status(401).json({ error: 'Unauthorised' })
  if (!CALL_CONFIG[callType]) return res.status(400).json({ error: 'Unknown call type' })

  try {
    // STEP 1: Load static prompt (with caching)
    const staticPrompt = await loadStaticPrompt()

    // STEP 2: Fetch dynamic context (only what this call type needs)
    const context = await fetchDynamicContext(callType, userId, paintingSlug)
    // Inject session-specific data for new call types
    if (transcript) context.sessionTranscript = transcript
    const dynamicContext = buildDynamicContextString(context, callType)

    // STEP 3: Resize images if present
    const processedImages = []
    if (CALL_CONFIG[callType].include_image) {
      const imagesToProcess = paintingImages?.length ? paintingImages : paintingImage ? [paintingImage] : []
      for (const img of imagesToProcess) {
        processedImages.push(await resizeImage(img))
      }
    }

    // STEP 4: Build user message content
    const userContent = []
    for (const img of processedImages) {
      userContent.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: img } })
    }
    userContent.push({ type: 'text', text: userMessage || 'Please evaluate this painting.' })

    // STEP 5+: Stream for evaluate_painting / companion_dialogue; batch for the rest
    const systemBlocks = [
      { type: 'text', text: staticPrompt, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: dynamicContext }
    ]
    const modelParams = {
      model: 'claude-sonnet-4-6',
      max_tokens: CALL_CONFIG[callType].max_tokens,
      system: systemBlocks,
      messages: [{ role: 'user', content: userContent }]
    }
    const today = new Date().toISOString().split('T')[0]

    // ── analyse_session — non-streaming, saves summary + rolling summary ──
    if (callType === 'analyse_session') {
      // Add frame images to user content
      if (frameUrls?.length) {
        for (const url of frameUrls.slice(0, 3)) {
          userContent.push({ type: 'image', source: { type: 'url', url } })
        }
      }
      const prompt = `This artist just recorded a studio session. Transcript:\n\n"${transcript || '(no transcript)'}"\n\nWrite a concise session summary (max 150 words) capturing: what the artist said about their process, any problems or breakthroughs mentioned, and one specific growth edge. Tone: observational, not evaluative.`
      userContent.push({ type: 'text', text: prompt })
      const apiResp = await anthropic.messages.create(modelParams)
      const summary = apiResp.content[0].text
      // Save session_summary
      if (sessionId) {
        await supabase.from('painting_sessions').update({ session_summary: summary }).eq('id', sessionId)
      }
      // Update rolling_summary on painting
      if (paintingSlug) {
        const { data: p } = await supabase.from('paintings').select('title, rolling_summary').eq('slug', paintingSlug).single()
        const newRolling = `${p?.title || paintingSlug} — Last session: ${summary.slice(0, 300)}`
        await supabase.from('paintings').update({ rolling_summary: newRolling }).eq('slug', paintingSlug)
      }
      return res.status(200).json({ summary, tokensUsed: apiResp.usage })
    }

    // ── session_dialogue — streaming, saves to companion_conversations ──
    if (callType === 'session_dialogue') {
      if (frameUrls?.length) {
        for (const url of frameUrls) {
          userContent.push({ type: 'image', source: { type: 'url', url } })
        }
      }
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')
      let fullText = ''
      const stream = anthropic.messages.stream(modelParams)
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
          fullText += chunk.delta.text
          res.write(`data: ${JSON.stringify({ delta: chunk.delta.text })}\n\n`)
        }
      }
      const final = await stream.finalMessage()
      if (userId && paintingSlug) {
        await supabase.from('companion_conversations').insert([
          { user_id: userId, painting_slug: paintingSlug, role: 'user',      message: userMessage, session_date: today },
          { user_id: userId, painting_slug: paintingSlug, role: 'companion', message: fullText,     session_date: today }
        ])
      }
      res.write(`data: ${JSON.stringify({ done: true, tokensUsed: final.usage })}\n\n`)
      res.end()
      return
    }

    if (callType === 'evaluate_painting' || callType === 'companion_dialogue') {
      // ── Streaming response ──────────────────────────────
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      let fullText = ''
      const stream = anthropic.messages.stream(modelParams)

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
          fullText += chunk.delta.text
          res.write(`data: ${JSON.stringify({ delta: chunk.delta.text })}\n\n`)
        }
      }

      const final = await stream.finalMessage()
      await supabase.from('companion_conversations').insert([
        { user_id: userId, painting_slug: paintingSlug, role: 'user',      message: userMessage, language: 'en', session_date: today },
        { user_id: userId, painting_slug: paintingSlug, role: 'companion', message: fullText,    language: 'en', session_date: today }
      ])

      // ── Score extraction — runs before done event so UI gets scores immediately ──
      let scores = null
      if (callType === 'evaluate_painting' && paintingSlug && userId) {
        try {
          const extractResp = await anthropic.messages.create({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 200,
            messages: [{
              role: 'user',
              content: `Extract numerical scores from this painting evaluation. Return ONLY valid JSON with these exact keys (integers 0-100, estimate if not explicit):
{"score_salience":0,"score_gaze":0,"score_fluency":0,"score_emotion":0,"score_complexity":0,"score_mirror":0,"score_colour":0,"score_narrative":0,"score_overall":0}

EVALUATION:
${fullText.slice(0, 3000)}`
            }]
          })
          const raw = extractResp.content[0].text.match(/\{[\s\S]*\}/)
          if (raw) {
            scores = JSON.parse(raw[0])
            // Persist async — don't block done event
            setImmediate(async () => {
              try {
                const { data: sessions } = await supabase
                  .from('painting_sessions').select('version').eq('painting_slug', paintingSlug).order('version', { ascending: false }).limit(1)
                const nextVersion = sessions?.[0] ? sessions[0].version + 1 : 1
                await Promise.all([
                  supabase.from('paintings').update({ ...scores, evaluated_at: new Date().toISOString() }).eq('slug', paintingSlug),
                  supabase.from('painting_sessions').insert({
                    user_id: userId, painting_slug: paintingSlug, version: nextVersion,
                    session_date: today, artist_note: userMessage || null, ...scores
                  }),
                  supabase.from('score_history').insert({
                    user_id: userId, painting_slug: paintingSlug, session_version: nextVersion,
                    evaluated_at: new Date().toISOString(), ...scores
                  }),
                ])
              } catch (e) { console.error('score persist failed:', e.message) }
            })
          }
        } catch (e) { console.error('score extraction failed:', e.message) }

        // ── Text section extraction — async, non-blocking ──
        if (paintingSlug && userId) {
          setImmediate(async () => {
            try {
              const textResp = await anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 400,
                messages: [{ role: 'user', content: `Extract these four sections from the painting evaluation below. Return ONLY valid JSON with these exact keys (string values, 1-3 sentences each, null if not present):
{"viewer_experience":null,"market_positioning":null,"appraisal_develop":null,"appraisal_strengths":null}

viewer_experience = how a viewer reads/experiences the painting formally
market_positioning = positioning, influences, references, or collector appeal
appraisal_develop = what needs development or process notes
appraisal_strengths = overall strengths or summary

EVALUATION:
${fullText.slice(0, 3000)}` }]
              })
              const raw = textResp.content[0].text.match(/\{[\s\S]*\}/)
              if (raw) {
                const textFields = JSON.parse(raw[0])
                await supabase.from('paintings').update(textFields).eq('slug', paintingSlug)
              }
            } catch (e) { console.error('text extraction failed:', e.message) }
          })
        }
      }

      res.write(`data: ${JSON.stringify({ done: true, tokensUsed: final.usage, scores })}\n\n`)
      res.end()
      return
    }

    // ── update_artist_summary — cross-painting synthesis + evolution metrics ──
    if (callType === 'update_artist_summary') {
      const paintings = context.crossPaintingSummaries || []
      if (!paintings.length) return res.status(200).json({ skipped: 'no rolling summaries yet' })

      const prompt = `You are an observant companion watching an artist across multiple paintings. Based on these recent painting summaries, write a concise 150-word cross-painting observation. Focus on: recurring struggles, emerging strengths, stylistic patterns the artist may not see themselves. Be specific. Do not repeat what is already in the individual summaries.

PAINTING SUMMARIES:
${paintings.map(p => `${p.title} (score: ${p.score_overall ?? '?'}): ${p.rolling_summary}`).join('\n\n')}

Write only the observation paragraph. No headings.`

      userContent[0] = { type: 'text', text: prompt }
      const apiResp = await anthropic.messages.create({ ...modelParams, messages: [{ role: 'user', content: userContent }] })
      const summary = apiResp.content[0].text

      await supabase.from('artist_profiles').update({ cross_painting_summary: summary }).not('id', 'is', null)

      // Refresh evolution_metrics from painting scores
      const scores = paintings.map(p => p.score_overall).filter(s => s != null)
      if (scores.length && userId) {
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        const today = new Date().toISOString().split('T')[0]
        const { data: existing } = await supabase.from('evolution_metrics').select('id').eq('user_id', userId).limit(1).single()
        const metricsRow = { user_id: userId, avg_overall: avg, growth_edge: summary.slice(0, 120), growth_guidance: summary, calculated_date: today }
        if (existing) {
          await supabase.from('evolution_metrics').update(metricsRow).eq('id', existing.id)
        } else {
          await supabase.from('evolution_metrics').insert(metricsRow)
        }
      }

      return res.status(200).json({ summary, tokensUsed: apiResp.usage })
    }

    // ── regenerate_bio — short non-streaming bio rewrite ──
    if (callType === 'regenerate_bio') {
      const titles = (context.recentPaintings || []).map(p => p.title).join(', ')
      const insp   = (context.topInspirations || []).map(i => i.title).join(', ')
      const current = userMessage ? `Current statement to improve: "${userMessage}"\n\n` : ''
      const prompt = `${current}Write a 2-sentence artist practice statement. Be specific — mention medium, approach, what drives the work. No generic phrases. No intro text.

Recent paintings: ${titles || 'not available'}
Key influences: ${insp || 'not available'}

Return only the statement.`
      userContent[0] = { type: 'text', text: prompt }
      const apiResp = await anthropic.messages.create({ ...modelParams, messages: [{ role: 'user', content: userContent }] })
      return res.status(200).json({ response: apiResp.content[0].text, tokensUsed: apiResp.usage })
    }

    // ── collector_brief — structured: brief + market value ──
    if (callType === 'collector_brief') {
      const title   = context.paintingTitle || paintingSlug
      const subject = context.paintingSubject?.subject_note
      const insp    = (context.topInspirations || []).map(i => i.title).join(', ')
      const lastSess = context.allSessions?.[context.allSessions.length - 1]
      const prompt  = `Write a collector brief for "${title}" as raw JSON only — no markdown, no code fences, start with { end with }:
{"brief":"150-word collector description — what the work is about, what makes it technically accomplished, why it belongs in a serious collection. Be specific, no generic filler.","market_value":"$X,000 – $X,000 USD","value_rationale":"1 sentence: why this range, referencing size, score, or body-of-work stage"}

Context:${subject ? ` Artist intention: ${subject}.` : ''}${insp ? ` Influences: ${insp}.` : ''}${lastSess?.score_overall ? ` Overall score: ${lastSess.score_overall}/100.` : ''}`
      userContent[0] = { type: 'text', text: prompt }
      const apiResp = await anthropic.messages.create({ ...modelParams, max_tokens: 400, messages: [{ role: 'user', content: userContent }] })
      const raw = apiResp.content[0].text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
      try {
        const parsed = JSON.parse(raw)
        return res.status(200).json({ response: parsed, tokensUsed: apiResp.usage })
      } catch (_) {
        return res.status(200).json({ response: { brief: raw, market_value: null, value_rationale: null }, tokensUsed: apiResp.usage })
      }
    }

    // ── wip_vision_prompt — describe WIP for DALL-E 3 generation ──
    if (callType === 'wip_vision_prompt') {
      const content = []
      if (paintingImageUrl) {
        content.push({ type: 'image', source: { type: 'url', url: paintingImageUrl } })
      }
      content.push({ type: 'text', text: 'Analyze this WIP painting. Write a DALL-E 3 generation prompt (max 120 words) describing what it could look like when fully realized — same composition and artist\'s style, but complete. Describe: medium, key colors, textures, mark-making quality, atmosphere. Return only the prompt text, no explanation.' })
      const apiResp = await anthropic.messages.create({ ...modelParams, messages: [{ role: 'user', content }] })
      return res.status(200).json({ response: apiResp.content[0].text.trim(), tokensUsed: apiResp.usage })
    }

    // ── morning_message — structured briefing + daily challenge ──
    if (callType === 'morning_message') {
      const promptWithFormat = `${userMessage}\n\nReturn ONLY raw JSON — no markdown, no code fences, no backticks, no explanation. Start your response with { and end with }:\n{"briefing":"2–3 sentence personal studio briefing referencing specific paintings","challenge":"One specific creative task for today — concrete and actionable, max 20 words"}`
      userContent[0] = { type: 'text', text: promptWithFormat }
      const apiResp = await anthropic.messages.create({ ...modelParams, messages: [{ role: 'user', content: userContent }] })
      return res.status(200).json({ response: apiResp.content[0].text, tokensUsed: apiResp.usage })
    }

    // ── Non-streaming (generate_blog) ───
    const apiResponse = await anthropic.messages.create(modelParams)
    const companionResponse = apiResponse.content[0].text

    if (callType !== 'morning_message') {
      await supabase.from('companion_conversations').insert([
        { user_id: userId, painting_slug: paintingSlug, role: 'user',      message: userMessage, language: 'en', session_date: today },
        { user_id: userId, painting_slug: paintingSlug, role: 'companion', message: companionResponse, language: 'en', session_date: today }
      ])
    }

    return res.status(200).json({
      response: companionResponse,
      callType,
      tokensUsed: apiResponse.usage
    })

  } catch (error) {
    console.error('ArtMind API error:', error)
    return res.status(500).json({ error: error.message, stack: error.stack })
  }
}
