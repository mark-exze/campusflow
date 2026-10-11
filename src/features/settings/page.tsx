import { useState } from 'react'

import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { ThemeToggle } from '../../components/ui/ThemeToggle'
import { Icon } from '../../components/ui/Icon'
import { useTheme } from '../../hooks/useTheme'
import { useProfile } from '../../hooks/useProfile'
import { APP_NAME } from '../../lib/constants'
import { schoolLevelLabel } from '../../lib/profile'
import { useAssignments } from '../assignments/store'
import { useSubjects } from '../subjects/store'
import { ProfileForm } from '../profile/ProfileForm'
import type { StudentProfile } from '../../types'

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
  const { profile, saveProfile, resetProfile } = useProfile()
  const { assignments, resetToSampleData } = useAssignments()
  const { subjects, resetSubjects } = useSubjects()

  const [savedNote, setSavedNote] = useState<string | null>(null)

  const handleProfileSubmit = (next: StudentProfile) => {
    const persisted = saveProfile(next)

    if (!persisted) {
      setSavedNote('Not saved — your browser would not store this change.')
      return
    }

    setSavedNote('Profile saved to this browser.')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Preferences"
        description="Your details, appearance and local data. Phase 1 — no account or sync yet."
      />

      <p aria-live="polite" className="sr-only">
        {savedNote ?? ''}
      </p>

      <Card>
        <CardHeader
          title="Student profile"
          description="Used on your dashboard and subject labels."
          icon="User"
          action={<ThemeToggle />}
        />
        <CardBody className="mt-4">
          <ProfileForm
            profile={profile}
            onSubmit={handleProfileSubmit}
            onReset={() => {
              resetProfile()
              setSavedNote('Profile reset to defaults.')
            }}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Appearance"
          description="Choose a theme. System follows your device setting."
          icon="Settings"
        />
        <CardBody className="mt-4">
          <div role="radiogroup" aria-label="Theme" className="grid gap-2 sm:grid-cols-3">
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
          <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <DataStat label="Subjects" value={subjects.length} />
            <DataStat label="Assignments" value={assignments.length} />
            <DataStat label="Display name" value={profile.displayName || 'Not set'} />
            <DataStat label="School level" value={schoolLevelLabel(profile.schoolLevel)} />
          </dl>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => resetToSampleData()}>
              <Icon name="RotateCcw" className="size-4" />
              Restore sample assignments
            </Button>
            <Button variant="secondary" size="sm" onClick={() => resetSubjects()}>
              <Icon name="RotateCcw" className="size-4" />
              Restore sample subjects
            </Button>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500">
            Sample data is only restored when you press a restore button — it is
            never re-created automatically after you delete something.
          </p>
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

function DataStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  )
}
