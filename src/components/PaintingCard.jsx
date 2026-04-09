import ScoreRing from './ScoreRing'
import '../styles/design-system.css'

export default function PaintingCard({ painting, onClick, onCameraClick }) {
  const {
    title, artist, image_url, thumbnail_b64,
    score_overall, score_salience, score_gaze, score_fluency,
    score_emotion, score_complexity, score_mirror, score_colour,
    score_narrative,
  } = painting

  const thumbSrc = image_url
    ? image_url.replace('full.jpg', 'thumb.jpg')
    : thumbnail_b64 ? `data:image/jpeg;base64,${thumbnail_b64}` : null

  const scores = {
    overall:    score_overall,
    salience:   score_salience,
    gaze:       score_gaze,
    fluency:    score_fluency,
    emotion:    score_emotion,
    complexity: score_complexity,
    mirror:     score_mirror,
    colour:     score_colour,
    narrative:  score_narrative,
  }

  return (
    <div className="painting-card" onClick={onClick}>
      <div className="painting-card__image" style={{ position: 'relative' }}>
        {thumbSrc
          ? <img src={thumbSrc} alt={title} />
          : <div className="painting-card__placeholder" />
        }
        {onCameraClick && (
          <button onClick={e => { e.stopPropagation(); onCameraClick(painting) }}
            style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(30,30,28,0.55)',
              border: 'none', borderRadius: '50%', width: 40, height: 40, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
            📷
          </button>
        )}
      </div>
      <div className="painting-card__body">
        <div className="painting-card__text">
          <p className="t-small" style={{ fontWeight: 500, color: 'var(--text)' }}>{title}</p>
          <p className="t-micro" style={{ color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>{artist}</p>
        </div>
        <ScoreRing scores={scores} size={60} />
      </div>
      <p style={{ fontSize: 9, color: 'var(--mid)', padding: '2px 12px 8px', lineHeight: 1.4 }}>
        Scores reflect a neuroaesthetic framework, not objective measurement.
      </p>
    </div>
  )
}
