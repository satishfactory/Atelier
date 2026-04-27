import { useState, useEffect } from 'react'
import './public.css'

// Demo scores from "Dance of Life — Lisbon" (our strongest painting)
const DIMS = [
  { key: 'Emotion',     score: 91, color: 'var(--dim-emotion)' },
  { key: 'Salience',    score: 88, color: 'var(--dim-salience)' },
  { key: 'Colour',      score: 89, color: 'var(--dim-colour)' },
  { key: 'Mirror',      score: 85, color: 'var(--dim-mirror)' },
  { key: 'Fluency',     score: 82, color: 'var(--dim-fluency)' },
  { key: 'Narrative',   score: 80, color: 'var(--dim-narrative)' },
  { key: 'Gaze',        score: 79, color: 'var(--dim-gaze)' },
  { key: 'Complexity',  score: 76, color: 'var(--dim-complexity)' },
]

export default function PublicScorecard() {
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <section className="score-showcase">
      <div className="score-showcase__inner">

        <div className="score-showcase__left">
          <p className="score-showcase__label">AI evaluation</p>
          <p className="score-showcase__title">Eight dimensions.<br />One honest reading.</p>
          <p className="score-showcase__desc">
            Every painting receives a structured evaluation across colour, emotion, salience,
            narrative, gaze, fluency, complexity, and mirror. Scores accumulate over time —
            showing you exactly where your work is growing.
          </p>
          <div className="score-showcase__overall">
            <span className="score-showcase__overall-num">84</span>
            <span className="score-showcase__overall-label">overall · Dance of Life</span>
          </div>
        </div>

        <div className="score-showcase__right">
          {DIMS.map((d, i) => (
            <div key={d.key} className="score-bar">
              <div className="score-bar__label">{d.key}</div>
              <div className="score-bar__track">
                <div className="score-bar__fill"
                  style={{
                    width: animate ? `${d.score}%` : '0%',
                    background: d.color,
                    transitionDelay: `${i * 80}ms`,
                  }} />
              </div>
              <div className="score-bar__num" style={{ color: d.color }}>{d.score}</div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
