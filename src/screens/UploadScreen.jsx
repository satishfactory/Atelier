import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import '../styles/design-system.css'
import { getPaintings, saveDialogue, addSessionNote } from '../lib/supabase'

const USER_ID = 'satish'

function WipCard({ painting, active, onClick }) {
  const thumb = painting.image_url?.replace('full.jpg', 'thumb.jpg')
    || (painting.thumbnail_b64 ? `data:image/jpeg;base64,${painting.thumbnail_b64}` : null)
  return (
    <div onClick={onClick} style={{ width: 160, flexShrink: 0, cursor: 'pointer',
      outline: active ? '2px solid var(--warm)' : '2px solid transparent', borderRadius: 8 }}>
      {thumb
        ? <img src={thumb} alt={painting.title} style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
        : <div style={{ width: '100%', height: 120, borderRadius: 8, background: 'var(--stone)' }} />}
      <p style={{ fontWeight: 500, fontSize: 13, marginTop: 6 }}>{painting.title}</p>
      <p style={{ color: 'var(--warm)', fontSize: 12 }}>{painting.score_overall ?? '—'}</p>
    </div>
  )
}

export default function UploadScreen({ onPaintingClick }) {
  const [wip, setWip]               = useState([])
  const [selected, setSelected]     = useState(null)
  const [imgBase64, setImgBase64]   = useState(null)
  const [message, setMessage]       = useState('')
  const [response, setResponse]     = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [saved, setSaved]           = useState(false)
  const [freeOpen, setFreeOpen]     = useState(false)
  const [freeImg, setFreeImg]       = useState(null)
  const [freeMsg, setFreeMsg]       = useState('')
  const [freeResp, setFreeResp]     = useState(null)
  const [freeSub, setFreeSub]       = useState(false)
  const imgRef  = useRef(null)
  const freeRef = useRef(null)

  useEffect(() => {
    getPaintings(null, { type: 'artist_work', status: 'wip' }).then(setWip).catch(() => {})
  }, [])

  function readFile(file, cb) {
    const rd = new FileReader()
    rd.onload = () => cb(rd.result.split(',')[1])
    rd.readAsDataURL(file)
  }

  async function evaluate(paintingSlug, base64, msg, setSub, setResp) {
    setSub(true)
    try {
      const res = await fetch('http://localhost:3001/api/evaluate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callType: 'evaluate_painting', paintingSlug, userId: USER_ID, paintingImage: base64, userMessage: msg }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResp(data.response)
    } catch (e) { alert(e.message) }
    finally { setSub(false) }
  }

  async function saveEval() {
    if (!selected || !response) return
    try {
      await saveDialogue(USER_ID, selected.slug, message || '(no note)', response)
      await addSessionNote(selected.slug, message || 'Evaluation session')
      setSaved(true)
    } catch (e) { alert(e.message) }
  }

  return (
    <div className="upload-screen">

      {/* 1 WIP PAINTINGS */}
      <section className="home-section">
        <p className="t-micro home-section-label">Your WIP paintings</p>
        {wip.length === 0
          ? <p className="t-small" style={{ color: 'var(--text-muted)' }}>No paintings in progress.</p>
          : <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
              {wip.map(p => (
                <WipCard key={p.slug} painting={p} active={selected?.slug === p.slug}
                  onClick={() => { setSelected(p); setResponse(null); setSaved(false); setImgBase64(null); setMessage('') }} />
              ))}
            </div>
        }
      </section>

      {/* 2 EVALUATE SELECTED */}
      {selected && (
        <section className="home-section">
          <p className="t-micro home-section-label">Evaluate — {selected.title}</p>
          <p className="t-small" style={{ color: 'var(--text-muted)' }}>Current overall score: {selected.score_overall ?? '—'}</p>
          <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && readFile(e.target.files[0], setImgBase64)} />
          <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => imgRef.current.click()}>
            {imgBase64 ? '✓ Photo added' : `Add new photo of ${selected.title}`}
          </button>
          <textarea className="upload-textarea" rows={4} value={message} onChange={e => setMessage(e.target.value)}
            placeholder="What has changed? What are you noticing?" />
          <button className="btn btn-warm" disabled={submitting}
            onClick={() => evaluate(selected.slug, imgBase64, message, setSubmitting, setResponse)}>
            {submitting ? 'Evaluating…' : 'Submit for evaluation'}
          </button>
          {response && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              <div className="companion-response" style={{ borderLeft: '2px solid var(--warm)', paddingLeft: 16 }}>
                <ReactMarkdown>{response}</ReactMarkdown>
              </div>
              {!saved
                ? <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={saveEval}>Save this evaluation to journal</button>
                : <p className="t-micro" style={{ cursor: 'pointer', color: 'var(--warm)', textDecoration: 'underline' }}
                    onClick={() => onPaintingClick?.(selected)}>
                    Saved to {selected.title} journal →
                  </p>
              }
            </div>
          )}
        </section>
      )}

      {/* 3 FREE EVALUATION */}
      <section className="home-section">
        <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => setFreeOpen(o => !o)}>
          {freeOpen ? 'Close ↑' : 'Evaluate any painting →'}
        </button>
        {freeOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <input ref={freeRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && readFile(e.target.files[0], setFreeImg)} />
            <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => freeRef.current.click()}>
              {freeImg ? '✓ Photo added' : 'Upload painting photo'}
            </button>
            <textarea className="upload-textarea" rows={3} value={freeMsg} onChange={e => setFreeMsg(e.target.value)}
              placeholder="What do you want to explore?" />
            <button className="btn btn-warm" disabled={freeSub} style={{ alignSelf: 'flex-start' }}
              onClick={() => evaluate('free_evaluation', freeImg, freeMsg, setFreeSub, setFreeResp)}>
              {freeSub ? 'Evaluating…' : 'Evaluate'}
            </button>
            {freeResp && (
              <div style={{ borderLeft: '2px solid var(--warm)', paddingLeft: 16 }}>
                <p className="companion-text" style={{ lineHeight: 1.8 }}>{freeResp}</p>
              </div>
            )}
          </div>
        )}
      </section>

    </div>
  )
}
