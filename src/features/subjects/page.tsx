import { PageHeader } from '../../components/ui/PageHeader'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { Icon } from '../../components/ui/Icon'
import { EmptyState } from '../../components/ui/EmptyState'
import { Badge } from '../../components/ui/Badge'
import { GradeRing } from '../../components/ui/GradeRing'
import { getGradeBandLabel } from '../../lib/utils'
import { CURRENT_SEMESTER } from '../../lib/mockData'
import { useAssignments } from '../assignments/store'
import type { Subject } from '../../types'

export type SubjectSummary = {
  subject: Subject
  active: number
  completed: number
}

function buildSubjectSummaries(
  subjects: readonly Subject[],
  tally: (subjectId: string) => { active: number; completed: number },
): SubjectSummary[] {
  return subjects.map((subject) => ({ subject, ...tally(subject.id) }))
}

export function SubjectsPage() {
  const { subjects, assignments } = useAssignments()

  const summaries = buildSubjectSummaries(subjects, (subjectId) => ({
    active: assignments.filter(
      (assignment) => assignment.subjectId === subjectId && assignment.status !== 'completed',
    ).length,
    completed: assignments.filter(
      (assignment) => assignment.subjectId === subjectId && assignment.status === 'completed',
    ).length,
  }))

  const average =
    subjects.length > 0
      ? Math.round(subjects.reduce((total, subject) => total + subject.grade, 0) / subjects.length)
      : 0

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={CURRENT_SEMESTER}
        title="Subjects"
        description="Your courses, current grade bands and assignment counts."
        actions={
          <ButtonLink to="/assignments" variant="secondary" size="sm">
            <Icon name="ClipboardList" className="size-4" />
            Assignments
          </ButtonLink>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryTile label="Subjects" value={subjects.length} />
        <SummaryTile label="Average grade" value={`${average}% · ${getGradeBandLabel(average)}`} />
        <SummaryTile
          label="Credits"
          value={subjects.reduce((total, subject) => total + subject.credits, 0)}
        />
      </div>

      {summaries.length === 0 ? (
        <EmptyState
          icon="BookOpen"
          title="No subjects yet"
          description="Subjects are sample data in Phase 1."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {summaries.map(({ subject, active, completed }) => (
            <li key={subject.id}>
              <Card className="h-full">
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className={`mt-1 h-10 w-1.5 shrink-0 rounded-full ${subject.color}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium tracking-wide text-slate-400 uppercase dark:text-slate-500">
                      {subject.code}
                    </p>
                    <h2 className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {subject.name}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {subject.instructor} · {subject.credits} credits
                    </p>
                  </div>
                  <GradeRing value={subject.grade} size={56} label={subject.name} />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                  <Badge tone="brand">{getGradeBandLabel(subject.grade)} band</Badge>
                  <Badge tone="neutral" icon="Clock">
                    {active} active
                  </Badge>
                  <Badge tone="success" icon="CheckCircle2">
                    {completed} done
                  </Badge>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Card>
        <CardHeader
          title="Grade calculator"
          description="Weighted grade calculations are part of the gradebook, not this phase."
          icon="BookOpen"
        />
        <CardBody className="mt-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Grade rings above come from sample subject data. A working calculator with your own
            weights arrives in a later phase.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}

function SummaryTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </Card>
  )
}