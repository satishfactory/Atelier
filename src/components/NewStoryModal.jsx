import { useState } from 'react'
import { upsertStory, friendlyError } from '../lib/supabase'

const INPUT_STYLE = {
  width: '100%', fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
  padding: '8px 12px', borderRadius: 'var(--radius-sm)',
  border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
}

function makeSlug(t) {
  return t.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

export default function NewStoryModal({ userId, onCreated, onClose }) {
  const [title,    setTitle]    = useState('')
  const [trip,     setTrip]     = useState('')
  const [location, setLocation] = useState('')
  const [saving,   setSaving]   = useState(false)

  async function create() {
    if (!title.trim()) return
    setSaving(true)
    try {
      const slug = makeSlug(title)
      const story = await upsertStory(userId, {
        slug,
        title:    title.trim(),
        trip:     trip.trim()     || null,
        location: location.trim() || null,
        status:   'wip',
      })
      onCreated(story.slug)
    } catch (e) { alert(friendlyError(e.message)) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(30,30,28,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}
      onClick={onClose}>
      <div className="card" style={{ width: '100%', maxWidth: 480,
        display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        onClick={e => e.stopPropagation()}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 400 }}>New Story</h2>

        {[['Title *', title, setTitle], ['Trip', trip, setTrip], ['Location', location, setLocation]].map(([label, val, set]) => (
          <div key={label}>
            <p className="t-micro" style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
            <input value={val} onChange={e => set(e.target.value)}
              style={INPUT_STYLE} onKeyDown={e => e.key === 'Enter' && create()} />
          </div>
        ))}

        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-warm" onClick={create}
            disabled={!title.trim() || saving}>
            {saving ? 'Creating…' : 'Create Story'}
          </button>
        </div>
      </div>
    </div>
  )
}
