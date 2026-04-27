import { useState, useRef } from 'react'
import { SERVER } from '../lib/supabase'
import './public.css'

export default function GuestEvaluator({ onLogin }) {
  const [file,     setFile]     = useState(null)
  const [preview,  setPreview]  = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [response, setResponse] = useState('')
  const [done,     setDone]     = useState(false)
  const inputRef = useRef()

  function handlePick(e) {
    const f = e.target.files?.[0]; if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setResponse('')
    setDone(false)
  }

  async function evaluate() {
    if (!file) return
    setLoading(true)
    setResponse('')
    try {
      // Detect mime type — default to jpeg for unknown types
      const mimeType = file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg'
      const b64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload  = ev => resolve(ev.target.result.split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const res = await fetch(`${SERVER}/api/demo-evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: b64, mimeType }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n\n'); buf = parts.pop()
        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          const data = JSON.parse(part.slice(6))
          if (data.delta) setResponse(prev => prev + data.delta)
          if (data.done) setDone(true)
        }
      }
    } catch (e) { alert(e.message) }
    finally { setLoading(false) }
  }

  return (
    <section className="guest-eval">
      <div className="guest-eval__inner">
        <h2>Try it on your painting</h2>
        <p className="guest-eval__sub">
          Upload a photo — any painting, any stage. Get a free reading from the AI companion.
          No account needed. Sign up to save it to your studio.
        </p>

        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePick} />

        {!preview ? (
          <div className="guest-eval__drop" onClick={() => inputRef.current?.click()}>
            <p className="t-small" style={{ color: 'var(--text-muted)' }}>Tap to choose a photo</p>
          </div>
        ) : (
          <img src={preview} className="guest-eval__preview" alt="your painting"
            onClick={() => inputRef.current?.click()} />
        )}

        {preview && !response && (
          <button className="btn btn-warm" style={{ width: '100%', padding: 12, fontSize: '0.95rem' }}
            onClick={evaluate} disabled={loading}>
            {loading ? 'Reading your painting…' : 'Evaluate this painting →'}
          </button>
        )}

        {loading && !response && (
          <div style={{ marginTop: 'var(--space-3)' }}>
            <div className="skeleton" style={{ height: 12, width: '88%', marginBottom: 8, borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 12, width: '72%', marginBottom: 8, borderRadius: 4 }} />
            <div className="skeleton" style={{ height: 12, width: '80%', borderRadius: 4 }} />
          </div>
        )}

        {response && (
          <div className="guest-eval__response">{response}</div>
        )}

        {done && (
          <div className="guest-eval__gate">
            <p>This is one reading. In your studio, every session builds on the last — scores, conversations, journals, over time.</p>
            <button className="btn btn-warm" style={{ padding: '11px 28px' }} onClick={onLogin}>
              Save this and enter your studio →
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
