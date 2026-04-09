import { useState } from 'react'
import { SERVER, friendlyError } from '../lib/supabase'
import PaintingCard from './PaintingCard'

export default function CollectorBrief({ userId, slug, onPaintingClick }) {
  const [data,       setData]       = useState(null)
  const [loading,    setLoading]    = useState(false)
  const [editing,    setEditing]    = useState(false)
  const [editText,   setEditText]   = useState('')
  const [similar,    setSimilar]    = useState(null)
  const [simLoading, setSimLoading] = useState(false)

  async function generate() {
    setLoading(true)
    try {
      const res = await fetch(`${SERVER}/api/evaluate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callType: 'collector_brief', paintingSlug: slug, userId, userMessage: 'Generate collector brief' }),
      })
      const json = await res.json()
      if (json.response) setData(json.response)
    } catch (e) { alert(friendlyError(e.message)) }
    finally { setLoading(false) }
  }

  async function findSimilar() {
    setSimLoading(true)
    try {
      const res = await fetch(`${SERVER}/api/similar-paintings/${slug}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setSimilar(json.paintings || [])
    } catch (e) { alert(friendlyError(e.message)) }
    finally { setSimLoading(false) }
  }

  if (!data) {
    return (
      <button className="btn" style={{ fontSize: 12 }} onClick={generate} disabled={loading}>
        {loading ? 'Writing brief…' : 'Generate collector brief →'}
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>

      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea className="upload-textarea" rows={7} value={editText}
            onChange={e => setEditText(e.target.value)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-warm" style={{ fontSize: 12 }}
              onClick={() => { setData(prev => ({ ...prev, brief: editText })); setEditing(false) }}>
              Save
            </button>
            <button className="btn" style={{ fontSize: 12 }} onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '0.95rem', lineHeight: 1.8, color: 'var(--text)' }}>
            {data.brief}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <button className="btn" style={{ fontSize: 11 }}
              onClick={() => { setEditText(data.brief); setEditing(true) }}>Edit</button>
            <button className="btn" style={{ fontSize: 11 }} onClick={() => { setData(null); setSimilar(null) }}>Regenerate</button>
          </div>
        </div>
      )}

      {data.market_value && !editing && (
        <div style={{ padding: '8px 12px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border)' }}>
          <p className="t-micro" style={{ color: 'var(--warm)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
            Suggested value
          </p>
          <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)', marginBottom: data.value_rationale ? 3 : 0 }}>
            {data.market_value}
          </p>
          {data.value_rationale && (
            <p className="t-micro" style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>{data.value_rationale}</p>
          )}
        </div>
      )}

      {!editing && (
        <div>
          {!similar && (
            <button className="btn" style={{ fontSize: 11 }} onClick={findSimilar} disabled={simLoading}>
              {simLoading ? 'Searching…' : 'Find similar paintings →'}
            </button>
          )}
          {similar?.length > 0 && (
            <div>
              <p className="t-micro" style={{ color: 'var(--warm)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Similar works
              </p>
              <div className="gallery-grid gallery-grid--flush">
                {similar.map(p => (
                  <PaintingCard key={p.slug} painting={p} onClick={() => onPaintingClick?.(p)} />
                ))}
              </div>
            </div>
          )}
          {similar?.length === 0 && (
            <p className="t-micro" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No similar paintings found yet — evaluate more paintings to build the network.
            </p>
          )}
        </div>
      )}

    </div>
  )
}
