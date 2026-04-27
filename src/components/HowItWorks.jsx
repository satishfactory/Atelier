import { useState, useEffect } from 'react'
import './HowItWorks.css'

const STEPS = [
  {
    title: 'Upload',
    desc: 'Photograph your painting at any stage. A phone photo is enough.',
    images: ['/hero/at1.jpeg', '/hero/at4.jpeg', '/hero/at5.jpeg'],
  },
  {
    title: 'Evaluate',
    desc: 'The AI companion reads it — colour, emotion, composition, narrative tension.',
    images: ['/hero/at6.jpeg', '/hero/at8.jpeg', '/hero/at9.jpeg'],
  },
  {
    title: 'Converse',
    desc: 'Ask questions. Push back. Think through decisions on the page.',
    images: ['/hero/at11.jpeg', '/hero/at12.jpeg', '/hero/at1.jpeg'],
  },
  {
    title: 'Archive',
    desc: "Every session logs to your painting's journal. Nothing is lost.",
    images: ['/hero/at4.jpeg', '/hero/at8.jpeg', '/hero/at12.jpeg'],
  },
  {
    title: 'Publish',
    desc: 'When ready, generate a process essay in your voice and publish it.',
    images: ['/hero/at5.jpeg', '/hero/at9.jpeg', '/hero/at11.jpeg'],
  },
]

export default function HowItWorks({ showCta = false, onCta }) {
  const [active, setActive] = useState(0)
  const [imgActive, setImgActive] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setActive(i => (i + 1) % STEPS.length), 3200)
    return () => clearInterval(t)
  }, [])

  // Reset image carousel when step changes
  useEffect(() => { setImgActive(0) }, [active])

  const step = STEPS[active]

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

      <div className="hiw__body">
        <div className="hiw__imgs">
          {step.images.map((src, i) => (
            <div key={src}
              className={`hiw__img-slide${i === imgActive ? ' active' : ''}`}
              style={{ backgroundImage: `url(${src})` }}
              onClick={() => setImgActive((imgActive + 1) % step.images.length)}
            />
          ))}
          <div className="hiw__img-dots">
            {step.images.map((_, i) => (
              <div key={i} className={`hiw__img-dot${i === imgActive ? ' active' : ''}`}
                onClick={() => setImgActive(i)} />
            ))}
          </div>
        </div>

        <div className="hiw__detail">
          <p className="hiw__detail-title">{step.title}</p>
          <p className="hiw__detail-desc">{step.desc}</p>
        </div>
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
