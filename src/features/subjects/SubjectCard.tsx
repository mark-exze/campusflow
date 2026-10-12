import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { GradeRing } from '../../components/ui/GradeRing'
import { Icon } from '../../components/ui/Icon'
import { DAY_NAMES_FULL } from '../../lib/constants'
import { cn, getGradeBandLabel } from '../../lib/utils'
import type { SubjectAssignmentCounts } from '../../lib/subjects'
import type { Subject } from '../../types'

export type SubjectCardProps = {
  subject: Subject
  counts: SubjectAssignmentCounts
  onEdit: (subject: Subject) => void
  onToggleArchive: (subject: Subject) => void
  onDelete: (subject: Subject) => void
}

function scheduleSummary(schedule: Subject['schedule']): string {
  if (schedule.length === 0) return 'No class times'

  return schedule
    .map((slot) => {
      const dayName = DAY_NAMES_FULL[slot.dayOfWeek] ?? 'Day'
      return `${dayName.slice(0, 3)} ${slot.startTime}`
    })
    .join(' · ')
}

export function SubjectCard({
  subject,
  counts,
  onEdit,
  onToggleArchive,
  onDelete,
}: SubjectCardProps) {
  return (
    <Card
      className={cn(
        'flex h-full flex-col gap-4',
        subject.archived && 'border-dashed bg-slate-50/60 dark:bg-slate-900/40',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'mt-1 w-1.5 shrink-0 self-stretch rounded-full',
            subject.archived ? 'bg-slate-300 dark:bg-slate-600' : subject.color,
          )}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase dark:text-slate-500">
                {subject.code}
              </p>
              <h3
                className={cn(
                  'mt-0.5 text-sm font-semibold',
                  subject.archived
                    ? 'text-slate-500 dark:text-slate-400'
                    : 'text-slate-900 dark:text-slate-100',
                )}
              >
                {subject.name}
              </h3>
            </div>

            {subject.archived ? null : (
              <GradeRing value={subject.grade} size={52} label={subject.name} />
            )}
          </div>

          <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
            {subject.instructor ? `${subject.instructor} · ` : ''}
            {subject.credits} credits
            {subject.location ? ` · ${subject.location}` : ''}
          </p>
        </div>
      </div>

      <p className="truncate text-xs text-slate-500 dark:text-slate-400" title={scheduleSummary(subject.schedule)}>
        {scheduleSummary(subject.schedule)}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {subject.archived ? (
          <Badge tone="neutral" icon="Archive">
            Archived
          </Badge>
        ) : (
          <Badge tone="brand">{getGradeBandLabel(subject.grade)} band</Badge>
        )}
        <Badge tone="neutral" icon="Clock">
          {counts.active} active
        </Badge>
        <Badge tone="success" icon="CheckCircle2">
          {counts.completed} done
        </Badge>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-1 border-t border-slate-200 pt-3 dark:border-slate-800">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(subject)}
          aria-label={`Edit ${subject.name}`}
        >
          <Icon name="Pencil" className="size-3.5" />
          Edit
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleArchive(subject)}
          aria-label={
            subject.archived ? `Restore ${subject.name}` : `Archive ${subject.name}`
          }
        >
          <Icon name={subject.archived ? 'ArchiveRestore' : 'Archive'} className="size-3.5" />
          {subject.archived ? 'Restore' : 'Archive'}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="ml-auto text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
          onClick={() => onDelete(subject)}
          aria-label={`Delete ${subject.name}`}
        >
          <Icon name="Trash2" className="size-3.5" />
          Delete
        </Button>
      </div>
    </Card>
  )
}
