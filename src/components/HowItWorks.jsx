import { useState, useEffect } from 'react'
import './HowItWorks.css'

const STEPS = [
  { title: 'Upload',   desc: 'Photograph your painting at any stage. A phone photo is enough.' },
  { title: 'Evaluate', desc: 'The AI companion reads it — colour, emotion, composition, narrative tension.' },
  { title: 'Converse', desc: 'Ask questions. Push back. Think through decisions on the page.' },
  { title: 'Archive',  desc: "Every session logs to your painting's journal. Nothing is lost." },
  { title: 'Publish',  desc: 'When ready, generate a process essay in your voice and publish it.' },
]

// showCta: true in onboarding (shows "Start" button), false on landing page
export default function HowItWorks({ showCta = false, onCta }) {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActive(i => (i + 1) % STEPS.length), 3200)
    return () => clearInterval(t)
  }, [])

  return (
    <section className="hiw">
      <p className="hiw__label">How the studio works</p>

      <div className="hiw__rail">
        {STEPS.map((s, i) => (
          <div
            key={s.title}
            className={`hiw__step${i === active ? ' active' : i < active ? ' done' : ''}`}
            onClick={() => setActive(i)}
          >
            <div className="hiw__node">{i + 1}</div>
            <p className="hiw__step-title">{s.title}</p>
          </div>
        ))}
      </div>

      <div className="hiw__detail">
        <p className="hiw__detail-title">{STEPS[active].title}</p>
        <p className="hiw__detail-desc">{STEPS[active].desc}</p>
      </div>

      <div className="hiw__dots">
        {STEPS.map((_, i) => (
          <div key={i} className={`hiw__dot${i === active ? ' active' : ''}`} />
        ))}
      </div>

      {showCta && (
        <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
          <button className="btn btn-warm" style={{ padding: '12px 36px', fontSize: '0.95rem' }}
            onClick={onCta}>
            Start with a painting →
          </button>
        </div>
      )}
    </section>
  )
}
