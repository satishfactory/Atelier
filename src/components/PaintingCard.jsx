import ScoreRing from './ScoreRing'
import '../styles/design-system.css'

export default function PaintingCard({ painting, onClick }) {
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
      <div className="painting-card__image">
        {thumbSrc
          ? <img src={thumbSrc} alt={title} />
          : <div className="painting-card__placeholder" />
        }
      </div>
      <div className="painting-card__body">
        <div className="painting-card__text">
          <p className="t-small" style={{ fontWeight: 500, color: 'var(--text)' }}>{title}</p>
          <p className="t-micro" style={{ color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>{artist}</p>
        </div>
        <ScoreRing scores={scores} size={60} />
      </div>
    </div>
  )
}
