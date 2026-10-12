import { useState } from 'react'

import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { ButtonLink } from '../ui/ButtonLink'
import { Card } from '../ui/Card'
import { Icon } from '../ui/Icon'
import { ProgressBar } from '../ui/ProgressBar'
import { cn } from '../../lib/utils'
import { buildOnboardingSteps, countCompletedSteps } from '../../lib/onboarding'
import type { OnboardingInput } from '../../lib/onboarding'

export type GettingStartedProps = {
  input: OnboardingInput
  /** Hides the guide. Persisted by the parent. */
  onDismiss: () => void
}

/**
 * Lightweight, dismissible getting-started panel.
 *
 * Progress comes from real records, so a sample subject never counts towards a
 * step. The parent renders this only while the guide should be visible, so
 * dismissing removes the card entirely and a labelled entry point brings it
 * back.
 */
export function GettingStarted({ input, onDismiss }: GettingStartedProps) {
  const [showDetail, setShowDetail] = useState(false)

  const steps = buildOnboardingSteps(input)
  const completed = countCompletedSteps(steps)
  const percentage = Math.round((completed / steps.length) * 100)

  return (
    <Card
      data-testid="getting-started"
      className="border-brand-200 bg-brand-50/40 dark:border-brand-500/30 dark:bg-brand-500/5"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Getting started
              </h2>
              <Badge tone="brand">
                {completed} of {steps.length} done
              </Badge>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Four quick steps to make CampusFlow yours. The subjects and
              assignments already here are sample data you can explore, edit or
              delete — they do not count towards these steps.
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={onDismiss}
            aria-label="Hide getting started"
            title="Hide getting started"
          >
            <Icon name="X" className="size-4" />
          </Button>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Setup progress</span>
            <span className="text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {percentage}%
            </span>
          </div>
          <ProgressBar value={percentage} size="md" label="Onboarding progress" />
        </div>

        <ul className="space-y-2">
          {steps.map((step) => (
            <li key={step.id}>
              <StepRow step={step} />
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-brand-200/60 pt-3 dark:border-brand-500/20">
          <button
            type="button"
            onClick={() => setShowDetail((current) => !current)}
            aria-expanded={showDetail}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <Icon
              name="ChevronRight"
              className={cn('size-3.5 transition-transform', showDetail && 'rotate-90')}
            />
            {showDetail ? 'Less detail' : 'What counts as done?'}
          </button>

          <span className="text-[11px] text-slate-500 dark:text-slate-500">
            You can hide this any time.
          </span>
        </div>

        {showDetail ? (
          <p className="rounded-lg bg-white/70 p-3 text-[11px] leading-relaxed text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
            A step is complete only once you have done the thing yourself:
            saving a display name, creating a subject with your own name, or
            adding an assignment. Sample records that ship with the app are
            never counted, so hiding or removing them does not undo your
            progress.
          </p>
        ) : null}
      </div>
    </Card>
  )
}

function StepRow({
  step,
}: {
  step: ReturnType<typeof buildOnboardingSteps>[number]
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border p-2.5',
        step.isComplete
          ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/10'
          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex size-6 shrink-0 items-center justify-center rounded-full',
          step.isComplete
            ? 'bg-emerald-500 text-white'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-500',
        )}
      >
        <Icon name={step.isComplete ? 'Check' : 'Circle'} className="size-3.5" />
      </span>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-sm font-medium',
            step.isComplete
              ? 'text-emerald-800 dark:text-emerald-300'
              : 'text-slate-900 dark:text-slate-100',
          )}
        >
          {step.title}
        </p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {step.description}
        </p>
      </div>

      {step.isComplete ? (
        <span className="shrink-0 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          Done
        </span>
      ) : (
        <ButtonLink to={step.to} variant="secondary" size="sm" className="shrink-0">
          {step.cta}
        </ButtonLink>
      )}
    </div>
  )
}
