import { useStorageError, StorageReadError, StorageWriteError } from '../../hooks/useLocalStorage'
import { Icon } from './Icon'

/**
 * Surfaces storage problems instead of letting a failed save look successful.
 *
 * A read error means the previous data was left untouched rather than replaced
 * with sample data; a write error means the most recent change is not stored.
 */
export function StorageNotice() {
  const error = useStorageError()

  if (!error) return null

  const isReadError = error instanceof StorageReadError
  const isWriteError = error instanceof StorageWriteError

  const message = isWriteError
    ? 'Your latest change could not be saved, so it will be lost on refresh. Storage may be full or blocked.'
    : isReadError
      ? 'Some of your saved data could not be read, so it has been left untouched rather than replaced. Your current view may show starting data.'
      : 'There was a problem reading or saving your local data.'

  return (
    <div
      role="status"
      aria-live="assertive"
      className="mb-4 flex items-start gap-3 rounded-card border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
    >
      <Icon name="AlertCircle" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold">Storage problem</p>
        <p className="mt-0.5 text-xs opacity-90">{message}</p>
      </div>
    </div>
  )
}
