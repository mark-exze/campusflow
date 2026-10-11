import { Icon } from '../../components/ui/Icon'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { Card } from '../../components/ui/Card'

export type DashboardStatsProps = {
  stats: {
    active: number
    dueToday: number
    overdue: number
    completed: number
    classCount: number
    classHours: number
    averageProgress: number
  }
}

const TILES = [
  { key: 'classes', icon: 'CalendarDays', label: 'Classes today' },
  { key: 'dueToday', icon: 'Clock', label: 'Due today' },
  { key: 'overdue', icon: 'AlertCircle', label: 'Overdue' },
  { key: 'completed', icon: 'CheckCircle2', label: 'Completed' },
] as const

export function DashboardStats({ stats }: DashboardStatsProps) {
  const values = {
    classes: `${stats.classCount} · ${stats.classHours}h`,
    dueToday: stats.dueToday,
    overdue: stats.overdue,
    completed: stats.completed,
  }

  return (
    <section aria-label="Day summary" className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {TILES.map((tile) => {
          const isOverdue = tile.key === 'overdue' && stats.overdue > 0
          const value = values[tile.key]

          return (
            <Card key={tile.key} padded={false} className="p-3 sm:p-4">
              <div className="flex items-center gap-2.5">
                <span
                  className={
                    isOverdue
                      ? 'flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400'
                      : 'flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }
                >
                  <Icon name={tile.icon} className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {tile.label}
                  </p>
                  <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
                    {value}
                  </p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Open-work progress, so the summary reflects in-progress assignments
          rather than just counts. */}
      <Card padded={false} className="flex items-center gap-3 p-3 sm:p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">Open work progress</p>
            <p className="text-xs font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {stats.averageProgress}%
            </p>
          </div>
          <ProgressBar
            value={stats.averageProgress}
            size="md"
            label="Average progress across open assignments"
            className="mt-2"
          />
          <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            Average across {stats.active} open assignment{stats.active === 1 ? '' : 's'}
          </p>
        </div>
      </Card>
    </section>
  )
}