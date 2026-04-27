import { useState } from 'react'
import './features.css'

const FEATURES = [
  {
    img: '/features/companion.png',
    title: 'Choose your companion',
    desc: 'Pick a persona that matches how you want to think. Mira is direct. Others are more contemplative. The voice shapes the conversation.',
  },
  {
    img: '/features/mira.png',
    title: 'Mira analyses your style',
    desc: 'Your AI companion cross-references your work against artists you admire — finding patterns in colour, gesture, and influence you may not have seen.',
  },
  {
    img: '/features/style-dna.png',
    title: 'Your Style DNA, over time',
    desc: 'As sessions accumulate, Atelier builds a fingerprint of your artistic identity — showing exactly how your work is evolving, dimension by dimension.',
  },
  {
    img: '/features/journals-av.png',
    title: 'Audio-visual process journals',
    desc: 'Record your studio sessions with voice and video. Atelier transcribes, timestamps, and links each moment back to the painting it captures.',
  },
  {
    img: '/features/new-score.png',
    title: 'Every version gets scored',
    desc: 'Upload a new photo as the painting changes. Each evaluation adds a layer — so you can see the arc from first marks to finished work.',
  },
  {
    img: '/features/influencers.png',
    title: 'Feed it your influences',
    desc: 'Add artists, writers, musicians, or images that inspire you. The companion draws on these when it reads your work, connecting the personal to the painterly.',
  },
  {
    img: '/features/multidevice.png',
    title: 'Phone or desktop, your choice',
    desc: 'Walk into the studio with your phone and start a voice session. Sit down at the desk and write. Both flow into the same journal.',
  },
  {
    img: '/features/process-blogs.png',
    title: 'Process blogs, generated in your voice',
    desc: 'Turn journal sessions into publishable essays. Atelier drafts from your own notes and evaluations — you edit every word before it goes out.',
  },
  {
    img: '/features/edit-share.png',
    title: 'Collectors view, shared selectively',
    desc: 'Regenerate your journal as a curated collector\'s view. Choose exactly what to show — no algorithm, no auto-posting.',
  },
  {
    img: '/features/suggest-similar.png',
    title: 'Discover what your work rhymes with',
    desc: 'Atelier finds paintings — historical and contemporary — that share the same emotional or compositional frequency as yours.',
  },
  {
    img: '/features/profile.png',
    title: 'Your artist profile, built automatically',
    desc: 'As you work, your public profile fills itself in — titles, mediums, dimensions, process notes — ready for galleries, collectors, or grant applications.',
  },
  {
    img: '/features/story-blog.png',
    title: 'Journals become stories',
    desc: 'The arc of a painting — from blank canvas to finished work — becomes a narrative. Atelier helps you tell it.',
  },
]

export default function PublicFeatures({ onLogin }) {
  const [active, setActive] = useState(null)

  return (
    <section className="pub-features">
      <div className="pub-features__header">
        <p className="pub-features__kicker">What it does</p>
        <h2 className="pub-features__title">Every feature built for the serious painter</h2>
      </div>

      <div className="pub-features__grid">
        {FEATURES.map((f, i) => (
          <div key={f.title}
            className={`feat-card${active === i ? ' feat-card--open' : ''}`}
            onClick={() => setActive(active === i ? null : i)}
          >
            <div className="feat-card__img-wrap">
              <img src={f.img} alt={f.title} loading="lazy" />
            </div>
            <div className="feat-card__body">
              <p className="feat-card__title">{f.title}</p>
              <p className="feat-card__desc">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="pub-features__footer">
        <button className="public-hero__cta" onClick={onLogin}>
          Try it on your painting →
        </button>
      </div>
    </section>
  )
}
