import { Outlet } from 'react-router-dom'

import { StorageNotice } from '../ui/StorageNotice'
import { MobileHeader, MobileNav } from './MobileNav'
import { Sidebar } from './Sidebar'

/**
 * Application shell: persistent desktop sidebar, mobile top bar + bottom
 * navigation, and the routed page area.
 */
export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to content
      </a>

      <Sidebar />

      <div className="lg:pl-64">
        <MobileHeader />
        <main
          id="main-content"
          className="mx-auto w-full max-w-6xl px-4 pb-24 pt-5 sm:px-6 lg:pb-10 lg:pt-8"
        >
          <StorageNotice />
          <Outlet />
        </main>
      </div>

      <MobileNav />
    </div>
  )
}