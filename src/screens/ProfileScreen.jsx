import { useEffect, useState, useRef } from 'react'
import '../styles/design-system.css'
import { getArtistProfile, getPaintings, getBlogPosts, getInspirations, SERVER } from '../lib/supabase'
import PaintingCard from '../components/PaintingCard'
import MiraSettings from '../components/MiraSettings'

export default function ProfileScreen({ userId, onPaintingClick, onNavigate, onSignOut }) {
  const [profile,       setProfile]       = useState(null)
  const [paintings,     setPaintings]     = useState([])
  const [blogs,         setBlogs]         = useState([])
  const [influences,    setInfluences]    = useState([])
  const [editing,       setEditing]       = useState(false)
  const [form,          setForm]          = useState({})
  const [saving,        setSaving]        = useState(false)
  const [bioLoading,    setBioLoading]    = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    if (!userId) return
    Promise.all([
      getArtistProfile(userId),
      getPaintings(userId, { type: 'artist_work' }),
      getBlogPosts(userId),
      getInspirations(userId),
    ]).then(([prof, paints, posts, insp]) => {
      setProfile(prof)
      setPaintings(paints)
      setBlogs(posts.filter(p => p.status === 'published'))
      setInfluences(insp.slice(0, 5))
    }).catch(console.error)
  }, [userId])

  function startEdit() {
    setForm({
      display_name:         profile.display_name         || '',
      location:             profile.location             || profile.city || '',
      practice_description: profile.practice_description || profile.practice_statement || '',
      website:              profile.website              || '',
    })
    setEditing(true)
  }

  async function saveProfile() {
    setSaving(true)
    try {
      const res = await fetch(`${SERVER}/api/update-artist-profile`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, userId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setProfile(p => ({ ...p, ...form }))
      setEditing(false)
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      const b64 = ev.target.result.split(',')[1]
      const res = await fetch(`${SERVER}/api/upload-profile-photo`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: b64, userId }),
      })
      const { url, error } = await res.json()
      if (error) { alert(error); return }
      if (url) setProfile(p => ({ ...p, image_url: url }))
    }
    reader.readAsDataURL(file)
  }

  async function regenerateBio() {
    setBioLoading(true)
    try {
      const current = form.practice_description || profile.practice_description || ''
      const res = await fetch(`${SERVER}/api/evaluate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callType: 'regenerate_bio', userId, userMessage: current }),
      })
      const data = await res.json()
      if (data.response) setForm(f => ({ ...f, practice_description: data.response }))
    } catch (e) { alert(e.message) }
    finally { setBioLoading(false) }
  }

  function excerpt(text) {
    if (!text) return ''
    return text.replace(/#{1,6}\s*/g, '').replace(/[*_`]/g, '').trim().slice(0, 130)
  }

  if (!profile) return <div className="skeleton" style={{ height: 120, margin: 32, borderRadius: 8 }} />
  const finished    = paintings.filter(p => p.status === 'finished')
  const wip         = paintings.filter(p => p.status === 'wip')
  const scored      = paintings.filter(p => p.score_overall)
  const avg         = scored.length ? Math.round(scored.reduce((s, p) => s + p.score_overall, 0) / scored.length) : '—'
  const initials    = (profile.display_name || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const paintingMap = Object.fromEntries(paintings.map(p => [p.slug, p.title]))
  const paintingGrid = items => (
    <div className="gallery-grid gallery-grid--flush">
      {items.map(p => <PaintingCard key={p.slug} painting={p} onClick={() => onPaintingClick?.(p)} />)}
    </div>
  )

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 32px 100px' }}>

      {/* 1 ARTIST HEADER */}
      <section className="home-section">
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
          <div style={{ flexShrink: 0 }}>
            {profile.image_url
              ? <img src={profile.image_url} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />
              : <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--warm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 700, color: '#fff' }}>{initials}</div>
            }
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.7rem', fontWeight: 700, marginBottom: 4 }}>{profile.display_name}</h1>
            <p className="t-micro" style={{ color: 'var(--text-muted)', marginBottom: 6 }}>
              {profile.location || [profile.city, profile.country].filter(Boolean).join(', ')}
            </p>
            {(profile.practice_description || profile.practice_statement) && (
              <p className="t-small" style={{ color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.6 }}>
                {profile.practice_description || profile.practice_statement}
              </p>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button className="btn" style={{ fontSize: 12 }} onClick={startEdit}>Edit Profile</button>
              <button className="btn" style={{ fontSize: 12 }} onClick={() => fileRef.current?.click()}>Change Photo</button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhoto} />
            </div>
          </div>
        </div>

        {editing && (
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[['Name', 'display_name'], ['Location', 'location'], ['Website', 'website']].map(([label, key]) => (
              <div key={key}>
                <p className="t-micro" style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
                <input value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', fontSize: 13, padding: '7px 10px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div>
                  <p className="t-micro" style={{ color: 'var(--text-muted)' }}>Practice statement</p>
                  <p className="t-micro" style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>Regenerate rewrites this using your influences, recent evaluations and painting history.</p>
                </div>
                <button className="btn" style={{ fontSize: 11, padding: '2px 10px', minHeight: 28, flexShrink: 0, marginLeft: 12 }} onClick={regenerateBio} disabled={bioLoading}>
                  {bioLoading ? 'Writing…' : 'Regenerate ✦'}
                </button>
              </div>
              <textarea value={form.practice_description || ''} rows={3}
                onChange={e => setForm(f => ({ ...f, practice_description: e.target.value }))}
                style={{ width: '100%', fontSize: 13, padding: '7px 10px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box', resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-warm" style={{ fontSize: 12 }} onClick={saveProfile} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              <button className="btn" style={{ fontSize: 12 }} onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        )}
      </section>

      {/* 2 STATISTICS ROW */}
      <section className="home-section">
        <div style={{ display: 'flex', gap: 12 }}>
          {[['Total', paintings.length], ['WIP', wip.length], ['Finished', finished.length], ['Avg Score', avg]].map(([label, val]) => (
            <div key={label} style={{ flex: 1, textAlign: 'center', padding: '14px 8px', border: '0.5px solid var(--border)', borderRadius: 8 }}>
              <p style={{ fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-serif)', color: 'var(--warm)', marginBottom: 4 }}>{val}</p>
              <p className="t-micro" style={{ color: 'var(--text-muted)' }}>{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3 PRACTICE EVOLUTION */}
      {profile.cross_painting_summary && (
        <section className="home-section">
          <p className="t-micro home-section-label">Practice Evolution</p>
          <p className="t-small" style={{ color: 'var(--text-muted)', lineHeight: 1.8, fontStyle: 'italic',
            borderLeft: '2px solid var(--warm)', paddingLeft: 14 }}>
            {profile.cross_painting_summary}
          </p>
        </section>
      )}
      {/* 4 FINISHED WORK */}
      {finished.length > 0 && (
        <section className="home-section">
          <p className="t-micro home-section-label">Finished work</p>
          {paintingGrid(finished)}
        </section>
      )}
      {/* 4 PROCESS JOURNALS */}
      <section className="home-section">
        <p className="t-micro home-section-label">Process journals</p>
        {blogs.length === 0
          ? <p className="t-small" style={{ color: 'var(--text-muted)' }}>No published journals yet.</p>
          : blogs.map(b => (
              <div key={b.id} style={{ padding: '12px 0', borderBottom: '0.5px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <p style={{ fontSize: 13, fontWeight: 500 }}>{b.title}</p>
                  {b.word_count && <span className="t-micro" style={{ color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>{b.word_count}w</span>}
                </div>
                {excerpt(b.full_text) && (
                  <p className="t-micro" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>{excerpt(b.full_text)}…</p>
                )}
                {b.painting_slug && <span className="t-micro" style={{ color: 'var(--warm)', marginTop: 4, display: 'block' }}>{paintingMap[b.painting_slug] || b.painting_slug}</span>}
              </div>
            ))
        }
      </section>
      {/* 5 CURRENT INFLUENCES */}
      {influences.length > 0 && (
        <section className="home-section">
          <p className="t-micro home-section-label">Current influences</p>
          {influences.map(inf => (
            <div key={inf.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0', borderBottom: '0.5px solid var(--border)' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{inf.title}</p>
                {inf.creator && <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{inf.creator}</span>}
              </div>
              <span className="t-micro" style={{ padding: '2px 8px', border: '0.5px solid var(--border)', borderRadius: 99, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{inf.type}</span>
            </div>
          ))}
        </section>
      )}
      {/* 6 WIP IN PROGRESS */}
      {wip.length > 0 && (
        <section className="home-section">
          <p className="t-micro home-section-label">Works in progress</p>
          {paintingGrid(wip)}
        </section>
      )}
      {/* 7 MIRA SETTINGS */}
      <section className="home-section">
        <p className="t-micro home-section-label">Companion — Mira</p>
        <MiraSettings userId={userId} />
      </section>
      {/* 8 ADD PAINTING */}
      <section className="home-section">
        <button className="btn btn-warm" onClick={() => onNavigate?.('upload')}
          style={{ width: '100%', padding: 14, fontSize: 14 }}>+ Add Painting</button>
      </section>
    </div>
  )
}
