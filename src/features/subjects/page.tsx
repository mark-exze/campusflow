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
    resetSubjects,
  } = useSubjects()
  const { assignments, deleteAssignmentsBySubject } = useAssignments()
  const { profile } = useProfile()

  const [editing, setEditing] = useState<Subject | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
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
    const subject = addSubject(draft)
    setIsCreating(false)
    setStatus(`Added ${subject.name}.`)
  }

  const handleEdit = (values: SubjectFormValues) => {
    if (!editing) return
    updateSubject(editing.id, toSubjectDraft(values))
    setStatus(`Saved changes to ${values.name || editing.name}.`)
    setEditing(null)
  }

  const handleArchiveToggle = (subject: Subject) => {
    toggleArchived(subject.id)
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
      removeSubject(deleteTarget.id)
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
    removeSubject(deleteTarget.id)
    deleteAssignmentsBySubject(deleteTarget.id)
    setStatus(
      `Deleted ${deleteTarget.name} and its ${deleteTargetTotal} assignment${
        deleteTargetTotal === 1 ? '' : 's'
      }.`,
    )
    closeDeleteDialog()
  }

  const credits = subjects.reduce((total, subject) => total + subject.credits, 0)

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
          description="Add your first subject to start tracking classes and deadlines."
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
          <Button variant="secondary" size="sm" onClick={() => resetSubjects()}>
            <Icon name="RotateCcw" className="size-4" />
            Restore sample subjects
          </Button>
        </div>
      </Card>

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
