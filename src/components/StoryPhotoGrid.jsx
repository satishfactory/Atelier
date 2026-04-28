import { useRef, useState } from 'react'
import { uploadStoryImage, updateStoryMediaCaption, friendlyError } from '../lib/supabase'

export default function StoryPhotoGrid({ userId, story, onMediaChange }) {
  const [media,     setMedia]     = useState(() =>
    [...(story.story_media || [])].sort((a, b) => a.sort_order - b.sort_order)
  )
  const [uploading, setUploading] = useState({})
  const fileRef = useRef(null)

  async function handleFiles(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const base = media.length
    for (let i = 0; i < files.length; i++) {
      const sortOrder = base + i
      setUploading(prev => ({ ...prev, [sortOrder]: true }))
      try {
        const row = await uploadStoryImage(userId, story.slug, files[i], sortOrder)
        setMedia(prev => {
          const next = [...prev, row].sort((a, b) => a.sort_order - b.sort_order)
          onMediaChange?.(next)
          return next
        })
      } catch (err) { alert(friendlyError(err.message)) }
      finally { setUploading(prev => ({ ...prev, [sortOrder]: false })) }
    }
    e.target.value = ''
  }

  async function saveCaption(id, caption) {
    try { await updateStoryMediaCaption(id, caption) }
    catch (err) { alert(friendlyError(err.message)) }
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        {media.map(m => (
          <div key={m.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 120 }}>
            <img src={m.public_url} alt=""
              style={{ width: 120, height: 90, objectFit: 'cover',
                borderRadius: 'var(--radius-sm)', border: m.is_cover ? '2px solid var(--warm)' : '0.5px solid var(--border)',
                display: 'block' }} />
            <input
              defaultValue={m.caption || ''}
              onBlur={e => saveCaption(m.id, e.target.value)}
              placeholder="Caption…"
              style={{ width: '100%', fontSize: 11, fontFamily: 'var(--font-sans)', padding: '3px 6px',
                border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
                background: 'var(--surface)', color: 'var(--text)' }} />
          </div>
        ))}
        {Object.entries(uploading).filter(([, v]) => v).map(([k]) => (
          <div key={k} className="skeleton"
            style={{ width: 120, height: 90, borderRadius: 'var(--radius-sm)' }} />
        ))}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={handleFiles} />
      <button className="btn" style={{ marginTop: 'var(--space-3)', fontSize: 12 }}
        onClick={() => fileRef.current.click()}>
        + Add Photos
      </button>
    </div>
  )
}
