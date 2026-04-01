import '../styles/design-system.css'

export default function CompanionJournal({ entries }) {
  if (!entries.length) return (
    <p className="t-small" style={{ color: 'var(--text-muted)' }}>No journal entries yet. Talk to companion to begin.</p>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      {entries.map(e => (
        <div key={e.id} style={{ borderLeft: '2px solid var(--warm)', paddingLeft: 20 }}>
          <p className="t-micro" style={{ color: 'var(--text-muted)', marginBottom: 10 }}>
            {e.session_date || e.created_at?.slice(0, 10)}
          </p>
          <p className="companion-text" style={{ fontSize: '1.1rem', lineHeight: 1.9 }}>{e.message}</p>
        </div>
      ))}
    </div>
  )
}
