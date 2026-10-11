/**
 * Explicit icon registry.
 *
 * Icons are imported individually rather than via a namespace import so the
 * bundler can tree-shake unused icons. Keep entries in sync with what the UI
 * actually renders.
 */

import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  BookOpen,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardList,
  Clock,
  GraduationCap,
  LayoutDashboard,
  Monitor,
  Moon,
  Pencil,
  Plus,
  PlusCircle,
  RotateCcw,
  Settings,
  Sparkles,
  Sun,
  Trash2,
  User,
  X,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

export const iconRegistry: Record<string, IconComponent> = {
  AlertCircle,
  Archive,
  ArchiveRestore,
  BookOpen,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardList,
  Clock,
  GraduationCap,
  LayoutDashboard,
  Monitor,
  Moon,
  Pencil,
  Plus,
  PlusCircle,
  RotateCcw,
  Settings,
  Sparkles,
  Sun,
  Trash2,
  User,
  X,
}