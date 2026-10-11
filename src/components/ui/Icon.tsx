import { iconRegistry } from './icons'

export type IconProps = {
  /** Key from {@link iconRegistry}. Unknown names render nothing. */
  name: string
  className?: string
  strokeWidth?: number
}

export function Icon({ name, className, strokeWidth }: IconProps) {
  const IconComponent = iconRegistry[name]

  if (!IconComponent) return null

  return <IconComponent className={className} strokeWidth={strokeWidth} aria-hidden="true" />
}