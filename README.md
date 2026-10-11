# CampusFlow AI

A mobile-first academic productivity platform for university, college and high school
students: schedules, assignment tracking, a gradebook and AI-assisted study work.

**Phase 1 — Project Foundation** (current build): the application shell, dashboard,
subjects, assignments, calendar, theming, and a student profile — all against
**local sample data only**. There is no backend, no authentication and no AI
integration yet. Core features are free.

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

- **Dashboard** — greeting with the student's name, day summary tiles, today's
  classes, upcoming deadlines, subject overview and quick actions.
- **Today's classes** — the current weekday's sessions with time, location,
  an "in progress" marker, and styling for classes that already finished.
- **Upcoming deadlines** — pending work sorted by due date then priority,
  with overdue highlighting.
- **Assignment list** — add, complete, delete and filter assignments.
  Changes persist to `localStorage` under `campusflow.assignments.v1`.
- **Subject management** — create, edit, archive, restore and delete subjects,
  with code, name, instructor, colour, credits, classroom and a weekly
  schedule. Persisted under `campusflow.subjects.v1`.
- **Student profile** — display name, school level, school name, academic
  year, term/semester and preferred date format, editable in Settings.
  Persisted under `campusflow.profile.v1`.
- **Weekly calendar** — all seven days of classes derived from subject
  schedules, with today highlighted, and dates rendered in the student's
  preferred format.
- **Appearance** — light, dark and "follow system" themes, persisted under
  `campusflow.theme.v1`.
- **Responsive shell** — sidebar navigation on desktop, bottom tab bar plus a
  top bar on mobile, and a keyboard-accessible skip link.
- **Accessible dialogs** — Escape to close, focus trapping, focus restoration,
  and scroll locking, via one shared `Modal`.

### Data integrity

Subjects are referenced by assignment `id`, so deleting a subject that still
has assignments is **refused**, and the dialog offers two safe paths:

1. **Archive instead** — keeps the subject and all of its assignments.
2. **Delete subject and its N assignments** — removes both together, so no
   assignment is ever left pointing at a missing subject.

Subject ids are stable across edits, so renaming a subject never orphans its
assignments.

### What is *not* in this phase

Listed in the UI so no control implies a working feature that does not yet
exist: AI planning, AI assignment help, document upload (PDF/DOCX/image),
the grade calculator with custom weights, cloud sync and accounts.

## Project structure

```
src/
├── components/
│   ├── layout/               # AppLayout, Sidebar, MobileNav
│   └── ui/                   # Button, ButtonLink, Card, Badge, Field, Modal,
│                             # EmptyState, LoadingState, ThemeToggle,
│                             # PageHeader, GradeRing, SubjectChip, Icon
├── features/
│   ├── assignments/          # store, AssignmentCard, AssignmentList,
│   │                         # AssignmentForm, validation, display helpers
│   ├── calendar/             # weekly schedule page
│   ├── dashboard/            # dashboard page and its sections
│   ├── profile/              # ProfileForm
│   ├── settings/             # theme, profile, local data, planned features
│   └── subjects/             # store, SubjectCard, SubjectForm, page
├── hooks/                    # useLocalStorage, useTheme, useProfile
├── lib/                      # constants, date, subjects, profile, grade,
│                             # mockData, cn utils
├── types/                    # shared types
└── test/                     # Vitest setup and specs
```

Data flow is one-directional. Each store owns its own localStorage key and
exposes derived selectors; pages read from the store; `lib/` holds pure
functions that are unit-tested in isolation.

## Data model

`StudentProfile`, `Subject`, `SubjectSchedule`, `Assignment`, `ClassSession`
and `GradeRecord` live in `src/types/index.ts`. Sample data lives in
`src/lib/mockData.ts`. Class sessions are **derived** from subject schedules
(`lib/subjects.ts` → `deriveClassSessions`) rather than stored separately, so
there is no second schedule to drift out of sync.

## Date handling

Dates are timezone-less `yyyy-mm-dd` strings built from **local** date
components (`src/lib/date.ts`). Using `toISOString()` would roll dates back a
day in any timezone ahead of UTC and make every deadline appear a day early.
`formatDateWithPreference` renders dates in the format stored on the profile.

## Testing

```bash
npm run test -- --run
```

Covered areas: date arithmetic and relative-day labelling, grade calculations
and edge cases, profile normalization/validation and persistence, subject
CRUD, archive behaviour, duplicate code detection, referential integrity on
delete, derived class sessions, the assignments store, and dashboard, subjects
page and settings behaviour including dialogs and validation.

## Verification status

The following were executed against this workspace (Node 24.18.1, npm 11.16.0):

| Check             | Result                                             |
| ----------------- | -------------------------------------------------- |
| `npm run lint`    | Pass — 0 problems (errors or warnings)             |
| `npm run typecheck` | Pass — no errors                                 |
| `npm run test -- --run` | Pass — 131 tests in 7 files                   |
| `npm run build`   | Pass — 345.92 kB JS / 105.45 kB gzip               |

## Roadmap

- **Phase 1B.2** — Assignment and deadline depth: recurring work, reminders,
  filtering and sorting.
- **Phase 2** — Grade calculator with weighted categories and grade goals.
- **Phase 3** — AI academic planning (provider-independent) and assignment
  assistance for multiple-choice, enumeration, essay and other formats.
- **Phase 4** — Document handling: PDF, DOCX and image upload, AI-assisted
  editing and DOCX export.
- **Phase 5** — Accounts, cloud sync and offline-first caching.

## Contributing conventions

See [AGENTS.md](./AGENTS.md) for architecture rules, conventions and the
implementation boundaries for this phase.
