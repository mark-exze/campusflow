import { useState } from 'react'

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
import { hasNoActiveSubjects, toAssignmentFormValues } from './validation'
import { useAssignments } from './store'
import { ROUTES } from '../../lib/constants'
import type { Assignment } from '../../types'

export function AssignmentsPage() {
  const {
    subjects,
    activeAssignments,
    overdueAssignments,
    completedAssignments,
    getSubject,
    addAssignment,
    updateAssignment,
    toggleComplete,
    deleteAssignment,
    resetToSampleData,
  } = useAssignments()

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Assignment | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const noActiveSubjects = hasNoActiveSubjects(subjects)
  const isFormOpen = showForm || editing !== null

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
  }

  const handleCreate = (values: AssignmentFormValues) => {
    const result = addAssignment({
      title: values.title,
      subjectId: values.subjectId,
      type: values.type,
      priority: values.priority,
      dueDate: values.dueDate,
      estimatedHours: Number(values.estimatedHours),
      description: values.description,
    })

    if (result.status === 'blocked') {
      setStatus(`Could not save: ${result.reason}`)
      return
    }

    setStatus(`Saved "${values.title}" to this browser.`)
  }

  const handleUpdate = (values: AssignmentFormValues) => {
    if (!editing) return

    updateAssignment(editing.id, {
      title: values.title,
      subjectId: values.subjectId,
      type: values.type,
      priority: values.priority,
      dueDate: values.dueDate,
      estimatedHours: Number(values.estimatedHours),
      description: values.description,
    })

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
              onClick={() => {
                // Explicitly close when open, otherwise open the create form.
                // Relying on a toggle would reopen the create form when closing
                // an edit that was started from a card action.
                if (isFormOpen) {
                  closeForm()
                } else {
                  setEditing(null)
                  setShowForm(true)
                }
              }}
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

      {overdueAssignments.length > 0 ? (
        <section className="space-y-3" aria-labelledby="overdue-heading">
          <h2
            id="overdue-heading"
            className="flex items-center gap-2 text-sm font-semibold text-rose-600 dark:text-rose-400"
          >
            <Icon name="AlertCircle" className="size-4" />
            Overdue ({overdueAssignments.length})
          </h2>
          <AssignmentList
            assignments={overdueAssignments}
            getSubject={getSubject}
            onToggleComplete={toggleComplete}
            onDelete={deleteAssignment}
            onEdit={setEditing}
          />
        </section>
      ) : null}

      <section className="space-y-3" aria-labelledby="active-heading">
        <h2 id="active-heading" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Active ({activeAssignments.length})
        </h2>
        <AssignmentList
          assignments={activeAssignments}
          getSubject={getSubject}
          onToggleComplete={toggleComplete}
          onDelete={deleteAssignment}
          onEdit={setEditing}
          emptyIcon="CheckCircle2"
          emptyTitle="No active assignments"
          emptyDescription="You are all caught up. Add a new assignment to continue."
        />
      </section>

      {completedAssignments.length > 0 ? (
        <section className="space-y-3" aria-labelledby="completed-heading">
          <h2
            id="completed-heading"
            className="text-sm font-semibold text-slate-500 dark:text-slate-400"
          >
            Completed ({completedAssignments.length})
          </h2>
          <AssignmentList
            assignments={[...completedAssignments].reverse()}
            getSubject={getSubject}
            onToggleComplete={toggleComplete}
            onDelete={deleteAssignment}
            onEdit={setEditing}
          />
        </section>
      ) : null}
    </div>
  )
}
