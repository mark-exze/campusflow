import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import { AssignmentList } from '../../features/assignments/AssignmentList'
import {
  AssignmentForm,
  type AssignmentFormValues,
} from '../../features/assignments/AssignmentForm'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Icon } from '../../components/ui/Icon'
import { PageHeader } from '../../components/ui/PageHeader'
import {
  DEFAULT_FILTERS,
  DEADLINE_FILTER_OPTIONS,
  PRIORITY_FILTER_OPTIONS,
  SORT_OPTIONS,
  countActiveFilters,
  hasActiveFilters,
  isAssignmentOverdue,
  sortAssignmentsBy,
  type AssignmentFilters,
  type DeadlineFilter,
  type PriorityFilter,
  type SortKey,
  type StatusFilter,
} from '../../lib/assignmentFilters'
import { ROUTES } from '../../lib/constants'
import { cn } from '../../lib/utils'
import { hasNoActiveSubjects, toAssignmentFormValues } from './validation'
import { useAssignments } from './store'
import type { Assignment } from '../../types'

const STATUS_FILTER_OPTIONS: readonly { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Any status' },
  { value: 'pending', label: 'Pending' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'completed', label: 'Completed' },
]

export function AssignmentsPage() {
  const {
    subjects,
    todayIso,
    assignments,
    getSubject,
    addAssignment,
    updateAssignment,
    toggleComplete,
    deleteAssignment,
    resetToSampleData,
    getVisibleAssignments,
  } = useAssignments()

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Assignment | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [filters, setFilters] = useState<AssignmentFilters>(DEFAULT_FILTERS)
  const [sortKey, setSortKey] = useState<SortKey>('deadline-asc')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const noActiveSubjects = hasNoActiveSubjects(subjects)
  const isFormOpen = showForm || editing !== null
  const activeFilterCount = countActiveFilters(filters)

  const visible = useMemo(
    () => getVisibleAssignments(filters, sortKey),
    [getVisibleAssignments, filters, sortKey],
  )

  // Section membership mirrors the store's own overdue/active/completed
  // split, so the sections always agree with the dashboard.
  const overdue = useMemo(
    () =>
      sortAssignmentsBy(
        visible.filter((a) => isAssignmentOverdue(a, todayIso)),
        sortKey,
      ),
    [visible, sortKey, todayIso],
  )
  const active = useMemo(
    () =>
      sortAssignmentsBy(
        visible.filter(
          (a) => a.status !== 'completed' && !isAssignmentOverdue(a, todayIso),
        ),
        sortKey,
      ),
    [visible, sortKey, todayIso],
  )
  const completed = useMemo(
    () => sortAssignmentsBy(visible.filter((a) => a.status === 'completed'), sortKey),
    [visible, sortKey],
  )

  const totalAssignments = overdue.length + active.length + completed.length
  const totalStored = assignments.length
  const hasNoAssignmentsAtAll = totalStored === 0

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
  }

  /** Open the create form, or close whichever form is open. */
  const toggleForm = () => {
    if (isFormOpen) {
      closeForm()
      return
    }
    setEditing(null)
    setShowForm(true)
  }

  const updateFilter = <K extends keyof AssignmentFilters>(
    key: K,
    value: AssignmentFilters[K],
  ) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const clearFilters = () => setFilters(DEFAULT_FILTERS)

  const handleCreate = (values: AssignmentFormValues) => {
    const result = addAssignment({
      title: values.title,
      subjectId: values.subjectId,
      type: values.type,
      priority: values.priority,
      dueDate: values.dueDate,
      estimatedHours: Number(values.estimatedHours),
      description: values.description,
      progress: Number(values.progress),
    })

    if (result.status === 'blocked') {
      setStatus(`Could not save: ${result.reason}`)
      return
    }

    setStatus(`Saved "${values.title}" to this browser.`)
  }

  const handleUpdate = (values: AssignmentFormValues) => {
    if (!editing) return

    const result = updateAssignment(editing.id, {
      title: values.title,
      subjectId: values.subjectId,
      type: values.type,
      priority: values.priority,
      status: values.status,
      dueDate: values.dueDate,
      estimatedHours: Number(values.estimatedHours),
      description: values.description,
      progress: Number(values.progress),
    })

    if (result.status === 'blocked') {
      setStatus(`Could not save: ${result.reason}`)
      return
    }

    setStatus(`Updated "${values.title}".`)
    setEditing(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Assignments"
        title="Your assignments"
        description="Track deadlines locally. Changes are saved in this browser only."
        actions={
          <>
            <Badge tone="brand" icon="Sparkles">
              Local data
            </Badge>
            <Button variant="secondary" size="sm" onClick={() => resetToSampleData()}>
              <Icon name="RotateCcw" className="size-4" />
              Reset sample
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={toggleForm}
              aria-expanded={isFormOpen}
              aria-controls="assignment-form"
              disabled={noActiveSubjects}
              title={
                noActiveSubjects
                  ? 'Create or restore a subject before adding assignments'
                  : undefined
              }
            >
              <Icon name={isFormOpen ? 'X' : 'Plus'} className="size-4" />
              {isFormOpen ? 'Close' : 'Add assignment'}
            </Button>
          </>
        }
      />

      <p aria-live="polite" className="sr-only">
        {status ?? ''}
      </p>

      {noActiveSubjects ? (
        <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
                <Icon name="AlertCircle" className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  No active subjects
                </h2>
                <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
                  Every subject is archived, so new assignments cannot be added.
                  Create a subject or restore an archived one to continue.
                </p>
              </div>
            </div>
            <ButtonLink to={ROUTES.subjects} variant="secondary" size="sm" className="shrink-0">
              <Icon name="BookOpen" className="size-4" />
              Go to subjects
            </ButtonLink>
          </div>
        </Card>
      ) : null}

      {isFormOpen ? (
        <Card id="assignment-form">
          <CardHeader
            title={editing ? `Edit "${editing.title}"` : 'Add assignment'}
            description={
              editing
                ? 'Archived subjects are kept only on the assignment that already uses them.'
                : 'Saved to this browser only — nothing is synced yet.'
            }
            icon="PlusCircle"
          />
          <CardBody className="mt-4">
            <AssignmentForm
              subjects={subjects}
              initialValues={editing ? toAssignmentFormValues(editing) : undefined}
              currentSubjectId={editing?.subjectId}
              onSubmit={editing ? handleUpdate : handleCreate}
              onCancel={closeForm}
            />
          </CardBody>
        </Card>
      ) : null}

      {/* Search, filters and sorting */}
      <Card>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Icon name="Search" className="size-4" />
              </span>
              <input
                type="search"
                value={filters.query}
                onChange={(event) => updateFilter('query', event.target.value)}
                placeholder="Search titles and descriptions"
                aria-label="Search assignments"
                className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-9 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              {filters.query ? (
                <button
                  type="button"
                  onClick={() => updateFilter('query', '')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <Icon name="X" className="size-3.5" />
                </button>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setFiltersOpen((open) => !open)}
                aria-expanded={filtersOpen}
                aria-controls="assignment-filters"
                className="h-11"
              >
                <Icon name="Filter" className="size-4" />
                Filters
                {activeFilterCount > 0 ? (
                  <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-brand-600 text-[11px] font-semibold text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </Button>

              {hasActiveFilters(filters) ? (
                <Button
                  variant="ghost"
                  size="md"
                  onClick={clearFilters}
                  className="h-11 shrink-0"
                >
                  <Icon name="X" className="size-4" />
                  Clear
                </Button>
              ) : null}
            </div>
          </div>

          {/* Single column on narrow screens so nothing scrolls sideways. */}
          <div
            id="assignment-filters"
            className={cn(
              'grid gap-3 border-t border-slate-200 pt-4 dark:border-slate-800',
              filtersOpen ? 'grid' : 'hidden lg:grid',
              'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
            )}
          >
            <FilterSelect
              id="filter-subject"
              label="Subject"
              value={filters.subjectId}
              onChange={(value) => updateFilter('subjectId', value)}
            >
              <option value="all">All subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code} — {subject.name}
                  {subject.archived ? ' (archived)' : ''}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              id="filter-status"
              label="Status"
              value={filters.status}
              onChange={(value) => updateFilter('status', value as StatusFilter)}
            >
              {STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              id="filter-priority"
              label="Priority"
              value={filters.priority}
              onChange={(value) => updateFilter('priority', value as PriorityFilter)}
            >
              {PRIORITY_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              id="filter-deadline"
              label="Deadline"
              value={filters.deadline}
              onChange={(value) => updateFilter('deadline', value as DeadlineFilter)}
            >
              {DEADLINE_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
            <label htmlFor="sort-assignments" className="text-xs font-medium text-slate-600 dark:text-slate-300">
              Sort by
            </label>
            <select
              id="sort-assignments"
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 sm:w-72"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {hasNoAssignmentsAtAll ? (
        <EmptyAssignments onAdd={() => setShowForm(true)} canAdd={!noActiveSubjects} />
      ) : totalAssignments === 0 ? (
        <EmptyResults onClear={clearFilters} />
      ) : (
        <>
          {overdue.length > 0 ? (
            <section className="space-y-3" aria-labelledby="overdue-heading">
              <h2
                id="overdue-heading"
                className="flex items-center gap-2 text-sm font-semibold text-rose-600 dark:text-rose-400"
              >
                <Icon name="AlertCircle" className="size-4" />
                Overdue ({overdue.length})
              </h2>
              <AssignmentList
                assignments={overdue}
                getSubject={getSubject}
                onToggleComplete={toggleComplete}
                onDelete={deleteAssignment}
                onEdit={setEditing}
              />
            </section>
          ) : null}

          <section className="space-y-3" aria-labelledby="active-heading">
            <h2 id="active-heading" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Active ({active.length})
            </h2>
            <AssignmentList
              assignments={active}
              getSubject={getSubject}
              onToggleComplete={toggleComplete}
              onDelete={deleteAssignment}
              onEdit={setEditing}
              emptyIcon="CheckCircle2"
              emptyTitle="No active assignments"
              emptyDescription="You are all caught up. Add a new assignment to continue."
            />
          </section>

          {completed.length > 0 ? (
            <section className="space-y-3" aria-labelledby="completed-heading">
              <h2
                id="completed-heading"
                className="text-sm font-semibold text-slate-500 dark:text-slate-400"
              >
                Completed ({completed.length})
              </h2>
              <AssignmentList
                assignments={completed}
                getSubject={getSubject}
                onToggleComplete={toggleComplete}
                onDelete={deleteAssignment}
                onEdit={setEditing}
              />
            </section>
          ) : null}
        </>
      )}

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Showing {totalAssignments} of {totalStored} assignment{totalStored === 1 ? '' : 's'}
        {hasActiveFilters(filters) ? ' (filtered)' : ''}
      </p>
    </div>
  )
}

type FilterSelectProps = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}

function FilterSelect({ id, label, value, onChange, children }: FilterSelectProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-slate-600 dark:text-slate-300">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors focus:border-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
      >
        {children}
      </select>
    </div>
  )
}

function EmptyAssignments({ onAdd, canAdd }: { onAdd: () => void; canAdd: boolean }) {
  return (
    <Card>
      <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          <Icon name="ClipboardList" className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            No assignments yet
          </p>
          <p className="mx-auto max-w-sm text-xs text-slate-500 dark:text-slate-400">
            {canAdd
              ? 'Add your first assignment to start tracking deadlines.'
              : 'Create or restore a subject first, then add assignments.'}
          </p>
        </div>
        {canAdd ? (
          <Button variant="primary" size="sm" onClick={onAdd}>
            <Icon name="Plus" className="size-4" />
            Add assignment
          </Button>
        ) : (
          <ButtonLink to={ROUTES.subjects} variant="primary" size="sm">
            <Icon name="BookOpen" className="size-4" />
            Go to subjects
          </ButtonLink>
        )}
      </div>
    </Card>
  )
}

function EmptyResults({ onClear }: { onClear: () => void }) {
  return (
    <Card>
      <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
          <Icon name="Search" className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            No matching assignments
          </p>
          <p className="mx-auto max-w-sm text-xs text-slate-500 dark:text-slate-400">
            Nothing matches the current search and filters.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onClear}>
          <Icon name="X" className="size-4" />
          Clear all filters
        </Button>
      </div>
    </Card>
  )
}
