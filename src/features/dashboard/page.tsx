import { useMemo } from 'react'
import { Link } from 'react-router-dom'

import { GettingStarted } from '../../components/dashboard/GettingStarted'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { Icon } from '../../components/ui/Icon'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAssignments } from '../assignments/store'
import { useOnboarding } from '../../hooks/useOnboarding'
import { useProfile } from '../../hooks/useProfile'
import { ROUTES } from '../../lib/constants'
import { formatDayHeader, getTodayDateString } from '../../lib/date'
import { buildOnboardingSteps, shouldShowOnboarding } from '../../lib/onboarding'
import type { OnboardingInput } from '../../lib/onboarding'
import { displayNameOrFallback } from '../../lib/profile'
import { getStudentSubjects, hasStudentAssignment } from '../../lib/seedData'
import { DashboardStats } from './DashboardStats'
import { QuickActions } from './QuickActions'
import { SubjectOverview } from './SubjectOverview'
import { TodaysClasses } from './TodaysClasses'
import { UpcomingAssignments } from './UpcomingAssignments'

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function DashboardPage() {
  const {
    subjects,
    assignments,
    todayClasses,
    upcomingAssignments,
    overdueAssignments,
    stats,
    getSubject,
    toggleComplete,
  } = useAssignments()
  const { profile } = useProfile()
  const onboarding = useOnboarding()

  // Completion derives from records the student made their own, never from
  // untouched sample data, so the two lists can never drift apart.
  const onboardingInput = useMemo<OnboardingInput>(
    () => ({
      displayName: profile.displayName,
      hasUserSubject: getStudentSubjects(subjects).length > 0,
      hasUserAssignment: hasStudentAssignment(assignments),
      visitedCalendar: onboarding.visitedCalendar,
    }),
    [profile.displayName, subjects, assignments, onboarding.visitedCalendar],
  )

  const onboardingComplete = useMemo(
    () => buildOnboardingSteps(onboardingInput).every((step) => step.isComplete),
    [onboardingInput],
  )

  const showOnboarding =
    shouldShowOnboarding(buildOnboardingSteps(onboardingInput), onboarding.dismissed) &&
    !onboardingComplete

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${profile.academicTerm} · ${profile.academicYear}`}
        title={`${getGreeting()}, ${displayNameOrFallback(profile)}`}
        description={`Here is your day at a glance — ${formatDayHeader(
          getTodayDateString(),
          profile.dateFormat,
        )}.`}
        actions={
          <>
            <Badge tone="brand" icon="Sparkles">
              Local data
            </Badge>

            {showOnboarding ? null : (
              <Button
                variant="ghost"
                size="sm"
                onClick={onboarding.restore}
                title="Show the getting started steps"
              >
                <Icon name="RotateCcw" className="size-4" />
                Getting started
              </Button>
            )}

            <ButtonLink to={ROUTES.subjects} variant="secondary" size="sm">
              Your subjects
            </ButtonLink>
            <ButtonLink to={ROUTES.assignments} variant="primary" size="sm">
              Manage assignments
            </ButtonLink>
          </>
        }
      />

      {showOnboarding ? (
        <GettingStarted input={onboardingInput} onDismiss={onboarding.dismiss} />
      ) : null}

      <DashboardStats stats={stats} />

      <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
        <TodaysClasses classes={todayClasses} getSubject={getSubject} />
        <UpcomingAssignments
          assignments={upcomingAssignments}
          overdueAssignments={overdueAssignments}
          getSubject={getSubject}
          onToggleComplete={toggleComplete}
        />
      </div>

      <SubjectOverview subjects={subjects} />

      <QuickActions />

      <footer className="pt-2 text-center text-xs text-slate-500 dark:text-slate-500">
        <p>
          Grades, AI planning and cloud sync are{' '}
          <Link
            to={ROUTES.settings}
            className="font-medium text-slate-500 underline underline-offset-2 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          >
            not yet available
          </Link>
          .
        </p>
      </footer>
    </div>
  )
}
