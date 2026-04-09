import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import '../styles/design-system.css'
import { getPaintings, getPainting, addSessionNote, friendlyError, SERVER } from '../lib/supabase'
import { useVoiceInput, MicButton, useSpeech, SpeakButton } from '../lib/useVoiceInput.jsx'
import PaintingCard from '../components/PaintingCard'
import ScoreWheel from '../components/ScoreWheel'

export default function UploadScreen({ userId, onPaintingClick }) {
  const [wip, setWip]               = useState([])
  const [selected, setSelected]     = useState(null)
  const [imgBase64, setImgBase64]   = useState([])
  const [message, setMessage]       = useState('')
  const [response, setResponse]     = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved]           = useState(false)
  const [freeOpen, setFreeOpen]     = useState(false)
  const [freeTitle, setFreeTitle]   = useState('')
  const [freeImg, setFreeImg]       = useState([])
  const [freeMsg, setFreeMsg]       = useState('')
  const [freeResp, setFreeResp]     = useState(null)
  const [freeSub, setFreeSub]       = useState(false)
  const [freeSavedSlug, setFreeSavedSlug]             = useState(null)
  const [evaluatedPainting, setEvaluatedPainting]     = useState(null)
  const [freeEvaluatedPainting, setFreeEvaluatedPainting] = useState(null)
  const imgRef     = useRef(null)
  const freeRef    = useRef(null)
  const msgRef     = useRef(null)
  const freeMsgRef = useRef(null)
  const { listening, toggleVoice } = useVoiceInput()
  const { speaking, speak, stop }  = useSpeech()

  useEffect(() => {
    getPaintings(userId, { type: 'artist_work', status: 'wip' }).then(setWip).catch(() => {})
  }, [])

  function readFiles(files, setCb) {
    const arr = Array.from(files)
    const results = new Array(arr.length)
    let done = 0
    arr.forEach((file, i) => readFile(file, b64 => {
      results[i] = b64
      if (++done === arr.length) setCb(results)
    }))
  }

  function readFile(file, cb) {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 1200
      let w = img.width, h = img.height
      if (w > MAX || h > MAX) {
        if (w > h) { h = Math.round(h * MAX / w); w = MAX }
        else { w = Math.round(w * MAX / h); h = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      cb(canvas.toDataURL('image/jpeg', 0.85).split(',')[1])
    }
    img.src = url
  }

  async function evaluate(paintingSlug, images, msg, setSub, setResp, onDone) {
    setSub(true)
    try {
      const res = await fetch(`${SERVER}/api/evaluate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callType: 'evaluate_painting', paintingSlug, userId, paintingImage: images[0] ?? null, paintingImages: images, userMessage: msg }),
      })
      if (!res.ok) {
        let errMsg = `Server error ${res.status}`
        try { const d = await res.json(); errMsg = d.error || errMsg } catch (_) {}
        throw new Error(errMsg)
      }
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
          if (data.delta) setResp(prev => (prev ?? '') + data.delta)
          if (data.done) { setSub(false); onDone?.(data.scores) }
        }
      }
    } catch (e) { alert(friendlyError(e.message)) }
    finally { setSub(false) }
  }

  async function saveEval() {
    if (!selected || !response) return
    try {
      // server already saved companion_conversations during streaming — only add session note
      await addSessionNote(selected.slug, message || 'Evaluation session', userId)
      setSaved(true)
    } catch (e) { alert(friendlyError(e.message)) }
  }

  async function startFreeEvaluation() {
    if (!freeTitle.trim()) { alert('Please enter a painting title first.'); return }
    const slug = 'satish_' + freeTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    setFreeSub(true)
    try {
      const res = await fetch(`${SERVER}/api/create-painting`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: freeTitle.trim(), slug, imageBase64: freeImg[0] || undefined, userId }),
      })
      if (!res.ok) {
        let errMsg = `Server error ${res.status}`
        try { const d = await res.json(); errMsg = d.error || errMsg } catch (_) {}
        throw new Error(errMsg)
      }
      setFreeSavedSlug(slug)
      await addSessionNote(slug, freeMsg || 'Initial evaluation', userId)
    } catch (e) { alert(friendlyError(e.message)); setFreeSub(false); return }
    await evaluate(slug, freeImg, freeMsg, setFreeSub, setFreeResp, scores => setFreeEvaluatedPainting(scores ? { slug, title: freeTitle.trim(), ...scores } : { slug, title: freeTitle.trim() }))
  }

  return (
    <div className="upload-screen">

      {/* 1 WIP PAINTINGS */}
      <section className="home-section">
        <p className="t-micro home-section-label">Your WIP paintings</p>
        {wip.length === 0
          ? (
            <div style={{ padding: '20px 0' }}>
              <p className="t-small" style={{ color: 'var(--text-muted)', marginBottom: 8 }}>No paintings in progress.</p>
              <p className="t-micro" style={{ color: 'var(--text-muted)' }}>Start a new painting below to get your first companion reading ↓</p>
            </div>
          )
          : <div className="gallery-grid gallery-grid--flush">
              {wip.map(p => (
                <div key={p.slug} style={{ outline: selected?.slug === p.slug ? '2px solid var(--warm)' : 'none', borderRadius: 2 }}>
                  <PaintingCard painting={p}
                    onClick={() => { setSelected(p); setResponse(null); setSaved(false); setImgBase64([]); setMessage(''); setEvaluatedPainting(null) }} />
                </div>
              ))}
            </div>
        }
      </section>

      {/* 2 EVALUATE SELECTED */}
      {selected && (
        <section className="home-section upload-form">
          <p className="t-micro home-section-label">Companion reading — {selected.title}</p>
          <p className="t-small" style={{ color: 'var(--text-muted)' }}>Current overall score: {selected.score_overall ?? '—'}</p>
          <input ref={imgRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
            onChange={e => e.target.files?.length && readFiles(e.target.files, setImgBase64)} />
          <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => imgRef.current.click()}>
            {imgBase64.length > 0 ? `✓ ${imgBase64.length} photo${imgBase64.length > 1 ? 's' : ''} added` : `Add new photo of ${selected.title}`}
          </button>
          <div style={{ position: 'relative' }}>
            <textarea ref={msgRef} className="upload-textarea" rows={4} value={message} onChange={e => setMessage(e.target.value)}
              placeholder="What has changed? What are you noticing?" style={{ paddingRight: 52 }} />
            <MicButton onClick={() => toggleVoice(setMessage, msgRef)} listening={listening} />
          </div>
          <button className="btn btn-warm" disabled={submitting}
            onClick={() => evaluate(selected.slug, imgBase64, message, setSubmitting, setResponse, scores => setEvaluatedPainting(scores ? { ...selected, ...scores } : selected))}>
            {submitting ? 'Evaluating…' : 'Submit for evaluation'}
          </button>
          {response && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <p className="t-micro" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Companion analysis</p>
                <SpeakButton text={response} speaking={speaking} onSpeak={speak} onStop={stop} />
              </div>
              {evaluatedPainting && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <ScoreWheel painting={evaluatedPainting} size={160} />
                  <div>
                    <p className="t-micro" style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Overall score</p>
                    <p style={{ fontSize: 36, fontFamily: 'Playfair Display, serif', color: 'var(--warm)', lineHeight: 1 }}>
                      {evaluatedPainting.score_overall ?? '—'}
                    </p>
                    <p className="t-micro" style={{ color: 'var(--text-muted)' }}>/ 100</p>
                  </div>
                </div>
              )}
              <div className="companion-response" style={{ borderLeft: '2px solid var(--warm)', paddingLeft: 16 }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{response}</ReactMarkdown>
              </div>
              {!submitting && !saved && (
                <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={saveEval}>Save companion reading to journal</button>
              )}
              {!submitting && saved && (
                <p className="t-micro" style={{ cursor: 'pointer', color: 'var(--warm)', textDecoration: 'underline' }}
                  onClick={() => onPaintingClick?.(selected)}>
                  Saved to {selected.title} journal →
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* 3 FREE EVALUATION */}
      <section className="home-section upload-form">
        <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => setFreeOpen(o => !o)}>
          {freeOpen ? 'Close ↑' : 'Start a new painting →'}
        </button>
        {freeOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <input type="text" className="upload-textarea" value={freeTitle} onChange={e => setFreeTitle(e.target.value)}
              placeholder="Painting title (required)" style={{ rows: 1 }} />
            <input ref={freeRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
              onChange={e => e.target.files?.length && readFiles(e.target.files, setFreeImg)} />
            <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => freeRef.current.click()}>
              {freeImg.length > 0 ? `✓ ${freeImg.length} photo${freeImg.length > 1 ? 's' : ''} added` : 'Upload painting photo'}
            </button>
            <div style={{ position: 'relative' }}>
              <textarea ref={freeMsgRef} className="upload-textarea" rows={3} value={freeMsg} onChange={e => setFreeMsg(e.target.value)}
                placeholder="What do you want to explore?" style={{ paddingRight: 52 }} />
              <button onClick={() => toggleVoice(setFreeMsg, freeMsgRef)}
                style={{ position: 'absolute', right: 8, bottom: 8, width: 44, height: 44, borderRadius: '50%',
                  border: 'none', background: listening ? 'var(--warm)' : 'var(--stone)',
                  color: listening ? 'var(--white)' : 'var(--dark)', fontSize: 18, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                🎙
              </button>
            </div>
            <button className="btn btn-warm" disabled={freeSub || !freeTitle.trim()} style={{ alignSelf: 'flex-start' }}
              onClick={startFreeEvaluation}>
              {freeSub ? 'Creating & evaluating…' : 'Get first reading & save'}
            </button>
            {freeResp && (
              <>
              <p className="t-micro" style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Companion analysis</p>
              {freeEvaluatedPainting && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <ScoreWheel painting={freeEvaluatedPainting} size={160} />
                  <div>
                    <p className="t-micro" style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Overall score</p>
                    <p style={{ fontSize: 36, fontFamily: 'Playfair Display, serif', color: 'var(--warm)', lineHeight: 1 }}>
                      {freeEvaluatedPainting.score_overall ?? '—'}
                    </p>
                    <p className="t-micro" style={{ color: 'var(--text-muted)' }}>/ 100</p>
                  </div>
                </div>
              )}
              <div className="companion-response" style={{ borderLeft: '2px solid var(--warm)', paddingLeft: 16 }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{freeResp}</ReactMarkdown>
              </div>
              {freeSavedSlug && (
                <p className="t-micro" style={{ color: 'var(--warm)', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => onPaintingClick?.({ slug: freeSavedSlug, title: freeTitle })}>
                  Saved as "{freeTitle}" — open journal →
                </p>
              )}
              </>
            )}
          </div>
        )}
      </section>

    </div>
  )
}
