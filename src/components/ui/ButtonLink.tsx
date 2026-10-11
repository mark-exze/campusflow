import { Link } from 'react-router-dom'
import type { LinkProps } from 'react-router-dom'

import { buttonClasses, type ButtonSize, type ButtonVariant } from './variants'

export type ButtonLinkProps = LinkProps & {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function ButtonLink({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />
}