# AGENTS.md

Guidance for AI agents and human contributors working on CampusFlow. Read
this before changing code.

## Project status

Phase 1 — Project Foundation. The shell, dashboard, subjects, assignments,
calendar and theming are implemented against **local sample data only**.

**Not yet implemented, and must not be faked:** authentication, real AI calls,
Supabase/backend services, document processing, cloud sync. Do not wire
placeholders that look operational, and never ship generated fake AI results.

## Commands

Run these from the project root before reporting work done:

```bash
npm install          # install dependencies
npm run dev          # dev server (prints the local URL)
npm run lint         # ESLint, flat config — must pass with no errors
npm run typecheck    # tsc --noEmit — strict mode must pass
npm run test -- --run # Vitest, single run
npm run build        # typecheck + production build
```

All four verification commands (`lint`, `typecheck`, `test`, `build`) must pass.

## Architecture

Feature-oriented, not layer-oriented, for feature code.

- `src/components/ui/` — generic, reusable primitives. No knowledge of
  assignments, subjects or grades.
- `src/components/layout/` — application shell (AppLayout, Sidebar, MobileNav).
- `src/features/<feature>/` — feature-specific pages, components, store and
  helpers. A feature may import from `components/ui` and `lib`; it must not
  import from another feature unless one is strictly a dependency of the
  other (the dashboard imports the assignments components, which is the
  established pattern).
- `src/hooks/` — cross-cutting hooks (`useLocalStorage`, `useTheme`) and the
  assignments store (`useAssignments`).
- `src/lib/` — pure functions and constants. **No React imports.**
  Unit-testable in isolation.
- `src/types/` — shared types, single source of truth.
- `src/test/` — Vitest specs and jsdom setup. Specs must live in this folder
  because `vite.config.ts` restricts the include pattern to `src/test/**`.

### State and data

Three datasets are student-owned and persisted to localStorage, each under its
own key in `STORAGE_KEYS`:

| Dataset     | Key                            | Hook                  |
| ----------- | ------------------------------ | --------------------- |
| Profile     | `campusflow.profile.v1`         | `hooks/useProfile.ts` |
| Subjects    | `campusflow.subjects.v1`        | `features/subjects/store.ts` |
| Assignments | `campusflow.assignments.v1`     | `features/assignments/store.ts` |

- **Assignments** are the primary record. They reference subjects by `id`.
- **Subjects** carry their own weekly `schedule`, which the assignments store
  flattens into `ClassSession` records via `lib/subjects.ts` →
  `deriveClassSessions`. There is no separate stored schedule to drift out of
  sync. Archived subjects are excluded from the calendar.
- **Profile** supplies the dashboard greeting and the term labels that used to
  be hardcoded.
- Anything read out of localStorage goes through `normalizeProfile` or
  `normalizeSubject`, so a partial or hand-edited record can never render an
  incomplete object.

Derived selectors (`activeAssignments`, `overdueAssignments`,
`upcomingAssignments`, `completedAssignments`, `todayClasses`,
`classSessions`, `stats`) are computed inside the store, not in components.
Calendar grids and events are derived separately in `lib/calendarEvents.ts`.

### Referential integrity

`lib/subjects.ts` is the single place that decides whether a subject may be
deleted:

- `deleteSubject(...)` returns `{ status: 'blocked', assignmentCount }` when
  assignments still reference the subject. Never bypass this to force deletion.
- `deleteSubjectWithAssignments(...)` removes the subject **and** its dependent
  assignments. Only call it after the student explicitly confirms in the delete
  dialog.
- Subject `id`s are stable for the lifetime of the record. Editing a subject
  must never change its id, or its assignments will orphan.

### One writer per key per page

Multiple hooks may read the same localStorage key, but only one page should
*write* a given key. `useLocalStorage` skips no-op writes so a stale instance
cannot clobber a newer one. The subjects page owns writes to subjects and reads
assignments; the assignments page owns writes to assignments and reads subjects.

## Conventions

### TypeScript

- `strict` is on, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
  and `verbatimModuleSyntax`. These are not optional.
- Optional props that can be explicitly passed `undefined` must be typed
  `prop?: T | undefined`. Bare `prop?: T` fails under
  `exactOptionalPropertyTypes`.
- Array indexing returns `T | undefined` — guard it, or use `?? fallback`.
- Use `import type` / `export type` for type-only imports and exports.
- No `enum`, no namespaces, no parameter properties (`erasableSyntaxOnly`).
- Do **not** create two source files whose names differ only in case. On
  case-insensitive filesystems (`subjectForm.ts` vs `SubjectForm.tsx`) TypeScript
  and Vite cannot tell them apart and the build breaks.

### React

- Function components only. One exported component per file, plus small
  unexported helpers below it.
- Do not export non-component values from a `.tsx` file
  (`react-refresh/only-export-components`). Put pure helpers in a `.ts`
  sibling — see `features/subjects/subjectFormValues.ts` and
  `features/assignments/validation.ts`.
- `forwardRef` is used for the `Button` primitive so refs work.
- Icons come from `src/components/ui/icons.ts`, an **explicit registry**.
  Never `import * as lucide` — that defeats tree-shaking and inflates the
  bundle. Add new icons to both the import block and the registry map.
- Never call `setState` synchronously inside a `useEffect` body. Derive during
  render instead, as `useTheme` does for `resolvedTheme`.
- Accessibility: every icon-only control needs an `aria-label`, toggles use
  `aria-pressed`, radiogroups use `role="radio"` + `aria-checked`, and
  `aria-live` regions announce status changes. The layout has a skip link to
  `#main-content`.
- Dialogs use `components/ui/Modal.tsx`, which handles Escape, focus trapping,
  focus restoration and scroll locking. Do not hand-roll dialog behaviour.

### Styling (Tailwind CSS v4)

- Dark mode is class-based: `@custom-variant dark (&:where(.dark, .dark *))`
  with the `dark` class on `<html>`. Use `dark:` variants, not separate
  stylesheets.
- Use the `brand` colour scale defined in the `@theme` block of
  `src/index.css`, and the built-in `slate` scale for surfaces and text.
- `rounded-card` comes from `--radius-card`. Do not hardcode border radii.
- Keep spacing from the Tailwind scale; the interface is consistent because
  every card uses the same border, radius and shadow tokens.
- Mobile-first: write the mobile layout first, then layer `sm:`/`lg:`/`xl:`.
  The dashboard and every dialog must be usable at 375px with no horizontal
  overflow. For tight rows, stack fields onto their own line rather than
  shrinking them below a usable width.
- Pair every colour with a `dark:` counterpart.
- Restrained transitions only. Respect `prefers-reduced-motion` (handled
  globally in `src/index.css`).

### Line endings

`.gitattributes` normalises text files to LF. Keep `endOfLine: "lf"` in
`.prettierrc.json`.

## Data and UX rules

- Clearly separate sample data from student data. The UI says "Sample data"
  and "Local data" where those apply.
- Every control must do something real. No decorative buttons.
- No fake AI output, and no copy that implies an unimplemented feature is live.
  The settings page lists planned features under "Not available yet".
- No secrets, API keys or credentials in frontend code. Anything prefixed
  `VITE_` ships in the browser bundle, so secrets must never use that prefix.
- Sample data is restored only when the student presses a restore button. It
  must never be silently re-created after a deletion.

## Tool-call rules

- Use the file-writing tool's documented parameters: `filePath` and `content`.
  Omitting either is a failed call.
- Do not delete or overwrite existing working files. `lib/constants.ts`,
  `lib/date.ts`, `types/index.ts` and `test/setup.ts` predate this work —
  keep and extend them.
- Prefer editing existing files over creating new ones.
- Work in small batches and verify with typecheck before continuing.
