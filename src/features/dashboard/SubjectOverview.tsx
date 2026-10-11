import { Link } from 'react-router-dom'

import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { GradeRing } from '../../components/ui/GradeRing'
import { Icon } from '../../components/ui/Icon'
import { ROUTES } from '../../lib/constants'
import type { Subject } from '../../types'

export type SubjectOverviewProps = {
  subjects: readonly Subject[]
}

export function SubjectOverview({ subjects }: SubjectOverviewProps) {
  const credits = subjects.reduce((total, subject) => total + subject.credits, 0)

  return (
    <Card>
      <CardHeader
        title="Subject overview"
        description={`${subjects.length} subjects · ${credits} credits`}
        icon="BookOpen"
        action={
          <Link
            to={ROUTES.subjects}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            All subjects
            <Icon name="ChevronRight" className="size-4" />
          </Link>
        }
      />

      <CardBody className="mt-4">
        {subjects.length === 0 ? (
          <EmptyState
            icon="BookOpen"
            title="No subjects yet"
            description="Add a subject to see it here and on your dashboard."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {subjects.map((subject) => (
              <li
                key={subject.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800"
              >
                <GradeRing value={subject.grade} size={52} label={subject.name} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {subject.code}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{subject.name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-slate-500">
                    {subject.credits} credits · {subject.instructor}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  )
}