import './features.css'

const COMPARE = [
  { label: 'Generates art with AI?',       them: 'Yes — always',         us: 'Never. 100% human-made' },
  { label: 'Records your process?',         them: 'No',                   us: 'Yes — voice, video, notes' },
  { label: 'Proves art is human?',          them: 'Watermarks (removable)', us: 'Encrypted journal + timestamps' },
  { label: 'Sells your data?',              them: 'Yes — to advertisers', us: 'Zero. No ads. No tracking.' },
  { label: 'You own the journey?',          them: 'You own the image only', us: 'You own every session, essay, score' },
]

export default function PublicManifesto({ onLogin }) {
  return (
    <section className="manifesto">
      <div className="manifesto__inner">

        <div className="manifesto__headline">
          <p className="manifesto__kicker">What Atelier is</p>
          <h2 className="manifesto__title">
            We don't generate art.<br />We document it.
          </h2>
          <p className="manifesto__sub">
            Every tool you know — Midjourney, Firefly, Arthelper — makes art for you.
            Atelier does the opposite. It watches how <em>you</em> make art, and helps you
            understand it, record it, and own the story behind it.
          </p>
        </div>

        <div className="manifesto__table">
          <div className="manifesto__row manifesto__row--head">
            <span />
            <span>Others</span>
            <span>Atelier</span>
          </div>
          {COMPARE.map(row => (
            <div key={row.label} className="manifesto__row">
              <span className="manifesto__row-label">{row.label}</span>
              <span className="manifesto__row-them">{row.them}</span>
              <span className="manifesto__row-us">{row.us}</span>
            </div>
          ))}
        </div>

        <div className="manifesto__cta-row">
          <button className="public-hero__cta" onClick={onLogin}>
            Enter the studio →
          </button>
        </div>

      </div>
    </section>
  )
}
