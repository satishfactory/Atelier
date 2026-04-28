// api/story-expand.js
// POST /api/story-expand
// Body: { story } — full story object with media, sessions, flavour fields

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function storyExpand(req, res) {
  const { story } = req.body
  if (!story) return res.status(400).json({ error: 'story object required' })

  const {
    title, trip, location, travel_dates,
    mood, artistic_ref, philosophical, sensory, moment_type,
    raw_notes, story_media = [], story_sessions = [],
  } = story

  // Prefer cover + captioned images — higher signal per token, cap at 5
  const prioritised = [
    ...story_media.filter(m => m.is_cover),
    ...story_media.filter(m => !m.is_cover && m.caption),
    ...story_media.filter(m => !m.is_cover && !m.caption),
  ]
  const imageBlocks = []
  for (const media of prioritised.slice(0, 5)) {
    if (!media.public_url) continue
    imageBlocks.push({ type: 'image', source: { type: 'url', url: media.public_url } })
    if (media.caption) {
      imageBlocks.push({ type: 'text', text: `[Photo: ${media.caption}]` })
    }
  }

  const sessionLog = [...story_sessions]
    .sort((a, b) => a.session_date.localeCompare(b.session_date))
    .map(s => `${s.session_date}: ${s.notes}`)
    .join('\n')

  const userPrompt = `
Write a rich, personal travel blog post based on this artist's raw material.

STORY: ${title}
TRIP: ${trip || ''}
LOCATION: ${location || ''}
DATES: ${travel_dates || ''}

FLAVOUR NOTES:
- Mood: ${mood || 'not specified'}
- Artistic reference: ${artistic_ref || 'not specified'}
- Philosophical thread: ${philosophical || 'not specified'}
- Sensory details: ${sensory || 'not specified'}
- Moment type: ${moment_type || 'not specified'}

RAW NOTES:
${raw_notes || 'None provided.'}

JOURNAL SESSIONS:
${sessionLog || 'None.'}

${imageBlocks.length > 0 ? 'PHOTOS: See images — weave references to specific images naturally into the text.' : ''}

Write approximately 600–900 words. Voice: personal, painterly, reflective — not a tourist guide.
Draw on the artistic and philosophical threads for depth. Use sensory details to bring the reader in.
Flow naturally — arrival, discovery, artistic resonance, reflection — no section headers.
Output only the blog text, no title, no preamble.
  `.trim()

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const stream = client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 1200,
    system: `You are the artistic companion to a serious painter and traveller. You write in a voice that is personal, reflective, and painterly — never touristic or generic. You draw on art history, philosophy, and the physical sensation of being in a place. Your prose is rich but not overwrought.`,
    messages: [
      { role: 'user', content: [...imageBlocks, { type: 'text', text: userPrompt }] },
    ],
  })

  stream.on('text', text => res.write(`data: ${JSON.stringify({ text })}\n\n`))
  stream.on('end',  ()   => { res.write('data: [DONE]\n\n'); res.end() })
  stream.on('error', err => {
    console.error('[story-expand]', err.message)
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
    res.end()
  })
}
