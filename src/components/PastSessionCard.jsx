import { useState } from 'react'
import { SERVER } from '../lib/supabase'

function fmt(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDuration(secs) {
  if (!secs) return null
  return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`
}

const TYPE_ICON = { audio: '🎙', video: '📹', audio_video: '📹' }

export default function PastSessionCard({ userId, session, paintingSlug }) {
  const [expanded, setExpanded] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [message, setMessage]   = useState('')
  const [response, setResponse] = useState('')
  const [streaming, setStreaming] = useState(false)

  async function discuss() {
    if (!message.trim()) return
    setStreaming(true); setResponse('')
    try {
      const res = await fetch(`${SERVER}/api/evaluate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callType: 'session_dialogue',
          paintingSlug,
          userId,
          sessionId: session.id,
          transcript: session.transcript,
          frameUrls: session.frames?.map(f => f.frame_url) || [],
          userMessage: message,
        }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let buf = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n\n'); buf = parts.pop()
        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          const data = JSON.parse(part.slice(6))
          if (data.delta) setResponse(prev => prev + data.delta)
          if (data.done) setStreaming(false)
        }
      }
    } catch (e) { setResponse(`Error: ${e.message}`); setStreaming(false) }
  }

  return (
    <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 16, paddingBottom: 8 }}>
      <div onClick={() => setExpanded(o => !o)} style={{ cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 18, flexShrink: 0 }}>{TYPE_ICON[session.session_type] || '🎙'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>{fmt(session.recorded_at)}</span>
            {fmtDuration(session.duration_secs) && (
              <span className="t-micro" style={{ color: 'var(--mid)' }}>{fmtDuration(session.duration_secs)}</span>
            )}
            {session.frame_count > 0 && (
              <span className="t-micro" style={{ color: 'var(--mid)' }}>{session.frame_count} frames</span>
            )}
          </div>
          {session.session_summary && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6,
              overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: expanded ? 99 : 2, WebkitBoxOrient: 'vertical' }}>
              {session.session_summary}
            </p>
          )}
          {!session.session_summary && session.transcript && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.6,
              overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: expanded ? 99 : 2, WebkitBoxOrient: 'vertical' }}>
              "{session.transcript.slice(0, 200)}"
            </p>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 12, paddingLeft: 28 }}>
          {session.frames?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12 }}>
              {session.frames.map(f => (
                <img key={f.frame_index} src={f.frame_url} alt={`Frame ${f.frame_index}`}
                  style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
              ))}
            </div>
          )}
          {!chatOpen && (
            <button className="btn" style={{ fontSize: 12 }} onClick={() => setChatOpen(true)}>
              💬 Discuss this session
            </button>
          )}
          {chatOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {response && (
                <div style={{ borderLeft: '2px solid var(--warm)', paddingLeft: 12 }}>
                  <p style={{ fontSize: 13, lineHeight: 1.7, fontStyle: 'italic', color: 'var(--text)' }}>{response}</p>
                </div>
              )}
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2}
                placeholder="Ask the companion about this session…"
                style={{ fontSize: 13, padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', resize: 'vertical' }} />
              <button className="btn btn-warm" style={{ alignSelf: 'flex-start', fontSize: 12 }}
                onClick={discuss} disabled={streaming || !message.trim()}>
                {streaming ? 'Thinking…' : 'Ask →'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
