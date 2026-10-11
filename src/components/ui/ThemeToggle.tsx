import { useTheme } from '../../hooks/useTheme'
import { cn } from '../../lib/utils'
import { Icon } from './Icon'

const THEME_META = {
  system: {
    icon: 'Monitor',
    label: 'System',
    description: 'Follows your device appearance',
    next: 'dark',
  },
  dark: { icon: 'Moon', label: 'Dark', description: 'Always dark', next: 'light' },
  light: { icon: 'Sun', label: 'Light', description: 'Always light', next: 'system' },
} as const

export type ThemeToggleProps = {
  /** 'cycle' walks light -> dark -> system, 'toggle' flips light <-> dark. */
  mode?: 'cycle' | 'toggle'
  showLabel?: boolean
  className?: string
}

export function ThemeToggle({
  mode = 'cycle',
  showLabel = false,
  className,
}: ThemeToggleProps) {
  const { theme, cycleTheme, toggleTheme } = useTheme()
  const meta = THEME_META[theme]
  const action = mode === 'cycle' ? cycleTheme : toggleTheme
  const actionLabel = mode === 'cycle' ? `Switch to ${meta.next} theme` : 'Toggle theme'

  return (
    <button
      type="button"
      onClick={action}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
        className,
      )}
      aria-label={`${actionLabel} (current: ${meta.label})`}
      title={`${meta.label} theme — ${meta.description}`}
    >
      <Icon name={meta.icon} className="size-4" />
      {showLabel ? <span>{meta.label}</span> : null}
    </button>
  )
}