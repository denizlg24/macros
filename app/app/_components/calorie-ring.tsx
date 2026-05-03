type Props = {
  consumed: number
  target: number | null
}

export function CalorieRing({ consumed, target }: Props) {
  const r = 72
  const cx = 90
  const cy = 90
  const strokeWidth = 11
  const circ = 2 * Math.PI * r
  const arcLength = (270 / 360) * circ
  const rotation = 135

  const fillRatio =
    target != null && target > 0 ? Math.min(consumed / target, 1) : 0
  const fillLength = fillRatio * arcLength

  return (
    <svg viewBox="0 0 180 180" className="w-full" aria-hidden="true">
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        className="stroke-muted"
        strokeWidth={strokeWidth}
        strokeDasharray={`${arcLength} ${circ - arcLength}`}
        strokeLinecap="round"
        transform={`rotate(${rotation}, ${cx}, ${cy})`}
      />
      {fillLength > 0 && (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={strokeWidth}
          strokeDasharray={`${fillLength} ${circ - fillLength}`}
          strokeLinecap="round"
          transform={`rotate(${rotation}, ${cx}, ${cy})`}
        />
      )}
    </svg>
  )
}
