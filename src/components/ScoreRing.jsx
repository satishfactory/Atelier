import '../styles/design-system.css'

const DIMENSIONS = [
  { key: 'salience',   color: 'var(--dim-salience)',   label: 'Salience'   },
  { key: 'gaze',       color: 'var(--dim-gaze)',       label: 'Gaze'       },
  { key: 'fluency',    color: 'var(--dim-fluency)',     label: 'Fluency'    },
  { key: 'emotion',    color: 'var(--dim-emotion)',     label: 'Emotion'    },
  { key: 'complexity', color: 'var(--dim-complexity)',  label: 'Complexity' },
  { key: 'mirror',     color: 'var(--dim-mirror)',      label: 'Mirror'     },
  { key: 'colour',     color: 'var(--dim-colour)',      label: 'Colour'     },
  { key: 'narrative',  color: 'var(--dim-narrative)',   label: 'Narrative'  },
]

function polarToXY(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * (Math.PI / 180)
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function segmentPath(cx, cy, innerR, outerR, startDeg, endDeg) {
  const s1 = polarToXY(cx, cy, innerR, startDeg)
  const s2 = polarToXY(cx, cy, outerR, startDeg)
  const e1 = polarToXY(cx, cy, outerR, endDeg)
  const e2 = polarToXY(cx, cy, innerR, endDeg)
  const large = endDeg - startDeg > 180 ? 1 : 0
  return [
    `M ${s1.x} ${s1.y}`,
    `L ${s2.x} ${s2.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${e1.x} ${e1.y}`,
    `L ${e2.x} ${e2.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${s1.x} ${s1.y}`,
    'Z'
  ].join(' ')
}

export default function ScoreRing({ scores = {}, size = 80, showLabels = false, onDimensionClick }) {
  const cx = size / 2
  const cy = size / 2
  const outerR = size * 0.44
  const innerR = size * 0.22
  const gap = 4
  const segAngle = (360 / 8) - gap

  const numericValues = Object.values(scores).filter(v => typeof v === 'number')
  const overall = scores.overall ||
    (numericValues.length
      ? Math.round(numericValues.reduce((a, b) => a + b, 0) / numericValues.length)
      : 0)

  return (
    <div className="score-ring-container" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {DIMENSIONS.map((dim, i) => {
          const score = scores[dim.key] || 0
          const startDeg = i * (360 / 8)
          const endDeg = startDeg + segAngle
          const fillR = innerR + (outerR - innerR) * (score / 100)
          return (
            <g key={dim.key}
               style={{ cursor: onDimensionClick ? 'pointer' : 'default' }}
               onClick={() => onDimensionClick?.(dim)}>
              <path d={segmentPath(cx, cy, innerR, outerR, startDeg, endDeg)}
                    fill={dim.color} opacity={0.15} />
              <path d={segmentPath(cx, cy, innerR, fillR, startDeg, endDeg)}
                    fill={dim.color} opacity={0.9} />
            </g>
          )
        })}
        <text x={cx} y={cy - 4} textAnchor="middle"
              style={{ fontFamily: 'var(--font-sans)', fontSize: size * 0.18,
                       fontWeight: 600, fill: 'var(--dark)' }}>
          {overall}
        </text>
        <text x={cx} y={cy + size * 0.12} textAnchor="middle"
              style={{ fontFamily: 'var(--font-sans)', fontSize: size * 0.1,
                       fill: 'var(--mid)' }}>
          overall
        </text>
      </svg>
    </div>
  )
}
