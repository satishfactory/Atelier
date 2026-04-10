// LiteratureSection — art references per painting (books, articles, museums, film)
import { useEffect, useState } from 'react'
import { SERVER, friendlyError } from '../lib/supabase'

const SOURCE_LABELS = { book: 'Book', article: 'Article', museum: 'Museum', film: 'Film', other: 'Ref' }

export default function LiteratureSection({ slug, userId }) {
  const [items, setItems]       = useState([])
  const [open, setOpen]         = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState({ title: '', author: '', source_type: 'book', url: '', notes: '' })

  useEffect(() => {
    fetch(`${SERVER}/api/literature/${slug}`)
      .then(r => r.json())
      .then(d => setItems(d.items || []))
      .catch(() => {})
  }, [slug])

  function setField(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const r = await fetch(`${SERVER}/api/literature`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paintingSlug: slug, userId, ...form }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setItems(prev => [d.item, ...prev])
      setForm({ title: '', author: '', source_type: 'book', url: '', notes: '' })
      setOpen(false)
    } catch (err) { alert(friendlyError(err.message)) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this reference?')) return
    await fetch(`${SERVER}/api/literature/${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  return (
    <div>
      {items.length === 0 && !open && (
        <p className="t-small" style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 12 }}>No references yet.</p>
      )}
      {items.map(item => (
        <div key={item.id} style={{ padding: '10px 0', borderBottom: '0.5px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--warm)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                {SOURCE_LABELS[item.source_type] || 'Ref'}
              </span>
              {item.url
                ? <a href={item.url} target="_blank" rel="noreferrer" style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', textDecoration: 'underline' }}>{item.title}</a>
                : <span style={{ fontSize: 14, fontWeight: 500 }}>{item.title}</span>
              }
              {item.author && <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{item.author}</span>}
            </div>
            {item.notes && <p className="t-micro" style={{ color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.6 }}>{item.notes}</p>}
          </div>
          <button onClick={() => handleDelete(item.id)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16, padding: '0 4px', lineHeight: 1 }}>×</button>
        </div>
      ))}

      {open ? (
        <form onSubmit={handleAdd} style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input className="upload-input" placeholder="Title *" value={form.title} onChange={e => setField('title', e.target.value)} required />
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="upload-input" placeholder="Author" value={form.author} onChange={e => setField('author', e.target.value)} style={{ flex: 1 }} />
            <select value={form.source_type} onChange={e => setField('source_type', e.target.value)}
              style={{ fontSize: 13, padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}>
              {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <input className="upload-input" placeholder="URL (optional)" value={form.url} onChange={e => setField('url', e.target.value)} />
          <textarea className="upload-textarea" placeholder="Notes (optional)" rows={2} value={form.notes} onChange={e => setField('notes', e.target.value)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-warm" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add'}</button>
            <button className="btn" type="button" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn" style={{ marginTop: items.length ? 12 : 0, fontSize: 13 }} onClick={() => setOpen(true)}>+ Add reference</button>
      )}
    </div>
  )
}
