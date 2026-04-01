import { useEffect, useState } from 'react'
import '../styles/design-system.css'
import { getPainting, getPaintingSubject, getSessions } from '../lib/supabase'
import ScoreRing from '../components/ScoreRing'

const DIMENSIONS = [
  { key: 'score_salience',   label: 'Salience',   color: 'var(--dim-salience)'   },
  { key: 'score_gaze',       label: 'Gaze',       color: 'var(--dim-gaze)'       },
  { key: 'score_fluency',    label: 'Fluency',    color: 'var(--dim-fluency)'    },
  { key: 'score_emotion',    label: 'Emotion',    color: 'var(--dim-emotion)'    },
  { key: 'score_complexity', label: 'Complexity', color: 'var(--dim-complexity)' },
  { key: 'score_mirror',     label: 'Mirror',     color: 'var(--dim-mirror)'     },
  { key: 'score_colour',     label: 'Colour',     color: 'var(--dim-colour)'     },
  { key: 'score_narrative',  label: 'Narrative',  color: 'var(--dim-narrative)'  },
]

export default function PaintingDetailScreen({ slug, onBack, onTalkToCompanion }) {
  const [painting, setPainting]   = useState(null)
  const [subject, setSubject]     = useState(null)
  const [sessions, setSessions]   = useState([])
  const [error, setError]         = useState(null)

  useEffect(() => {
    Promise.all([
      getPainting(slug),
      getPaintingSubject(slug),
      getSessions(slug),
    ]).then(([p, s, ss]) => {
      setPainting(p)
      setSubject(s)
      setSessions(ss || [])
    }).catch(err => setError(err.message))
  }, [slug])

  if (error) return <p className="t-small" style={{ padding: 'var(--space-6)', color: 'var(--coral)' }}>{error}</p>
  if (!painting) return <div className="skeleton detail-image-placeholder" />

  const scores = {
    overall:    painting.score_overall,
    salience:   painting.score_salience,
    gaze:       painting.score_gaze,
    fluency:    painting.score_fluency,
    emotion:    painting.score_emotion,
    complexity: painting.score_complexity,
    mirror:     painting.score_mirror,
    colour:     painting.score_colour,
    narrative:  painting.score_narrative,
  }

  return (
    <div className="detail-screen">

      <div className="detail-image-wrap">
        {painting.image_url || painting.thumbnail_b64
          ? <img
              src={painting.image_url || `data:image/jpeg;base64,${painting.thumbnail_b64}`}
              alt={painting.title}
              className="detail-image"
            />
          : <div className="detail-image-placeholder" />
        }
        <button className="detail-back" onClick={onBack}>← Back</button>
      </div>

      <div className="detail-body">

        <div className="detail-header">
          <h1 className="t-title">{painting.title}</h1>
          <p className="t-small" style={{ color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
            {painting.artist}{painting.year ? `, ${painting.year}` : ''}
          </p>
        </div>

        <div className="detail-scores">
          <ScoreRing scores={scores} size={140} />
          <div className="detail-dimensions">
            {DIMENSIONS.map(d => (
              <div key={d.key} className="detail-dim-row">
                <span className="detail-dim-dot" style={{ background: d.color }} />
                <span className="t-small detail-dim-label">{d.label}</span>
                <span className="t-small detail-dim-value">{painting[d.key] ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>

        {subject?.subject_note && (
          <div className="companion-message">
            <p className="t-micro" style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-2)' }}>What this painting is about</p>
            <p className="companion-text">{subject.subject_note}</p>
          </div>
        )}

        {sessions.length > 0 && (
          <div className="detail-sessions">
            <p className="t-micro" style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>Session history</p>
            {sessions.map(s => (
              <div key={s.version} className="detail-session-row">
                <div className="detail-session-meta">
                  <span className="t-mono">v{s.version}</span>
                  <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{s.session_date}</span>
                  <span className="t-small" style={{ fontWeight: 500 }}>{s.score_overall}</span>
                </div>
                {s.artist_note && <p className="t-small detail-session-note">{s.artist_note}</p>}
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-warm detail-companion-btn" onClick={() => onTalkToCompanion?.(painting)}>
          Talk to companion
        </button>

      </div>
    </div>
  )
}
