import type { ReactNode } from 'react'

import { badgeClasses, type BadgeTone } from './variants'
import { Icon } from './Icon'

export type BadgeProps = {
  tone?: BadgeTone
  icon?: string
  className?: string
  children: ReactNode
}

export function Badge({ tone = 'neutral', icon, className, children }: BadgeProps) {
  return (
    <span className={badgeClasses(tone, className)}>
      {icon ? <Icon name={icon} className="size-3" /> : null}
      {children}
    </span>
  )
}