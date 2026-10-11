import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AppLayout } from './components/layout/AppLayout'
import { ButtonLink } from './components/ui/ButtonLink'
import { PageHeader } from './components/ui/PageHeader'
import { EmptyState } from './components/ui/EmptyState'
import { AssignmentsPage } from './features/assignments/page'
import { CalendarPage } from './features/calendar/page'
import { DashboardPage } from './features/dashboard/page'
import { SettingsPage } from './features/settings/page'
import { SubjectsPage } from './features/subjects/page'
import { ROUTES } from './lib/constants'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path={ROUTES.home} element={<Navigate to={ROUTES.dashboard} replace />} />
          <Route path={ROUTES.dashboard} element={<DashboardPage />} />
          <Route path={ROUTES.subjects} element={<SubjectsPage />} />
          <Route path={ROUTES.assignments} element={<AssignmentsPage />} />
          <Route path={ROUTES.calendar} element={<CalendarPage />} />
          <Route path={ROUTES.settings} element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function NotFoundPage() {
  return (
    <div>
      <PageHeader
        eyebrow="404"
        title="Page not found"
        description="That page is not part of this build yet."
      />
      <EmptyState
        icon="AlertCircle"
        title="Nothing here"
        description="Use the navigation to get back to your dashboard."
        action={
          <ButtonLink to={ROUTES.dashboard} variant="primary" size="sm">
            Back to dashboard
          </ButtonLink>
        }
      />
    </div>
  )
}