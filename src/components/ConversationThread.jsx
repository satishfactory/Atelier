import '../styles/design-system.css'

export default function ConversationThread({ messages }) {
  if (!messages.length) return (
    <p className="t-small" style={{ color: 'var(--text-muted)' }}>No conversations yet. Use Talk to Companion to start.</p>
  )
  return (
    <div className="conv-thread">
      {messages.map((m, i) => (
        <div key={i} className={`conv-bubble conv-bubble--${m.role}`}>
          <p className={m.role === 'companion' ? 'companion-text' : 't-small'}>{m.message}</p>
        </div>
      ))}
    </div>
  )
}
