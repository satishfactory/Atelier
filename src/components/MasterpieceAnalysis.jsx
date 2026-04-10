// MasterpieceAnalysis — AI art-history comparison for a painting
import { useEffect, useState } from 'react'
import { SERVER, friendlyError } from '../lib/supabase'

export default function MasterpieceAnalysis({ slug, userId, paintingImageBase64 }) {
  const [data, setData]         = useState(null)   // { analysis_text, comparisons, generated_at }
  const [loading, setLoading]   = useState(true)
  const [generating, setGenerating] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch(`${SERVER}/api/masterpiece-analysis/${slug}`)
      .then(r => r.json())
      .then(d => { setData(d.analysis || null); setLoading(false) })
      .catch(() => setLoading(false))
  }, [slug])

  async function generate() {
    setGenerating(true)
    try {
      const r = await fetch(`${SERVER}/api/masterpiece-analysis`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paintingSlug: slug, userId, paintingImage: paintingImageBase64 || null }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setData({ analysis_text: d.analysis, comparisons: d.comparisons, generated_at: new Date().toISOString() })
      setExpanded(true)
    } catch (err) { alert(friendlyError(err.message)) }
    finally { setGenerating(false) }
  }

  if (loading) return null

  return (
    <div>
      {data ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span className="t-micro" style={{ color: 'var(--text-muted)' }}>
              {new Date(data.generated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" style={{ fontSize: 12 }} onClick={() => setExpanded(e => !e)}>
                {expanded ? 'Collapse' : 'Read'}
              </button>
              <button className="btn" style={{ fontSize: 12 }} onClick={generate} disabled={generating}>
                {generating ? 'Generating…' : 'Regenerate'}
              </button>
            </div>
          </div>
          {expanded && (
            <>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap', marginBottom: 16 }}>
                {data.analysis_text}
              </p>
              {data.comparisons?.length > 0 && (
                <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 12 }}>
                  <p className="t-micro" style={{ color: 'var(--warm)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>Echoes</p>
                  {data.comparisons.map((c, i) => (
                    <div key={i} style={{ marginBottom: 10 }}>
                      <p style={{ fontSize: 13, fontWeight: 500 }}>{c.title} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>— {c.artist}</span></p>
                      <p className="t-micro" style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 2 }}>{c.connection}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <p className="t-small" style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 12 }}>
            No analysis yet. Claude will compare this painting to art history and surface relevant echoes.
          </p>
          <button className="btn btn-warm" onClick={generate} disabled={generating}>
            {generating ? 'Analysing…' : 'Generate analysis'}
          </button>
        </>
      )}
    </div>
  )
}
