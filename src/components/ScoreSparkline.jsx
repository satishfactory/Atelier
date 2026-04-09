// ScoreSparkline — pure SVG score progression, no charting library
// Props: sessions = [{ version, score_overall }], width, height

const W = 260
const H = 80
const PAD = 12

export default function ScoreSparkline({ sessions = [] }) {
  const points = sessions
    .filter(s => s.score_overall != null)
    .map(s => ({ v: s.version, score: s.score_overall }))

  if (points.length < 2) return null

  const minScore = Math.max(0,  Math.min(...points.map(p => p.score)) - 10)
  const maxScore = Math.min(100, Math.max(...points.map(p => p.score)) + 10)
  const range    = maxScore - minScore || 1
  const xStep    = (W - PAD * 2) / (points.length - 1)

  const toX = i      => PAD + i * xStep
  const toY = score  => PAD + (H - PAD * 2) * (1 - (score - minScore) / range)

  const polyline = points.map((p, i) => `${toX(i)},${toY(p.score)}`).join(' ')

  return (
    <div className="score-sparkline">
      <p className="score-sparkline__label">Score progression</p>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: 'block' }}>
        {/* Baseline */}
        <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--border)" strokeWidth="0.5" />
        {/* Line */}
        <polyline
          points={polyline}
          fill="none"
          stroke="var(--warm)"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Dots + version labels */}
        {points.map((p, i) => (
          <g key={p.v}>
            <circle cx={toX(i)} cy={toY(p.score)} r="3" fill="var(--warm)" />
            <text
              x={toX(i)}
              y={H - 1}
              textAnchor="middle"
              fontSize="8"
              fill="var(--text-muted)"
            >
              v{p.v}
            </text>
            <text
              x={toX(i)}
              y={toY(p.score) - 6}
              textAnchor="middle"
              fontSize="9"
              fill="var(--text)"
            >
              {p.score}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
