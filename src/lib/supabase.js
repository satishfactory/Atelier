import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
export const SERVER = (window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168.'))
  ? `http://${window.location.hostname}:3001`
  : 'https://atelier-production-836b.up.railway.app'

export function friendlyError(msg) {
  if (!msg || msg === 'Failed to fetch') return 'Could not reach the server. Make sure it is running on port 3001.'
  if (/rate.?limit/i.test(msg)) return 'Rate limit reached. Please wait a moment and try again.'
  if (/image/i.test(msg)) return 'Problem with the image. Try a smaller or different file.'
  if (/timeout/i.test(msg)) return 'The request timed out. Please try again.'
  return msg
}

// ── Paintings ────────────────────────────────────────────────
export async function getPaintings(userId, filters = {}) {
  let query = supabase
    .from('paintings')
    .select(`
      slug, title, artist, year, type, status,
      image_url, thumbnail_b64, score_overall, score_salience,
      score_gaze, score_fluency, score_emotion,
      score_complexity, score_mirror, score_colour,
      score_narrative, tags
    `)

  if (userId)         query = query.eq('user_id', userId)
  if (filters.type)   query = query.eq('type', filters.type)
  if (filters.status) query = query.eq('status', filters.status)

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
export async function getInspirations(userId, filters = {}) {
  let query = supabase
    .from('inspirations')
    .select('*')
    .eq('active', true)
    .order('intensity', { ascending: false })

  if (userId)       query = query.eq('user_id', userId)
  if (filters.type) query = query.eq('type', filters.type)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getTopInspiration(userId) {
  let query = supabase
    .from('inspirations')
    .select('title, creator, influence_note, intensity')
    .eq('active', true)
    .order('intensity', { ascending: false })
    .limit(1)
  if (userId) query = query.eq('user_id', userId)
  const { data, error } = await query.single()
  if (error) throw error
  return data
}

// ── Blog posts ───────────────────────────────────────────────
export async function getBlogPosts(userId) {
  let query = supabase
    .from('blog_posts')
    .select('id, title, status, painting_slug, word_count, full_text, created_at')
    .order('created_at', { ascending: false })
  if (userId) query = query.eq('user_id', userId)
  const { data, error } = await query
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
  const today = new Date().toISOString().split('T')[0]
  const { error } = await supabase
    .from('companion_conversations')
    .insert([
      { painting_slug: paintingSlug, role: 'user', message: userMsg, session_date: today },
      { painting_slug: paintingSlug, role: 'companion', message: companionMsg, session_date: today }
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

// ── Companion conversations ──────────────────────────────────
export async function getConversations(paintingSlug, limit = 10) {
  const { data, error } = await supabase
    .from('companion_conversations')
    .select('role, message, created_at')
    .eq('painting_slug', paintingSlug)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []).reverse()
}

// ── Add session note ─────────────────────────────────────────
export async function addSessionNote(paintingSlug, artistNote, userId) {
  const { data: existing } = await supabase
    .from('painting_sessions')
    .select('version')
    .eq('painting_slug', paintingSlug)
    .order('version', { ascending: false })
    .limit(1)
  const nextVersion = ((existing?.[0]?.version) ?? 0) + 1
  const row = { painting_slug: paintingSlug, version: nextVersion,
                artist_note: artistNote, session_date: new Date().toISOString().split('T')[0] }
  if (userId) row.user_id = userId
  const { error } = await supabase.from('painting_sessions').insert(row)
  if (error) throw error
  return nextVersion
}

// ── Update session fields ────────────────────────────────────
export async function updateSessionFields(sessionId, fields) {
  const { error } = await supabase.from('painting_sessions').update(fields).eq('id', sessionId)
  if (error) throw error
}

// ── Toggle painting visibility ───────────────────────────────
export async function setPaintingVisibility(slug, visibility) {
  const { error } = await supabase
    .from('paintings').update({ visibility }).eq('slug', slug)
  if (error) throw error
}

// ── Toggle painting status (wip / finished) ──────────────────
export async function setPaintingStatus(slug, status) {
  const { error } = await supabase
    .from('paintings').update({ status }).eq('slug', slug)
  if (error) throw error
}

// ── All conversations (both roles, asc) for journal matching ─
export async function getAllConversations(paintingSlug) {
  const { data, error } = await supabase
    .from('companion_conversations')
    .select('id, role, message, session_date, created_at')
    .eq('painting_slug', paintingSlug)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

// ── Companion journal (all companion messages, asc) ──────────
export async function getCompanionJournal(paintingSlug) {
  const { data, error } = await supabase
    .from('companion_conversations')
    .select('id, message, created_at, session_date')
    .eq('painting_slug', paintingSlug)
    .eq('role', 'companion')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

// ── Published blog posts for a painting ─────────────────────
export async function getBlogPostsForPainting(paintingSlug) {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, title, full_text, word_count, created_at, status')
    .eq('painting_slug', paintingSlug)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

// ── Artist profile ───────────────────────────────────────────
export async function getArtistProfile(userId) {
  const query = userId
    ? supabase.from('artist_profiles').select('*').eq('user_id', userId).maybeSingle()
    : supabase.from('artist_profiles').select('*').limit(1).maybeSingle()
  const { data, error } = await query
  if (error) throw error
  if (data) return data
  // Auto-create profile for new users
  if (userId) {
    const { data: created, error: cErr } = await supabase
      .from('artist_profiles').upsert({ user_id: userId, display_name: 'Artist' }, { onConflict: 'user_id', ignoreDuplicates: true }).select().maybeSingle()
    if (cErr) throw cErr
    return created
  }
  return null
}

// ── Painting images ──────────────────────────────────────────
export async function getPaintingImages(paintingSlug) {
  const { data, error } = await supabase
    .from('painting_images')
    .select('id, image_url, version_label, uploaded_at')
    .eq('painting_slug', paintingSlug)
    .order('uploaded_at', { ascending: true })
  if (error) throw error
  return data || []
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

export async function saveStudioLog(userId, { painting_slug, mood, note }) {
  const today = new Date().toISOString().split('T')[0]
  const { error } = await supabase.from('studio_states').insert({
    user_id: userId,
    painting_slug: painting_slug || null,
    state: mood,
    note,
    session_date: today,
  })
  if (error) throw error
}

export async function getLatestStudioLog(userId) {
  const { data } = await supabase
    .from('studio_states')
    .select('state, note, session_date, painting_slug')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
  return data?.[0] || null
}

// ── Media sessions (audio/video) ─────────────────────────────
export async function getMediaSessions(paintingSlug) {
  const { data: sessions, error } = await supabase
    .from('painting_sessions')
    .select('id, session_type, transcript, session_summary, duration_secs, frame_count, recorded_at, artist_note')
    .eq('painting_slug', paintingSlug)
    .in('session_type', ['audio', 'video', 'audio_video'])
    .order('recorded_at', { ascending: false })
  if (error) throw error
  if (!sessions?.length) return []

  const ids = sessions.map(s => s.id)
  const { data: frames } = await supabase
    .from('session_frames')
    .select('session_id, frame_index, frame_url, captured_at_sec')
    .in('session_id', ids)
    .order('frame_index')
  const frameMap = {}
  frames?.forEach(f => {
    if (!frameMap[f.session_id]) frameMap[f.session_id] = []
    frameMap[f.session_id].push(f)
  })
  return sessions.map(s => ({ ...s, frames: frameMap[s.id] || [] }))
}

export async function updateRollingSummary(slug, text) {
  const { error } = await supabase.from('paintings').update({ rolling_summary: text }).eq('slug', slug)
  if (error) throw error
}

// ── Public (anon) reads ──────────────────────────────────────
export async function getPublicBlogPosts() {
  const { data } = await supabase
    .from('blog_posts')
    .select('id, title, full_text, painting_slug')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(6)
  return data || []
}

export async function getPublicPaintings() {
  const { data } = await supabase
    .from('paintings')
    .select('slug, title, image_url, year, status, medium')
    .in('status', ['finished', 'masterpiece'])
    .order('year', { ascending: false })
    .limit(9)
  return data || []
}

// ── Auth ─────────────────────────────────────────────────────
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// ─── Stories ─────────────────────────────────────────────────────────────────

export async function getStories(userId, status = null) {
  let query = supabase
    .from('stories')
    .select('*')
    .order('created_at', { ascending: false })
  if (userId) query = query.eq('user_id', userId)
  if (status)  query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error
  if (!data?.length) return data

  const slugs = data.map(s => s.slug)
  const { data: media } = await supabase
    .from('story_media')
    .select('story_slug, public_url, is_cover, sort_order')
    .in('story_slug', slugs)
  const mediaMap = {}
  media?.forEach(m => {
    if (!mediaMap[m.story_slug]) mediaMap[m.story_slug] = []
    mediaMap[m.story_slug].push(m)
  })
  return data.map(s => ({ ...s, story_media: mediaMap[s.slug] || [] }))
}

export async function getStory(userId, slug) {
  let query = supabase.from('stories').select('*').eq('slug', slug)
  if (userId) query = query.eq('user_id', userId)
  const { data: story, error } = await query.single()
  if (error) throw error

  const [mediaRes, sessionsRes, blogsRes] = await Promise.all([
    supabase.from('story_media').select('*').eq('story_slug', slug).order('sort_order'),
    supabase.from('story_sessions').select('*').eq('story_slug', slug).order('session_date', { ascending: false }),
    supabase.from('story_blogs').select('*').eq('story_slug', slug).order('created_at', { ascending: false }),
  ])
  return {
    ...story,
    story_media:    mediaRes.data    || [],
    story_sessions: sessionsRes.data || [],
    story_blogs:    blogsRes.data    || [],
  }
}

export async function upsertStory(userId, story) {
  const row = { ...story }
  if (userId) row.user_id = userId
  const { data, error } = await supabase
    .from('stories')
    .upsert(row, { onConflict: 'user_id,slug' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateStory(slug, updates) {
  const { data, error } = await supabase
    .from('stories')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('slug', slug)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function addStorySession(userId, session) {
  const row = { ...session }
  if (userId) row.user_id = userId
  const { data, error } = await supabase
    .from('story_sessions')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function uploadStoryImage(userId, slug, file, sortOrder = 0) {
  const ext = file.name.split('.').pop()
  const storagePath = `${slug}/${Date.now()}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('story-images')
    .upload(storagePath, file, { contentType: file.type })
  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage
    .from('story-images')
    .getPublicUrl(storagePath)

  const row = {
    story_slug:   slug,
    storage_path: storagePath,
    public_url:   urlData.publicUrl,
    sort_order:   sortOrder,
    is_cover:     sortOrder === 0,
  }
  if (userId) row.user_id = userId

  const { data, error } = await supabase
    .from('story_media')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateStoryMediaCaption(mediaId, caption) {
  const { error } = await supabase
    .from('story_media')
    .update({ caption })
    .eq('id', mediaId)
  if (error) throw error
}

export async function saveStoryBlog(userId, storySlug, title, content) {
  const row = { story_slug: storySlug, title, content, status: 'draft' }
  if (userId) row.user_id = userId
  const { data, error } = await supabase
    .from('story_blogs')
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateStoryBlog(blogId, updates) {
  const { data, error } = await supabase
    .from('story_blogs')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', blogId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getStoryBlogsForScreen(userId) {
  let query = supabase
    .from('story_blogs')
    .select('id, title, status, story_slug, content, created_at')
    .order('created_at', { ascending: false })
  if (userId) query = query.eq('user_id', userId)
  const { data, error } = await query
  if (error) throw error
  return data
}
