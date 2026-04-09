import { useRef, useState } from 'react'
import { SERVER } from '../lib/supabase'

// iOS requires HTTPS for getUserMedia — use native file input with capture instead
const IS_IOS = /iPhone|iPad/i.test(navigator.userAgent)

function pad(n) { return String(n).padStart(2, '0') }
function fmtTime(secs) { return `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}` }

export default function SessionRecorder({ paintingSlug, userId, onSessionSaved }) {
  const [mode, setMode]           = useState('idle') // idle | recording | preview | processing | done
  const [mediaType, setMediaType] = useState(null)   // 'audio' | 'video'
  const [elapsed, setElapsed]     = useState(0)
  const [blob, setBlob]           = useState(null)
  const [result, setResult]       = useState(null)
  const [error, setError]         = useState(null)
  const recorderRef  = useRef(null)
  const timerRef     = useRef(null)
  const iosAudioRef  = useRef(null)
  const iosVideoRef  = useRef(null)
  const MAX_SECS     = { audio: 180, video: 120 }

  // ── iOS path: native file input with capture ──────────────────
  function handleIosFile(e, type) {
    const file = e.target.files?.[0]
    if (!file) return
    setMediaType(type)
    setBlob(file)
    setMode('preview')
    e.target.value = ''
  }

  // ── Desktop path: MediaRecorder ───────────────────────────────
  async function startRecording(type) {
    setError(null); setMediaType(type); setElapsed(0)
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        type === 'video' ? { video: true, audio: true } : { audio: true }
      )
      const mimeType = type === 'video' ? 'video/webm' : 'audio/webm'
      const rec = new MediaRecorder(stream, { mimeType })
      const chunks = []
      rec.ondataavailable = e => chunks.push(e.data)
      rec.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        setBlob(new Blob(chunks, { type: mimeType }))
        setMode('preview')
      }
      rec.start()
      recorderRef.current = rec
      setMode('recording')
      timerRef.current = setInterval(() => {
        setElapsed(prev => {
          if (prev + 1 >= MAX_SECS[type]) { stopRecording(); return prev }
          return prev + 1
        })
      }, 1000)
    } catch {
      setError('Microphone access denied. Check browser permissions.')
    }
  }

  function stopRecording() {
    clearInterval(timerRef.current)
    recorderRef.current?.stop()
  }

  async function confirmSave() {
    if (!blob) return
    setMode('processing')
    const t    = blob.type || ''
    const ext  = t.includes('quicktime') || t.includes('mov') ? 'mov'
      : t.includes('mp4') ? 'mp4'
      : t.includes('ogg') ? 'ogg'
      : t.includes('wav') ? 'wav'
      : 'webm'
    const form = new FormData()
    form.append(mediaType === 'video' ? 'videoBlob' : 'audioBlob', blob, `session.${ext}`)
    form.append('paintingSlug', paintingSlug)
    form.append('sessionType', mediaType)
    if (userId) form.append('userId', userId)
    try {
      const res  = await fetch(`${SERVER}/api/sessions/media`, { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data); setMode('done')
      onSessionSaved?.(data)
    } catch (e) { setError(e.message); setMode('preview') }
  }

  function reset() { setMode('idle'); setBlob(null); setResult(null); setError(null); setElapsed(0) }

  // ── Idle state ────────────────────────────────────────────────
  if (mode === 'idle') return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      {IS_IOS ? (
        <>
          {/* iOS: native capture inputs — no HTTPS needed */}
          <input ref={iosAudioRef} type="file" accept="audio/*" capture="microphone"
            style={{ display: 'none' }} onChange={e => handleIosFile(e, 'audio')} />
          <input ref={iosVideoRef} type="file" accept="video/*" capture="camcorder"
            style={{ display: 'none' }} onChange={e => handleIosFile(e, 'video')} />
          <button className="btn" onClick={() => iosAudioRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            🎙 Record audio
          </button>
          <button className="btn" onClick={() => iosVideoRef.current?.click()}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            📹 Record video
          </button>
        </>
      ) : (
        <>
          <button className="btn" onClick={() => startRecording('audio')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            🎙 Record audio
          </button>
          <button className="btn" onClick={() => startRecording('video')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            📹 Record video
          </button>
        </>
      )}
      {error && <p style={{ color: 'var(--coral)', fontSize: 12, width: '100%' }}>{error}</p>}
    </div>
  )

  // ── Recording state (desktop only) ───────────────────────────
  if (mode === 'recording') return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--coral)', flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: 'var(--warm)' }}>
        Recording {fmtTime(elapsed)} / {fmtTime(MAX_SECS[mediaType])}
      </span>
      <button className="btn" onClick={stopRecording}>⏹ Stop</button>
    </div>
  )

  // ── Preview state ─────────────────────────────────────────────
  if (mode === 'preview') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
        {mediaType === 'video' ? '📹' : '🎙'} Ready to save
        {blob?.size ? ` · ${(blob.size / 1024 / 1024).toFixed(1)} MB` : ''}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-warm" onClick={confirmSave}>✓ Save & process</button>
        <button className="btn" onClick={reset}>✕ Discard</button>
      </div>
      {error && <p style={{ color: 'var(--coral)', fontSize: 12 }}>{error}</p>}
    </div>
  )

  // ── Processing state ──────────────────────────────────────────
  if (mode === 'processing') return (
    <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
      Transcribing and analysing…
    </p>
  )

  // ── Done state ────────────────────────────────────────────────
  if (mode === 'done') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ fontSize: 13, color: 'var(--teal)', fontWeight: 500 }}>✓ Session saved</p>
      {result?.transcript && (
        <div style={{ borderLeft: '2px solid var(--warm)', paddingLeft: 12 }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.6 }}>
            "{result.transcript.slice(0, 200)}{result.transcript.length > 200 ? '…' : ''}"
          </p>
        </div>
      )}
      <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={reset}>Record another</button>
    </div>
  )
}
