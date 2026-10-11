import { NavLink } from 'react-router-dom'

import { cn } from '../../lib/utils'
import { APP_NAME, NAV_ITEMS, ROUTES } from '../../lib/constants'
import { Icon } from '../ui/Icon'
import { ThemeToggle } from '../ui/ThemeToggle'

export function MobileHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 lg:hidden">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
        <Icon name="GraduationCap" className="size-4" />
      </span>
      <span className="truncate text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {APP_NAME}
      </span>
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  )
}

export function MobileNav() {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-slate-800 dark:bg-slate-900 lg:hidden"
    >
      <ul className="flex items-stretch justify-around">
        {NAV_ITEMS.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.to === ROUTES.home}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                  isActive
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={item.icon} className="size-5" strokeWidth={isActive ? 2.4 : 2} />
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}