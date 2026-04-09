// Radar chart for 8 painting dimension scores

const DIMS = [
  { key: 'score_salience',   label: 'Sal',  color: 'var(--dim-salience)'   },
  { key: 'score_gaze',       label: 'Gaze', color: 'var(--dim-gaze)'       },
  { key: 'score_fluency',    label: 'Flu',  color: 'var(--dim-fluency)'    },
  { key: 'score_emotion',    label: 'Emo',  color: 'var(--dim-emotion)'    },
  { key: 'score_complexity', label: 'Cmp',  color: 'var(--dim-complexity)' },
  { key: 'score_mirror',     label: 'Mir',  color: 'var(--dim-mirror)'     },
  { key: 'score_colour',     label: 'Col',  color: 'var(--dim-colour)'     },
  { key: 'score_narrative',  label: 'Nar',  color: 'var(--dim-narrative)'  },
]

function pt(i, n, val, cx, cy, r) {
  const angle = (i / n) * 2 * Math.PI - Math.PI / 2
  const ratio = Math.max(0, Math.min(val, 100)) / 100
  return [cx + r * ratio * Math.cos(angle), cy + r * ratio * Math.sin(angle)]
}

export default function ScoreWheel({ painting, size = 160 }) {
  if (!painting) return null
  const cx = size / 2, cy = size / 2
  const r  = size * 0.36
  const lr = size * 0.48
  const n  = DIMS.length
  const scores = DIMS.map(d => painting[d.key] || 0)

  const polygon = scores.map((s, i) => pt(i, n, s, cx, cy, r).join(',')).join(' ')
  const gridLevels = [25, 50, 75, 100]

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      {gridLevels.map(g => (
        <polygon key={g}
          points={DIMS.map((_, i) => pt(i, n, g, cx, cy, r).join(',')).join(' ')}
          fill="none" stroke="var(--border)" strokeWidth="0.5" />
      ))}
      {DIMS.map((_, i) => {
        const [x, y] = pt(i, n, 100, cx, cy, r)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeWidth="0.5" />
      })}
      <polygon points={polygon} fill="var(--warm)" fillOpacity="0.18" stroke="var(--warm)" strokeWidth="1.5" strokeLinejoin="round" />
      {scores.map((s, i) => {
        const [x, y] = pt(i, n, s, cx, cy, r)
        return <circle key={i} cx={x} cy={y} r={2.5} fill={DIMS[i].color} />
      })}
      {DIMS.map((d, i) => {
        const [x, y] = pt(i, n, 100, cx, cy, lr)
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontSize={size * 0.068} fill="var(--text-muted)"
            fontFamily="Inter, system-ui, sans-serif">
            {d.label}
          </text>
        )
      })}
    </svg>
  )
}
