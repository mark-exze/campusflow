/**
 * Shared variant class maps used by Button, ButtonLink and Badge.
 * Kept outside the component files so class maps can be reused without
 * breaking React Fast Refresh rules (only components may be exported
 * from component files).
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

export const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors select-none disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]'

export const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-600 text-white shadow-sm hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400 dark:text-slate-950',
  secondary:
    'border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
  ghost:
    'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  danger:
    'bg-rose-600 text-white shadow-sm hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-400',
}

export const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-sm',
  icon: 'size-10 p-0',
}

export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return [buttonBase, buttonVariants[variant], buttonSizes[size], className]
    .filter(Boolean)
    .join(' ')
}

export type BadgeTone = 'brand' | 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export const badgeBase =
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap'

export const badgeTones: Record<BadgeTone, string> = {
  brand:
    'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300',
  neutral:
    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  success:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  warning:
    'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  danger: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  info: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
}

export function badgeClasses(tone: BadgeTone = 'neutral', className?: string): string {
  return [badgeBase, badgeTones[tone], className].filter(Boolean).join(' ')
}