# AGENTS.md

Guidance for AI agents and human contributors working on CampusFlow AI. Read
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
  because `vite.config.ts` restricts coverage to `src/test/**`.

### State and data

- **Assignments are student-owned state.** They start as sample data, then
  live in `localStorage` (`campusflow.assignments.v1`) via `useLocalStorage`.
  Pages read them from `useAssignments()` and call actions on them.
- **Subjects and class sessions are static mock data** in `src/lib/mockData.ts`
  and are not editable in this phase. Label them as sample data in the UI.
- Derived selectors (`activeAssignments`, `overdueAssignments`,
  `upcomingAssignments`, `completedAssignments`, `todayClasses`,
  `weekSchedule`, `stats`) are computed inside the store, not in components.

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

### React

- Function components only. One exported component per file, plus small
  unexported helpers below it.
- Do not export non-component values from a `.tsx` file
  (`react-refresh/only-export-components`). Put pure helpers in a `.ts`
  sibling — see `features/assignments/validation.ts`.
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
- Pair every colour with a `dark:` counterpart.
- Restrained transitions only. Respect `prefers-reduced-motion` (handled
  globally in `src/index.css`).

## Data and UX rules

- Clearly separate sample data from student data. The UI says "Sample data"
  and "Local data" where those apply.
- Every control must do something real. No decorative buttons.
- No fake AI output, and no copy that implies an unimplemented feature is live.
  The settings page lists planned features under "Not available yet".
- No secrets, API keys or credentials in frontend code. Anything prefixed
  `VITE_` ships in the browser bundle, so secrets must never use that prefix.

## Tool-call rules

- Use the file-writing tool's documented parameters: `filePath` and `content`.
  Omitting either is a failed call.
- Do not delete or overwrite existing working files. The initial project
  already contained `lib/constants.ts`, `lib/date.ts`, `types/index.ts` and
  `test/setup.ts` — keep and extend them.
- Prefer editing existing files over creating new ones.
- Work in small batches and verify with typecheck before continuing.
