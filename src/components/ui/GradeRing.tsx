import { cn, getGradeBandLabel, getGradeColor } from '../../lib/utils'

export type GradeRingProps = {
  /** Percentage, 0-100. */
  value: number
  size?: number
  label?: string
  className?: string
}

/**
 * Circular grade indicator. Decorative value text is exposed to assistive
 * technology through an accessible label so the ring is never the only
 * carrier of the information.
 */
export function GradeRing({ value, size = 56, label, className }: GradeRingProps) {
  const clamped = Math.min(100, Math.max(0, value))
  const band = getGradeBandLabel(clamped)
  const strokeWidth = 5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - clamped / 100)

  return (
    <div
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label ? `${label}: ` : ''}${Math.round(clamped)} percent, grade ${band}`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-slate-200 dark:stroke-slate-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="stroke-brand-500 transition-[stroke-dashoffset] dark:stroke-brand-400"
        />
      </svg>
      <span
        className={cn(
          'absolute font-semibold tabular-nums leading-none',
          size >= 64 ? 'text-base' : 'text-sm',
          getGradeColor(clamped),
        )}
      >
        {band}
      </span>
    </div>
  )
}