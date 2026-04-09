import { useState, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import '../styles/design-system.css'
import { SERVER } from '../lib/supabase'

export default function OnboardingScreen({ userId, onComplete }) {
  const [step,     setStep]     = useState(1)
  const [title,    setTitle]    = useState('')
  const [file,     setFile]     = useState(null)
  const [preview,  setPreview]  = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [response, setResponse] = useState('')
  const fileRef = useRef()

  function handleFile(e) {
    const f = e.target.files?.[0]; if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function evaluate() {
    if (!file) return
    setLoading(true)
    try {
      const b64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload  = ev => resolve(ev.target.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      // Create the painting in DB first so it appears in the studio after onboarding
      const slug = 'wip_' + (title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30) || 'untitled') + '_' + Date.now()
      await fetch(`${SERVER}/api/create-painting`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() || 'Untitled', slug, imageBase64: b64, userId }),
      })
      const res = await fetch(`${SERVER}/api/evaluate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callType: 'evaluate_painting', paintingSlug: slug, userId,
          paintingImage: b64,
          userMessage: `Please evaluate this painting. Title: ${title || 'Untitled'}.`,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setStep(3)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n\n'); buf = parts.pop()
        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          const data = JSON.parse(part.slice(6))
          if (data.delta) setResponse(prev => (prev ?? '') + data.delta)
          if (data.done) setLoading(false)
        }
      }
    } catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }

  function complete() {
    localStorage.setItem('onboarding_complete', '1')
    onComplete()
  }

  const Dot = ({ n }) => (
    <div style={{ width: 6, height: 6, borderRadius: '50%', background: step >= n ? 'var(--warm)' : 'var(--border)', transition: 'background 0.3s' }} />
  )

  const wrap = { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '40px 32px', maxWidth: 480, margin: '0 auto' }

  return (
    <div style={wrap}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 48 }}>
        <Dot n={1} /><Dot n={2} /><Dot n={3} />
      </div>

      {step === 1 && (
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.6rem', fontWeight: 700, marginBottom: 16, lineHeight: 1.2 }}>Atelier</h1>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontStyle: 'italic', color: 'var(--text-muted)', marginBottom: 12 }}>
            A private studio companion for serious artists.
          </p>
          <p className="t-small" style={{ color: 'var(--text-muted)', marginBottom: 48 }}>Not social media. Not a portfolio. A place to think.</p>
          <button className="btn btn-warm" style={{ fontSize: 15, padding: '12px 32px' }} onClick={() => setStep(2)}>Begin →</button>
        </div>
      )}

      {step === 2 && (
        <div style={{ width: '100%' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>Add a painting you're working on</h2>
          <p className="t-small" style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: 28 }}>A photo from your phone is fine.</p>

          <div onClick={() => fileRef.current?.click()} style={{ width: '100%', height: 200, border: '1px dashed var(--border)',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', overflow: 'hidden', marginBottom: 16, background: 'var(--surface)' }}>
            {preview
              ? <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <p className="t-small" style={{ color: 'var(--text-muted)' }}>Tap to choose a photo</p>
            }
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />

          <p className="t-micro" style={{ color: 'var(--text-muted)', marginBottom: 6 }}>Painting title (optional)</p>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Untitled"
            style={{ width: '100%', fontSize: 14, padding: '9px 12px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
              boxSizing: 'border-box', marginBottom: 24 }} />

          <button className="btn btn-warm" style={{ width: '100%', padding: 13, fontSize: 14 }}
            onClick={evaluate} disabled={!file || loading}>
            {loading ? 'Analysing…' : 'Upload and continue →'}
          </button>
          {loading && (
            <div style={{ marginTop: 16 }}>
              <div className="skeleton" style={{ height: 12, width: '85%', marginBottom: 10, borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 12, width: '70%', marginBottom: 10, borderRadius: 4 }} />
              <div className="skeleton" style={{ height: 12, width: '78%', borderRadius: 4 }} />
            </div>
          )}
          <p className="t-micro" style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 24, cursor: 'pointer' }}
            onClick={complete}>I'll do this later →</p>
        </div>
      )}

      {step === 3 && (
        <div style={{ width: '100%' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 700, marginBottom: 24, textAlign: 'center' }}>
            Your companion's first reading
          </h2>
          <div className="companion-response" style={{ marginBottom: 32 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{response}</ReactMarkdown>
          </div>
          <button className="btn btn-warm" style={{ width: '100%', padding: 13, fontSize: 14, marginBottom: 12 }} onClick={complete}>
            Enter your studio →
          </button>
          <p className="t-micro" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            Add this painting properly from the Evaluate tab to save future evaluations to its journal.
          </p>
        </div>
      )}
    </div>
  )
}
