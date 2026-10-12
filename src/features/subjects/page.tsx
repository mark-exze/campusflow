import { useMemo, useState } from 'react'

import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ButtonLink } from '../../components/ui/ButtonLink'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/ui/Icon'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import {
  countAssignmentsBySubject,
  deleteSubject,
  validateSubject,
  type SubjectDraft,
  type SubjectErrors,
} from '../../lib/subjects'
import { useAssignments } from '../assignments/store'
import { useProfile } from '../../hooks/useProfile'
import { ROUTES } from '../../lib/constants'
import { summarizeRecords } from '../../lib/seedData'
import { useSubjects } from './store'
import { SubjectCard } from './SubjectCard'
import { SubjectForm } from './SubjectForm'
import { toSubjectDraft, toSubjectFormValues, type SubjectFormValues } from './subjectFormValues'
import type { Subject } from '../../types'

export function SubjectsPage() {
  const {
    subjects,
    addSubject,
    updateSubject,
    toggleArchived,
    removeSubject,
    restoreSampleSubjects,
    getSubjectResetRisk,
  } = useSubjects()
  const { assignments, deleteAssignmentsBySubject } = useAssignments()
  const { profile } = useProfile()

  const [editing, setEditing] = useState<Subject | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  /**
   * Re-read the live risk each time the dialog opens, so the confirmation
   * reflects the current stored data rather than a stale render snapshot.
   */
  const openResetDialog = () => {
    setResetRiskCount(getSubjectResetRisk())
    setResetDialogOpen(true)
  }

  /**
   * Assignments that point at a subject which will NOT exist after the reset.
   * The reset restores exactly the seeded ids, so anything on a student-created
   * subject would be left pointing at a deleted id. Reporting the exact count
   * is what keeps the reset from being silently destructive.
   */
  const [resetRiskCount, setResetRiskCount] = useState(0)
  const [showArchived, setShowArchived] = useState(true)
  const [statusMessage, setStatus] = useState<string | null>(null)

  const countsBySubject = useMemo(() => countAssignmentsBySubject(assignments), [assignments])
  const emptyCounts = { active: 0, completed: 0, total: 0 }

  const activeSubjects = useMemo(
    () => subjects.filter((subject) => !subject.archived),
    [subjects],
  )
  const archivedSubjects = useMemo(
    () => subjects.filter((subject) => subject.archived),
    [subjects],
  )

  const visibleSubjects = showArchived ? subjects : activeSubjects

  // Completed assignments are associated records too, so the total counts them.
  const deleteTargetCounts = deleteTarget
    ? (countsBySubject.get(deleteTarget.id) ?? emptyCounts)
    : emptyCounts
  const deleteTargetTotal = deleteTargetCounts.total

  const validate = (values: SubjectFormValues, currentId?: string): SubjectErrors => {
    const draft: SubjectDraft = toSubjectDraft(values)
    return validateSubject(draft, { subjects, currentId })
  }

  const handleCreate = (values: SubjectFormValues) => {
    const draft: SubjectDraft = toSubjectDraft(values)
    const persisted = addSubject(draft)

    if (!persisted) {
      // Keep the dialog open so nothing typed is lost.
      setStatus('Could not save this subject. Your entry is still here — try again.')
      return
    }

    setIsCreating(false)
    setStatus(`Added ${values.name}.`)
  }

  const handleEdit = (values: SubjectFormValues) => {
    if (!editing) return
    const persisted = updateSubject(editing.id, toSubjectDraft(values))

    if (!persisted) {
      setStatus('Could not save these changes. Your entry is still here — try again.')
      return
    }

    setStatus(`Saved changes to ${values.name || editing.name}.`)
    setEditing(null)
  }

  const handleArchiveToggle = (subject: Subject) => {
    const persisted = toggleArchived(subject.id)

    if (!persisted) {
      setStatus(`Could not ${subject.archived ? 'restore' : 'archive'} ${subject.name}.`)
      return
    }

    setStatus(subject.archived ? `Restored ${subject.name}.` : `Archived ${subject.name}.`)
  }

  const requestDelete = (subject: Subject) => {
    setDeleteTarget(subject)
    setConfirmDelete(false)
  }

  const closeDeleteDialog = () => {
    setDeleteTarget(null)
    setConfirmDelete(false)
  }

  const handleArchiveFromDialog = () => {
    if (deleteTarget) handleArchiveToggle(deleteTarget)
    closeDeleteDialog()
  }

  const handleDeleteSafe = () => {
    if (!deleteTarget) return
    const result = deleteSubject(subjects, assignments, deleteTarget.id)

    if (result.status === 'deleted') {
      if (!removeSubject(deleteTarget.id)) {
        setStatus(`Could not delete ${deleteTarget.name}. It is still here.`)
        return
      }
      setStatus(`Deleted ${deleteTarget.name}.`)
    }
    closeDeleteDialog()
  }

  const handleDeleteWithAssignments = () => {
    if (!deleteTarget) return
    // Require the explicit checkbox first: this is irreversible and takes
    // completed assignments with it.
    if (!confirmDelete) return

    // Remove the subject first, then its dependent assignments, so no
    // assignment is ever left pointing at a missing subject.
    if (!removeSubject(deleteTarget.id)) {
      setStatus(`Could not delete ${deleteTarget.name}. It is still here.`)
      return
    }
    deleteAssignmentsBySubject(deleteTarget.id)
    setStatus(
      `Deleted ${deleteTarget.name} and its ${deleteTargetTotal} assignment${
        deleteTargetTotal === 1 ? '' : 's'
      }.`,
    )
    closeDeleteDialog()
  }

  const credits = subjects.reduce((total, subject) => total + subject.credits, 0)
  const recordSummary = useMemo(() => summarizeRecords(subjects, assignments), [subjects, assignments])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`${profile.academicTerm} · ${profile.academicYear}`}
        title="Subjects"
        description="Add, edit and archive your courses. Everything is saved in this browser."
        actions={
          <>
            <Badge tone="brand" icon="Sparkles">
              Local data
            </Badge>
            <ButtonLink to="/assignments" variant="secondary" size="sm">
              <Icon name="ClipboardList" className="size-4" />
              Assignments
            </ButtonLink>
            <Button variant="primary" size="sm" onClick={() => setIsCreating(true)}>
              <Icon name="Plus" className="size-4" />
              Add subject
            </Button>
          </>
        }
      />

      <p aria-live="polite" className="sr-only">
        {statusMessage ?? ''}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Active subjects" value={activeSubjects.length} />
        <SummaryTile label="Archived" value={archivedSubjects.length} />
        <SummaryTile label="Credits" value={credits} />
        <SummaryTile label="Assignments" value={assignments.length} />
      </div>

      {archivedSubjects.length > 0 ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {showArchived
              ? 'Archived subjects are shown with a dashed outline.'
              : 'Archived subjects are hidden.'}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowArchived((current) => !current)}
            aria-pressed={showArchived}
          >
            <Icon name={showArchived ? 'Archive' : 'ArchiveRestore'} className="size-3.5" />
            {showArchived ? 'Hide archived' : 'Show archived'}
          </Button>
        </div>
      ) : null}

      {visibleSubjects.length === 0 ? (
        <EmptyState
          icon="BookOpen"
          title="No subjects yet"
          description="Subjects hold your classes, assignments and schedule. Add your first one to get started."
          action={
            <Button variant="primary" size="sm" onClick={() => setIsCreating(true)}>
              <Icon name="Plus" className="size-4" />
              Add subject
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleSubjects.map((subject) => (
            <li key={subject.id}>
              <SubjectCard
                subject={subject}
                counts={countsBySubject.get(subject.id) ?? emptyCounts}
                onEdit={setEditing}
                onToggleArchive={handleArchiveToggle}
                onDelete={requestDelete}
              />
            </li>
          ))}
        </ul>
      )}

      {recordSummary.sampleSubjects + recordSummary.customisedSubjects > 0 ? (
        <p className="text-[11px] text-slate-500 dark:text-slate-500">
          {recordSummary.sampleSubjects + recordSummary.customisedSubjects} of {subjects.length}{' '}
          subject{subjects.length === 1 ? '' : 's'} started as sample data —{' '}
          {recordSummary.sampleSubjects} untouched
          {recordSummary.customisedSubjects > 0
            ? `, ${recordSummary.customisedSubjects} customised by you`
            : ''}
          {recordSummary.userSubjects > 0 ? `, ${recordSummary.userSubjects} added by you` : ''}
          .
        </p>
      ) : (
        <p className="text-[11px] text-slate-500 dark:text-slate-500">
          Every subject here was added by you.
        </p>
      )}

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Grade calculator
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Grade rings come from the grade you set per subject. A calculator
              with custom category weights arrives in a later phase.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={openResetDialog}
          >
            <Icon name="RotateCcw" className="size-4" />
            Restore sample subjects
          </Button>
        </div>
      </Card>

      {/* Restore sample data confirmation */}
      <Modal
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        size="sm"
        title="Restore sample subjects?"
        description={
          resetRiskCount > 0
            ? `Blocked — ${resetRiskCount} assignment${resetRiskCount === 1 ? '' : 's'} still ${resetRiskCount === 1 ? 'references' : 'reference'} your subjects.`
            : 'This replaces every subject you have.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetDialogOpen(false)}>
              Cancel
            </Button>

            {resetRiskCount > 0 ? (
              <ButtonLink to={ROUTES.assignments} variant="primary">
                <Icon name="ClipboardList" className="size-4" />
                Go to assignments
              </ButtonLink>
            ) : (
              <Button
                variant="danger"
                onClick={() => {
                  // The store re-checks the live stored data before writing, so
                  // a stale dialog can never orphan real assignments.
                  const outcome = restoreSampleSubjects()
                  if (outcome.status === 'blocked') return
                  if (outcome.status === 'failed') {
                    setStatus('Could not restore the sample subjects.')
                    return
                  }
                  setResetDialogOpen(false)
                  setStatus('Sample subjects restored.')
                }}
              >
                <Icon name="RotateCcw" className="size-4" />
                Restore sample subjects
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Your subjects will be replaced by the six demonstration subjects
            that ship with the app, including any you created or archived.
            Your assignments are never deleted or changed by this action.
          </p>

          {resetRiskCount > 0 ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2.5 text-xs text-rose-800 dark:bg-rose-500/10 dark:text-rose-300">
              <span className="font-semibold">
                {resetRiskCount} assignment{resetRiskCount === 1 ? '' : 's'}
              </span>{' '}
              {resetRiskCount === 1 ? 'points' : 'point'} at a subject you created, and{' '}
              {resetRiskCount === 1 ? 'would lose that subject' : 'would lose their subjects'} if
              the list is reset. Reassign or remove{' '}
              {resetRiskCount === 1 ? 'this assignment' : 'these assignments'} on the Assignments
              page, then restore the sample subjects here.
            </p>
          ) : null}
        </div>
      </Modal>


      {/* Create */}
      <Modal
        open={isCreating}
        onClose={() => setIsCreating(false)}
        title="Add subject"
        description="Give the subject a code so its deadlines are easy to recognise."
        footer={null}
      >
        <SubjectForm
          onValidate={(values) => validate(values)}
          onSubmit={handleCreate}
          onCancel={() => setIsCreating(false)}
          submitLabel="Create subject"
        />
      </Modal>

      {/* Edit */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `Edit ${editing.name}` : 'Edit subject'}
        description="Changes save to this browser immediately."
        footer={null}
      >
        {editing ? (
          <SubjectForm
            key={editing.id}
            initialValues={toSubjectFormValues(editing)}
            onValidate={(values) => validate(values, editing.id)}
            onSubmit={handleEdit}
            onCancel={() => setEditing(null)}
            submitLabel="Save changes"
          />
        ) : null}
      </Modal>

      {/* Delete */}
      <Modal
        open={deleteTarget !== null}
        onClose={closeDeleteDialog}
        size="sm"
        title={deleteTarget ? `Delete ${deleteTarget.name}?` : 'Delete subject?'}
        description={
          deleteTargetTotal > 0
            ? `${deleteTargetCounts.active} incomplete and ${deleteTargetCounts.completed} completed assignment${
                deleteTargetCounts.completed === 1 ? '' : 's'
              } belong to this subject.`
            : 'This subject has no assignments, so it can be deleted safely.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={closeDeleteDialog}>
              Cancel
            </Button>

            {deleteTargetTotal > 0 ? (
              <>
                <Button variant="secondary" onClick={handleArchiveFromDialog}>
                  <Icon name="Archive" className="size-4" />
                  Archive instead
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteWithAssignments}
                  disabled={!confirmDelete}
                  title={
                    confirmDelete
                      ? undefined
                      : 'Confirm the checkbox to enable permanent deletion'
                  }
                >
                  <Icon name="Trash2" className="size-4" />
                  Delete subject and {deleteTargetTotal} assignment
                  {deleteTargetTotal === 1 ? '' : 's'}
                </Button>
              </>
            ) : (
              <Button variant="danger" onClick={handleDeleteSafe}>
                <Icon name="Trash2" className="size-4" />
                Delete subject
              </Button>
            )}
          </>
        }
      >
        {deleteTargetTotal > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                Permanent deletion
              </span>{' '}
              removes this subject and all {deleteTargetTotal} assignment
              {deleteTargetTotal === 1 ? '' : 's'} associated with it —{' '}
              {deleteTargetCounts.active} incomplete and {deleteTargetCounts.completed}{' '}
              completed. Completed assignments are deleted too. This cannot be undone.
            </p>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                Recommended:
              </span>{' '}
              archive instead. The subject leaves the subject list and the Add
              Assignment dropdown, while every assignment and its history stay
              intact.
            </p>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-500/30 dark:bg-rose-500/10">
              <input
                type="checkbox"
                checked={confirmDelete}
                onChange={(event) => setConfirmDelete(event.target.checked)}
                className="mt-0.5 size-4 shrink-0 cursor-pointer accent-rose-600"
              />
              <span className="text-xs text-rose-800 dark:text-rose-200">
                I understand this permanently deletes the subject and its{' '}
                {deleteTargetTotal} assignment{deleteTargetTotal === 1 ? '' : 's'},
                including {deleteTargetCounts.completed} completed.
              </span>
            </label>
          </div>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Deleting removes the subject from this browser. It cannot be undone.
          </p>
        )}
      </Modal>
    </div>
  )
}

function SummaryTile({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </Card>
  )
}
