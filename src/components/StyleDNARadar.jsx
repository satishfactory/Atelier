// Style DNA — averaged radar across all evaluated paintings

const DIMS = [
  { key: 'score_salience',   label: 'Salience',   color: 'var(--dim-salience)'   },
  { key: 'score_gaze',       label: 'Gaze',       color: 'var(--dim-gaze)'       },
  { key: 'score_fluency',    label: 'Fluency',    color: 'var(--dim-fluency)'    },
  { key: 'score_emotion',    label: 'Emotion',    color: 'var(--dim-emotion)'    },
  { key: 'score_complexity', label: 'Complexity', color: 'var(--dim-complexity)' },
  { key: 'score_mirror',     label: 'Mirror',     color: 'var(--dim-mirror)'     },
  { key: 'score_colour',     label: 'Colour',     color: 'var(--dim-colour)'     },
  { key: 'score_narrative',  label: 'Narrative',  color: 'var(--dim-narrative)'  },
]

function pt(i, n, val, cx, cy, r) {
  const angle = (i / n) * 2 * Math.PI - Math.PI / 2
  const ratio = Math.max(0, Math.min(val, 100)) / 100
  return [cx + r * ratio * Math.cos(angle), cy + r * ratio * Math.sin(angle)]
}

export default function StyleDNARadar({ paintings = [] }) {
  const evaluated = paintings.filter(p => p.score_overall != null)
  if (evaluated.length === 0) return null

  const size = 260
  const cx = size / 2, cy = size / 2
  const r  = size * 0.34
  const lr = size * 0.47
  const n  = DIMS.length

  const avgScores = DIMS.map(d => {
    const vals = evaluated.map(p => p[d.key] || 0).filter(v => v > 0)
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  })

  const polygon = avgScores.map((s, i) => pt(i, n, s, cx, cy, r).join(',')).join(' ')
  const gridLevels = [25, 50, 75, 100]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <p className="t-micro" style={{ color: 'var(--warm)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Style DNA
      </p>
      <p className="t-micro" style={{ color: 'var(--text-muted)' }}>
        Averaged across {evaluated.length} evaluated painting{evaluated.length !== 1 ? 's' : ''}
      </p>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block', margin: '0 auto' }}>
        {gridLevels.map(g => (
          <polygon key={g}
            points={DIMS.map((_, i) => pt(i, n, g, cx, cy, r).join(',')).join(' ')}
            fill="none" stroke="var(--border)" strokeWidth="0.5" />
        ))}
        {DIMS.map((_, i) => {
          const [x, y] = pt(i, n, 100, cx, cy, r)
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth="0.5" />
        })}
        <polygon points={polygon} fill="var(--warm)" fillOpacity="0.15" stroke="var(--warm)" strokeWidth="1.5" strokeLinejoin="round" />
        {avgScores.map((s, i) => {
          const [x, y] = pt(i, n, s, cx, cy, r)
          return <circle key={i} cx={x} cy={y} r={3} fill={DIMS[i].color} />
        })}
        {DIMS.map((d, i) => {
          const [x, y] = pt(i, n, 100, cx, cy, lr)
          return (
            <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
              fontSize={size * 0.055} fill="var(--text-muted)"
              fontFamily="Inter, system-ui, sans-serif">
              {d.label}
            </text>
          )
        })}
      </svg>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', marginTop: 8 }}>
        {DIMS.map((d, i) => (
          <div key={d.key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
            <span className="t-micro" style={{ color: 'var(--text-muted)' }}>{d.label}</span>
            <span className="t-micro" style={{ color: 'var(--text)', fontWeight: 600, marginLeft: 'auto' }}>
              {Math.round(avgScores[i])}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
