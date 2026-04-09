import { useState } from 'react'
import '../styles/design-system.css'

const TYPE_TO_GROUP = {
  artist: 'artists', painter: 'artists', biography: 'artists',
  book: 'writers', letters: 'writers', essay: 'writers',
  poem: 'poems', poetry: 'poems', verse: 'poems',
  film: 'films', movie: 'films', documentary: 'films',
  paper: 'philosophy', philosophy: 'philosophy', research: 'philosophy',
  analysis: 'own', note: 'own', photo: 'own',
}

const GROUPS = [
  { id: 'artists',    label: 'Artists'    },
  { id: 'writers',    label: 'Writers'    },
  { id: 'philosophy', label: 'Philosophy' },
  { id: 'poems',      label: 'Poems'      },
  { id: 'films',      label: 'Films'      },
  { id: 'own',        label: 'Own Work'   },
]

function groupOf(inf) {
  return TYPE_TO_GROUP[inf.type?.toLowerCase()] || 'writers'
}

function InfluenceCard({ inf }) {
  const [open, setOpen] = useState(false)
  const note = inf.influence_note || ''
  const preview = note.length > 160 ? note.slice(0, 160).trimEnd() + '…' : note

  return (
    <div style={{ background: 'var(--white)', border: '0.5px solid var(--border)', borderRadius: 8, padding: 20 }}>
      {note && (
        <div style={{ borderLeft: '2px solid var(--warm)', paddingLeft: 14, marginBottom: 14 }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.95rem', lineHeight: 1.8, color: 'var(--text)' }}>
            {open ? note : preview}
          </p>
          {note.length > 160 && (
            <button onClick={() => setOpen(o => !o)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontSize: 11, color: 'var(--warm)', marginTop: 6 }}>
              {open ? 'Less ↑' : 'More ↓'}
            </button>
          )}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{inf.title}</p>
          {inf.creator && <p className="t-micro" style={{ color: 'var(--text-muted)' }}>{inf.creator}</p>}
        </div>
        <span className="t-micro" style={{ padding: '2px 10px', border: '0.5px solid var(--border)',
          borderRadius: 99, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {inf.type}
        </span>
      </div>
    </div>
  )
}

export default function InfluencesSection({ inspirations }) {
  const [active, setActive] = useState(null)

  const visibleGroups = GROUPS.filter(g => inspirations.some(i => groupOf(i) === g.id))

  function toggle(id) { setActive(prev => prev === id ? null : id) }

  return (
    <div>
      {/* Category squares */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {visibleGroups.map(g => {
          const count = inspirations.filter(i => groupOf(i) === g.id).length
          const isActive = active === g.id
          return (
            <button key={g.id} onClick={() => toggle(g.id)}
              style={{ background: isActive ? 'var(--warm)' : 'var(--white)',
                border: `0.5px solid ${isActive ? 'var(--warm)' : 'var(--border)'}`,
                borderRadius: 8, padding: '16px 12px', cursor: 'pointer', textAlign: 'center',
                transition: 'all 0.15s' }}>
              <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 700,
                color: isActive ? 'var(--white)' : 'var(--warm)', marginBottom: 4, lineHeight: 1 }}>
                {count}
              </p>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: isActive ? 'rgba(255,255,255,0.85)' : 'var(--text-muted)',
                fontWeight: 500 }}>
                {g.label}
              </p>
            </button>
          )
        })}
      </div>

      {/* Expanded entries */}
      {active && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {inspirations.filter(i => groupOf(i) === active).map(inf => (
            <InfluenceCard key={inf.id} inf={inf} />
          ))}
        </div>
      )}
    </div>
  )
}
