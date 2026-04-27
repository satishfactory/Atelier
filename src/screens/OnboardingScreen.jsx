import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import '../styles/design-system.css'
import { SERVER } from '../lib/supabase'
import HowItWorks from '../components/HowItWorks'
import PhotoStrip from '../components/PhotoStrip'

export default function OnboardingScreen({ userId, onComplete }) {
  const [step,     setStep]     = useState(1)
  const [title,    setTitle]    = useState('')
  const [files,    setFiles]    = useState([])
  const [loading,  setLoading]  = useState(false)
  const [response, setResponse] = useState('')

  function complete() {
    localStorage.setItem('onboarding_complete', '1')
    onComplete()
  }

  async function evaluate() {
    if (!files.length) return
    setLoading(true)
    try {
      const primary = files[0]
      const b64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload  = ev => resolve(ev.target.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(primary)
      })

      const slug = 'wip_' + (title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30) || 'untitled') + '_' + Date.now()

      await fetch(`${SERVER}/api/create-painting`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() || 'Untitled', slug, imageBase64: b64, userId }),
      })

      // Upload extra photos if any
      for (let i = 1; i < files.length; i++) {
        const xb64 = await new Promise((res, rej) => {
          const r = new FileReader()
          r.onload  = ev => res(ev.target.result.split(',')[1])
          r.onerror = rej
          r.readAsDataURL(files[i])
        })
        await fetch(`${SERVER}/api/add-painting-image`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paintingSlug: slug, imageBase64: xb64, userId, versionLabel: `Photo ${i + 1}` }),
        }).catch(() => {})
      }

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

  const wrap = { minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }
  const inner = { maxWidth: 480, margin: '0 auto', padding: '40px 24px', width: '100%' }

  /* ── Step 1: How it works ── */
  if (step === 1) return (
    <div style={wrap}>
      <div style={{ ...inner, paddingTop: 60, textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', fontWeight: 700, marginBottom: 8 }}>Atelier</h1>
        <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '1rem', color: 'var(--text-muted)', marginBottom: 0 }}>
          A private studio companion for serious artists.
        </p>
      </div>
      <HowItWorks showCta onCta={() => setStep(2)} />
      <div style={{ textAlign: 'center', paddingBottom: 40 }}>
        <p className="t-micro" style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onClick={complete}>
          Skip for now →
        </p>
      </div>
    </div>
  )

  /* ── Step 2: Upload painting ── */
  if (step === 2) return (
    <div style={wrap}>
      <div style={inner}>
        <button onClick={() => setStep(1)}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: 32, fontSize: '0.9rem', padding: 0 }}>
          ← Back
        </button>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 700, marginBottom: 6 }}>
          Add a painting you're working on
        </h2>
        <p className="t-small" style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
          Add one or more photos. The first is used for evaluation.
        </p>

        <PhotoStrip files={files} onChange={setFiles} />

        <p className="t-micro" style={{ color: 'var(--text-muted)', marginBottom: 6 }}>Painting title (optional)</p>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Untitled"
          style={{ width: '100%', fontSize: 14, padding: '10px 12px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)',
            boxSizing: 'border-box', marginBottom: 24 }} />

        <button className="btn btn-warm" style={{ width: '100%', padding: 13, fontSize: 14 }}
          onClick={evaluate} disabled={!files.length || loading}>
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
    </div>
  )

  /* ── Step 3: First reading ── */
  return (
    <div style={wrap}>
      <div style={inner}>
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
          Add this painting from the Evaluate tab to keep future evaluations in its journal.
        </p>
      </div>
    </div>
  )
}
