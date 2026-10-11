# CampusFlow AI

A mobile-first academic productivity platform for university, college and high school
students: schedules, assignment tracking, a gradebook and AI-assisted study work.

**Phase 1 — Project Foundation** (current build): the application shell, dashboard,
subjects, assignments, calendar, theming, and typed local mock data. There is no
backend, no authentication and no AI integration yet. Core features are free.

## Stack

| Concern      | Choice                                     |
| ------------ | ------------------------------------------ |
| Framework    | React 19 + TypeScript (strict)             |
| Build tool   | Vite 8                                     |
| Styling      | Tailwind CSS v4                            |
| Routing      | React Router 7                             |
| Icons        | Lucide React                               |
| Linting      | ESLint (flat config)                       |
| Formatting   | Prettier                                   |
| Testing      | Vitest + React Testing Library + jsdom     |

## Requirements

- Node.js 20.19+ or 22.12+ (Node 24 recommended — Vite 8 requires it)
- npm 10+

## Getting started

```bash
npm install
npm run dev
```

The dev server prints its local URL (default <http://localhost:5173>).

## Commands

| Command                | What it does                                  |
| ---------------------- | --------------------------------------------- |
| `npm run dev`          | Start the Vite dev server with HMR            |
| `npm run build`        | Typecheck and produce a production build in `dist/` |
| `npm run preview`      | Serve the production build locally            |
| `npm run lint`         | Run ESLint across the project                 |
| `npm run typecheck`    | Typecheck with `tsc --noEmit`                 |
| `npm run test`         | Run Vitest in watch mode                      |
| `npm run test -- --run` | Run the test suite once                      |

## Features in this phase

- **Dashboard** — greeting, day summary tiles, today's classes, upcoming
  deadlines, subject overview and quick actions.
- **Today's classes** — the current weekday's sessions with time, location,
  an "in progress" marker, and styling for classes that already finished.
- **Upcoming deadlines** — pending work sorted by due date then priority,
  with overdue highlighting.
- **Assignment list** — add, complete, delete and filter assignments.
  Changes persist to `localStorage` under `campusflow.assignments.v1`.
- **Subject overview** — six sample subjects with credits, instructor and a
  sample grade ring.
- **Weekly calendar** — all seven days of class sessions, with today
  highlighted.
- **Appearance** — light, dark and "follow system" themes, persisted under
  `campusflow.theme.v1`.
- **Responsive shell** — sidebar navigation on desktop, bottom tab bar plus a
  top bar on mobile, and a keyboard-accessible skip link.

### What is *not* in this phase

These are surfaced in the UI so no control implies a working feature that does
not exist yet: AI planning, AI assignment help, document upload (PDF/DOCX/
image), the grade calculator with custom weights, cloud sync and accounts.

## Project structure

```
src/
├── app/                      # app-level wiring (router providers) — reserved
├── components/
│   ├── layout/               # AppLayout, Sidebar, MobileNav
│   └── ui/                   # Button, Card, Badge, EmptyState, LoadingState,
│                             # ThemeToggle, PageHeader, GradeRing, SubjectChip
├── features/
│   ├── assignments/          # store, AssignmentCard, AssignmentList,
│   │                         # AssignmentForm, validation, display helpers
│   ├── calendar/             # weekly schedule page
│   ├── dashboard/            # dashboard page and its sections
│   ├── settings/             # theme, local data, planned features
│   └── subjects/             # subject overview page
├── hooks/                    # useLocalStorage, useTheme, useAssignments store
├── lib/                      # constants, date helpers, grade helpers, cn utils
├── types/                    # shared types
└── test/                     # Vitest setup and specs
```

Data flow is one-directional: `hooks/features/assignments/store.ts` owns
assignment state and exposes derived selectors (`activeAssignments`,
`overdueAssignments`, `upcomingAssignments`, `completedAssignments`,
`todayClasses`, `weekSchedule`, `stats`). Pages read from it; `lib/` holds pure
functions that are unit-tested in isolation.

## Data model

`Assignment`, `Subject`, `ClassSession` and `GradeRecord` live in
`src/types/index.ts`. Subjects and class sessions are static sample data in
`src/lib/mockData.ts`. Assignments start as sample data but are owned by the
student at runtime — they are the only mutable dataset in this phase, and they
live in this browser only.

## Date handling

Dates are timezone-less `yyyy-mm-dd` strings built from **local** date
components (`src/lib/date.ts`). Using `toISOString()` would roll dates back a
day in any timezone ahead of UTC and make every deadline appear a day early.

## Testing

```bash
npm run test -- --run
```

Covered areas: date arithmetic and relative-day labelling, grade calculations
and edge cases (division by zero, empty sets), the assignments store (add,
toggle, delete, unique ids, persistence, sorting), and dashboard and form
behaviour including validation.

## Verification status

The following were executed against this workspace (Node 24.18.1, npm 11.16.0):

| Check               | Result                                             |
| ------------------- | -------------------------------------------------- |
| `npm run lint`      | Pass — 0 error-level problems                       |
| `npm run typecheck` | Pass — no errors                                    |
| `npm run test -- --run` | Pass — 51 tests in 4 files                     |
| `npm run build`     | Pass — 1952 modules, 318.66 kB JS / 98.63 kB gzip  |

## Roadmap

- **Phase 2** — Assignment and deadline management depth: recurring work,
  reminders, filtering and sorting.
- **Phase 3** — Grade calculator with weighted categories and grade goals.
- **Phase 4** — AI academic planning (provider-independent) and assignment
  assistance for multiple-choice, enumeration, essay and other formats.
- **Phase 5** — Document handling: PDF, DOCX and image upload, AI-assisted
  editing and DOCX export.
- **Phase 6** — Accounts, cloud sync and offline-first caching.

## Contributing conventions

See [AGENTS.md](./AGENTS.md) for architecture rules, conventions and the
implementation boundaries for this phase.
