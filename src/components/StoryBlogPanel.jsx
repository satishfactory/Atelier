import { useState } from 'react'
import { saveStoryBlog, friendlyError, SERVER } from '../lib/supabase'
import StoryBlogEditor from './StoryBlogEditor'

export default function StoryBlogPanel({ userId, story }) {
  const [streaming, setStreaming] = useState(false)
  const [draft,     setDraft]     = useState('')
  const [blogs,     setBlogs]     = useState(story.story_blogs || [])
  const [saving,    setSaving]    = useState(false)

  async function generate() {
    setStreaming(true)
    setDraft('')
    try {
      const res = await fetch(`${SERVER}/api/story-expand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') break
          try { const p = JSON.parse(raw); if (p.text) setDraft(prev => prev + p.text) } catch {}
        }
      }
    } catch (e) { alert(friendlyError(e.message)) }
    finally { setStreaming(false) }
  }

  async function saveDraft() {
    if (!draft.trim()) return
    setSaving(true)
    try {
      const title = `${story.title} — Travel Story`
      const blog  = await saveStoryBlog(userId, story.slug, title, draft)
      setBlogs(prev => [blog, ...prev])
      setDraft('')
    } catch (e) { alert(friendlyError(e.message)) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <button className="btn btn-warm" style={{ alignSelf: 'flex-start' }}
        onClick={generate} disabled={streaming}>
        {streaming ? 'Writing…' : 'Generate Blog'}
      </button>

      {(streaming || draft) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {streaming && !draft && (
            <div>
              {[88, 72, 80].map((w, i) => (
                <div key={i} className="skeleton"
                  style={{ height: 14, width: `${w}%`, marginBottom: 10, borderRadius: 4 }} />
              ))}
            </div>
          )}
          {draft && (
            <>
              <textarea className="upload-textarea" rows={12} value={draft}
                onChange={e => setDraft(e.target.value)}
                style={{ fontFamily: 'var(--font-serif)', fontSize: '0.95rem', lineHeight: 1.8 }} />
              {!streaming && (
                <button className="btn" style={{ alignSelf: 'flex-start' }}
                  onClick={saveDraft} disabled={saving}>
                  {saving ? 'Saving…' : 'Save Draft'}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {blogs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <p className="t-micro detail-label">Saved Drafts</p>
          {blogs.map(b => (
            <StoryBlogEditor key={b.id} blog={b} media={story.story_media || []}
              onUpdate={updated => setBlogs(prev => prev.map(x => x.id === updated.id ? updated : x))} />
          ))}
        </div>
      )}
    </div>
  )
}
