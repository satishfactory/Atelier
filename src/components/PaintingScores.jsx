const BOT_LABELS = {
  bot_formalist:       'Formalist',
  bot_neuroscientist:  'Neuroscientist',
  bot_phenomenologist: 'Phenomenologist',
  bot_art_historian:   'Art Historian',
  bot_collector:       'Collector',
  bot_colour_theorist: 'Colour Theorist',
}

const SCORE_LABELS = {
  score_overall:    'Overall',
  score_salience:   'Salience',
  score_emotion:    'Emotion',
  score_complexity: 'Complexity',
  score_colour:     'Colour',
  score_fluency:    'Fluency',
}

function ScoreBar({ label, value, max = 10 }) {
  if (value == null) return null
  const pct = Math.round((value / max) * 100)
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <span className="t-micro" style={{ color: 'var(--warm)', fontWeight: 600 }}>{value}</span>
      </div>
      <div style={{ height: 3, background: 'var(--border)', borderRadius: 99 }}>
        <div style={{ height: 3, width: `${pct}%`, background: 'var(--warm)', borderRadius: 99, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  )
}

export default function PaintingScores({ painting }) {
  const botEntries = Object.entries(BOT_LABELS).filter(([k]) => painting[k] != null)
  const scoreEntries = Object.entries(SCORE_LABELS).filter(([k]) => painting[k] != null)

  if (botEntries.length === 0 && scoreEntries.length === 0) return null

  return (
    <div>
      {scoreEntries.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p className="t-micro" style={{ color: 'var(--warm)', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Overall Scores</p>
          {scoreEntries.map(([k, label]) => <ScoreBar key={k} label={label} value={painting[k]} />)}
        </div>
      )}
      {botEntries.length > 0 && (
        <div>
          <p className="t-micro" style={{ color: 'var(--warm)', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Critic Perspectives</p>
          {botEntries.map(([k, label]) => <ScoreBar key={k} label={label} value={painting[k]} />)}
        </div>
      )}
    </div>
  )
}
