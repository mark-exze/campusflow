import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'

import { buttonClasses, type ButtonSize, type ButtonVariant } from './variants'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClasses(variant, size, className)} {...props} />
  )
})