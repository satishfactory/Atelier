import { useState } from 'react'
import { SERVER, friendlyError } from '../lib/supabase'

export default function WipVision({ userId, slug }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)

  async function generate() {
    setLoading(true)
    try {
      const res = await fetch(`${SERVER}/api/wip-vision`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paintingSlug: slug, userId }),
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
    } catch (e) { alert(friendlyError(e.message)) }
    finally { setLoading(false) }
  }

  if (!data) {
    return (
      <button className="btn" style={{ fontSize: 12 }} onClick={generate} disabled={loading}>
        {loading ? 'Envisioning completion…' : 'Envision completed work →'}
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <img
        src={data.imageUrl}
        alt="AI vision of completed painting"
        style={{ width: '100%', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border)' }}
      />
      <p className="t-micro" style={{ color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.6 }}>
        {data.prompt}
      </p>
      <button className="btn" style={{ fontSize: 11 }} onClick={() => setData(null)}>
        Regenerate
      </button>
    </div>
  )
}
