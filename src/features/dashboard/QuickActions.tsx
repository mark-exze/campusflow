import { Link } from 'react-router-dom'

import { Card, CardHeader } from '../../components/ui/Card'
import { Icon } from '../../components/ui/Icon'
import { MOCK_QUICK_ACTIONS } from '../../lib/mockData'

export type QuickActionsProps = {
  actions?: typeof MOCK_QUICK_ACTIONS
}

export function QuickActions({ actions = MOCK_QUICK_ACTIONS }: QuickActionsProps) {
  return (
    <Card>
      <CardHeader
        title="Quick actions"
        description="Jump straight to what you need"
        icon="PlusCircle"
      />

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {actions.map((action) => (
          <Link
            key={action.id}
            to={action.to}
            className="group flex flex-col gap-2 rounded-xl border border-slate-200 p-3 transition-colors hover:border-brand-300 hover:bg-brand-50/50 dark:border-slate-800 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition-colors group-hover:bg-brand-100 group-hover:text-brand-700 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-brand-500/20 dark:group-hover:text-brand-300">
              <Icon name={action.icon} className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                {action.label}
              </span>
              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                {action.description}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </Card>
  )
}