// MiraSettings — configure Mira's persona per user
import { useEffect, useState } from 'react'
import { SERVER, friendlyError } from '../lib/supabase'

const STYLES      = ['warm', 'poetic', 'clinical']
const DIRECTNESS  = ['gentle', 'balanced', 'direct']
const FOCUSES     = ['process', 'emotion', 'technique', 'market']

export default function MiraSettings({ userId }) {
  const [persona, setPersona] = useState({ persona_name: 'Mira', tone_profile: { style: 'warm', directness: 'balanced', focus: 'process' }, memory_notes: '' })
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  useEffect(() => {
    fetch(`${SERVER}/api/persona/${userId}`)
      .then(r => r.json())
      .then(d => { if (d.persona) setPersona({ ...d.persona, memory_notes: d.persona.memory_notes || '' }) })
      .catch(() => {})
  }, [userId])

  function setTone(key, val) {
    setPersona(p => ({ ...p, tone_profile: { ...p.tone_profile, [key]: val } }))
  }

  async function save() {
    setSaving(true)
    try {
      const r = await fetch(`${SERVER}/api/persona`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...persona }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) { alert(friendlyError(err.message)) }
    finally { setSaving(false) }
  }

  const t = persona.tone_profile || {}

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <p className="t-micro" style={{ color: 'var(--text-muted)', marginBottom: 6 }}>Name</p>
        <input className="upload-input" value={persona.persona_name || 'Mira'}
          onChange={e => setPersona(p => ({ ...p, persona_name: e.target.value }))} />
      </div>

      {[
        ['Style', 'style', STYLES],
        ['Directness', 'directness', DIRECTNESS],
        ['Focus', 'focus', FOCUSES],
      ].map(([label, key, opts]) => (
        <div key={key}>
          <p className="t-micro" style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {opts.map(opt => (
              <button key={opt} onClick={() => setTone(key, opt)}
                style={{
                  fontSize: 12, padding: '5px 12px', borderRadius: 99, cursor: 'pointer',
                  border: '0.5px solid var(--border)',
                  background: t[key] === opt ? 'var(--warm)' : 'var(--surface)',
                  color: t[key] === opt ? '#fff' : 'var(--text)',
                  fontWeight: t[key] === opt ? 600 : 400,
                }}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div>
        <p className="t-micro" style={{ color: 'var(--text-muted)', marginBottom: 6 }}>
          Notes for Mira <span style={{ fontStyle: 'italic' }}>(things she should always remember)</span>
        </p>
        <textarea className="upload-textarea" rows={3}
          value={persona.memory_notes || ''}
          onChange={e => setPersona(p => ({ ...p, memory_notes: e.target.value }))}
          placeholder="e.g. I prefer feedback that focuses on what's working before what isn't." />
      </div>

      <button className="btn btn-warm" style={{ alignSelf: 'flex-start' }} onClick={save} disabled={saving}>
        {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}
