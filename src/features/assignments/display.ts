import { ASSIGNMENT_TYPES } from '../../lib/constants'
import type { BadgeTone } from '../../components/ui/variants'
import type { AssignmentPriority, AssignmentStatus, AssignmentType } from '../../types'

export function typeLabel(type: AssignmentType): string {
  return ASSIGNMENT_TYPES.find((option) => option.value === type)?.label ?? 'Other'
}

export function priorityLabel(priority: AssignmentPriority): string {
  switch (priority) {
    case 'high':
      return 'High priority'
    case 'medium':
      return 'Medium priority'
    case 'low':
      return 'Low priority'
    default:
      return ''
  }
}

export function priorityTone(priority: AssignmentPriority): BadgeTone {
  switch (priority) {
    case 'high':
      return 'danger'
    case 'medium':
      return 'warning'
    case 'low':
      return 'neutral'
    default:
      return 'neutral'
  }
}

export function statusLabel(status: AssignmentStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'in-progress':
      return 'In progress'
    case 'completed':
      return 'Completed'
    default:
      return ''
  }
}

export function statusTone(status: AssignmentStatus): BadgeTone {
  switch (status) {
    case 'completed':
      return 'success'
    case 'in-progress':
      return 'info'
    case 'pending':
      return 'neutral'
    default:
      return 'neutral'
  }
}