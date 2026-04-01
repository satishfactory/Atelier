import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Paintings ────────────────────────────────────────────────
export async function getPaintings(userId, filters = {}) {
  let query = supabase
    .from('paintings')
    .select(`
      slug, title, artist, year, type,
      image_url, thumbnail_b64, score_overall, score_salience,
      score_gaze, score_fluency, score_emotion,
      score_complexity, score_mirror, score_colour,
      score_narrative, tags
    `)

  if (filters.type) query = query.eq('type', filters.type)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getPainting(slug) {
  const { data, error } = await supabase
    .from('paintings')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) throw error
  return data
}

// ── WIP Sessions ─────────────────────────────────────────────
export async function getSessions(paintingSlug) {
  const { data, error } = await supabase
    .from('painting_sessions')
    .select('*')
    .eq('painting_slug', paintingSlug)
    .order('version', { ascending: false })
  if (error) throw error
  return data
}

// ── Inspirations ─────────────────────────────────────────────
export async function getInspirations(filters = {}) {
  let query = supabase
    .from('inspirations')
    .select('*')
    .eq('active', true)
    .order('intensity', { ascending: false })

  if (filters.type) query = query.eq('type', filters.type)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getTopInspiration() {
  const { data, error } = await supabase
    .from('inspirations')
    .select('title, creator, influence_note, intensity')
    .eq('active', true)
    .order('intensity', { ascending: false })
    .limit(1)
    .single()
  if (error) throw error
  return data
}

// ── Blog posts ───────────────────────────────────────────────
export async function getBlogPosts() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, subtitle, status, published_date, painting_slug, word_count')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ── Companion conversations ──────────────────────────────────
export async function getRecentDialogue(paintingSlug, limit = 6) {
  const { data, error } = await supabase
    .from('companion_conversations')
    .select('role, message, session_date')
    .eq('painting_slug', paintingSlug)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data.reverse()
}

export async function saveDialogue(userId, paintingSlug, userMsg, companionMsg) {
  const { error } = await supabase
    .from('companion_conversations')
    .insert([
      { user_id: userId, painting_slug: paintingSlug,
        role: 'user', message: userMsg },
      { user_id: userId, painting_slug: paintingSlug,
        role: 'companion', message: companionMsg }
    ])
  if (error) throw error
}

// ── Painting subject ─────────────────────────────────────────
export async function getPaintingSubject(paintingSlug) {
  const { data } = await supabase
    .from('painting_subjects')
    .select('subject_note, confirmed')
    .eq('painting_slug', paintingSlug)
    .single()
  return data
}

// ── Artist profile ───────────────────────────────────────────
export async function getArtistProfile() {
  const { data, error } = await supabase
    .from('artist_profiles')
    .select('display_name, bio_short, bio_long, practice_statement, city, country, featured_slugs')
    .limit(1)
    .single()
  if (error) throw error
  return data
}

// ── Studio state ─────────────────────────────────────────────
export async function getStudioState(paintingSlug) {
  const { data } = await supabase
    .from('studio_states')
    .select('state, note, session_date')
    .eq('painting_slug', paintingSlug)
    .order('created_at', { ascending: false })
    .limit(1)
  return data?.[0] || null
}

export async function setStudioState(userId, paintingSlug, state, note = '') {
  const { error } = await supabase
    .from('studio_states')
    .insert({ user_id: userId, painting_slug: paintingSlug, state, note })
  if (error) throw error
}
