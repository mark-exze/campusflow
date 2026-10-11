import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { ThemeToggle } from '../../components/ui/ThemeToggle'
import { useTheme } from '../../hooks/useTheme'
import { APP_NAME } from '../../lib/constants'
import { useAssignments } from '../assignments/store'

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', description: 'Always light' },
  { value: 'dark', label: 'Dark', description: 'Always dark' },
  { value: 'system', label: 'System', description: 'Match your device' },
] as const

const PLANNED_FEATURES = [
  'AI academic planning and study schedules',
  'AI assignment assistance for multiple-choice, essay and other formats',
  'PDF, DOCX and image uploads',
  'Grade calculator with custom weights',
  'Cloud sync and accounts across devices',
] as const

export function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const { resetToSampleData, assignments } = useAssignments()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Preferences"
        description="Appearance and local data. Phase 1 — no account or sync yet."
      />

      <Card>
        <CardHeader
          title="Appearance"
          description="Choose a theme. System follows your device setting."
          icon="Settings"
          action={<ThemeToggle />}
        />
        <CardBody className="mt-4">
          <div
            role="radiogroup"
            aria-label="Theme"
            className="grid gap-2 sm:grid-cols-3"
          >
            {THEME_OPTIONS.map((option) => {
              const isActive = theme === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setTheme(option.value)}
                  className={
                    isActive
                      ? 'rounded-xl border-2 border-brand-500 bg-brand-50/60 p-3 text-left dark:bg-brand-500/10'
                      : 'rounded-xl border border-slate-200 p-3 text-left transition-colors hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                  }
                >
                  <span className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                    {option.description}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            Resolved theme: <span className="font-medium">{resolvedTheme}</span>
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Local data"
          description="Everything is stored in this browser only."
          icon="RotateCcw"
        />
        <CardBody className="mt-4 space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Assignments stored locally: <span className="font-medium">{assignments.length}</span>. Sample
            subjects and class schedules are not editable in this phase.
          </p>
          <Button variant="secondary" size="sm" onClick={() => resetToSampleData()}>
            Restore sample assignments
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Not available yet"
          description="Features planned for later phases."
          icon="AlertCircle"
        />
        <CardBody className="mt-4">
          <ul className="space-y-2">
            {PLANNED_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-slate-300 dark:bg-slate-600"
                />
                <span className="text-sm text-slate-600 dark:text-slate-300">{feature}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{APP_NAME} — Phase 1</Badge>
            <Badge tone="neutral">v0.1.0</Badge>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}