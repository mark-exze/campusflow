import { NavLink } from 'react-router-dom'

import { cn } from '../../lib/utils'
import { APP_NAME, NAV_ITEMS, ROUTES } from '../../lib/constants'
import { Icon } from '../ui/Icon'
import { ThemeToggle } from '../ui/ThemeToggle'

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5 dark:border-slate-800">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
          <Icon name="GraduationCap" className="size-5" />
        </span>
        <span className="truncate text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {APP_NAME}
        </span>
      </div>

      <nav aria-label="Main" className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === ROUTES.home}
            className={({ isActive }) => sidebarItemClass(isActive)}
          >
            <Icon name={item.icon} className="size-5 shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 px-3 py-3 dark:border-slate-800">
        <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
          <span className="text-xs text-slate-500 dark:text-slate-400">Appearance</span>
          <ThemeToggle />
        </div>
        <p className="mt-3 px-1 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
          Phase 1 build — sample data only. No account, AI or cloud sync.
        </p>
      </div>
    </aside>
  )
}

function sidebarItemClass(isActive: boolean): string {
  return cn(
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
  )
}