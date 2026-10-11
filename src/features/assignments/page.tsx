import { useState } from 'react'

import { AssignmentList } from '../../features/assignments/AssignmentList'
import { AssignmentForm, type AssignmentFormValues } from '../../features/assignments/AssignmentForm'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardBody, CardHeader } from '../../components/ui/Card'
import { Icon } from '../../components/ui/Icon'
import { PageHeader } from '../../components/ui/PageHeader'
import { useAssignments } from './store'

export function AssignmentsPage() {
  const {
    subjects,
    activeAssignments,
    overdueAssignments,
    completedAssignments,
    getSubject,
    addAssignment,
    toggleComplete,
    deleteAssignment,
    resetToSampleData,
  } = useAssignments()

  const [showForm, setShowForm] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const handleSubmit = (values: AssignmentFormValues) => {
    addAssignment({
      title: values.title,
      subjectId: values.subjectId,
      type: values.type,
      priority: values.priority,
      dueDate: values.dueDate,
      estimatedHours: Number(values.estimatedHours),
      description: values.description,
    })
    setStatus(`Saved "${values.title}" to this browser.`)
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
              onClick={() => setShowForm((open) => !open)}
              aria-expanded={showForm}
              aria-controls="assignment-form"
            >
              <Icon name={showForm ? 'X' : 'Plus'} className="size-4" />
              {showForm ? 'Close' : 'Add assignment'}
            </Button>
          </>
        }
      />

      <p aria-live="polite" className="sr-only">
        {status ?? ''}
      </p>

      {showForm ? (
        <Card id="assignment-form">
          <CardHeader
            title="Add assignment"
            description="Saved to this browser only — nothing is synced yet."
            icon="PlusCircle"
          />
          <CardBody className="mt-4">
            <AssignmentForm
              subjects={subjects}
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
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
          />
        </section>
      ) : null}

      <section className="space-y-3" aria-labelledby="active-heading">
        <h2
          id="active-heading"
          className="text-sm font-semibold text-slate-900 dark:text-slate-100"
        >
          Active ({activeAssignments.length})
        </h2>
        <AssignmentList
          assignments={activeAssignments}
          getSubject={getSubject}
          onToggleComplete={toggleComplete}
          onDelete={deleteAssignment}
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
          />
        </section>
      ) : null}
    </div>
  )
}