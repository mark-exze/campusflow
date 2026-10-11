import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

import { cn } from '../../lib/utils'
import { Icon } from './Icon'

export const controlBase =
  'h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-brand-500 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500'

function controlClass(invalid: boolean, className?: string): string {
  return cn(
    controlBase,
    invalid ? 'border-rose-400 dark:border-rose-500/60' : 'border-slate-300 dark:border-slate-700',
    className,
  )
}

export type FieldProps = {
  id: string
  label: string
  error?: string | undefined
  hint?: string | undefined
  required?: boolean
  children: ReactNode
  className?: string | undefined
}

/** Label + control + inline error, wired together with aria attributes. */
export function Field({ id, label, error, hint, required, children, className }: FieldProps) {
  const errorId = `${id}-error`
  const hintId = `${id}-hint`

  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={id}
        className="block text-xs font-medium text-slate-600 dark:text-slate-300"
      >
        {label}
        {required ? (
          <span className="ml-0.5 text-rose-500" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {children}

      {hint && !error ? (
        <p id={hintId} className="text-xs text-slate-400 dark:text-slate-500">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean
}

export function Input({ invalid = false, className, ...props }: InputProps) {
  return <input className={controlClass(invalid, className)} {...props} />
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean
}

export function Select({ invalid = false, className, ...props }: SelectProps) {
  return (
    <select
      className={cn(controlClass(invalid, className), 'cursor-pointer')}
      aria-invalid={invalid ? true : undefined}
      {...props}
    />
  )
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean
}

export function Textarea({ invalid = false, className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        controlClass(invalid, className),
        'h-auto min-h-20 py-2 leading-relaxed resize-y',
      )}
      aria-invalid={invalid ? true : undefined}
      {...props}
    />
  )
}

/**
 * Accessible set of coloured swatches. Uses a radiogroup so keyboard users can
 * arrow-key through colours and screen readers announce the selection.
 */
export function ColorPicker({
  name,
  value,
  options,
  onChange,
  legend,
}: {
  name: string
  value: string
  options: readonly { value: string; label: string }[]
  onChange: (value: string) => void
  legend: string
}) {
  const generatedId = useId()
  const groupId = `${generatedId}-${name}`

  return (
    <div role="radiogroup" aria-labelledby={groupId} className="flex flex-wrap gap-2">
      <span id={groupId} className="sr-only">
        {legend}
      </span>

      {options.map((option) => {
        const isSelected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={option.label}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex size-9 items-center justify-center rounded-full border-2 transition-colors',
              isSelected
                ? 'border-brand-600 dark:border-brand-400'
                : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600',
            )}
          >
            <span aria-hidden="true" className={cn('size-6 rounded-full', option.value)} />
            {isSelected ? (
              <Icon name="Check" className="absolute size-3.5 text-white" />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
