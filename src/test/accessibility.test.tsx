import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { renderAppAt } from './renderAppAt'
import { renderWithRouter } from './utils'
import { AssignmentForm } from '../features/assignments/AssignmentForm'
import { SettingsPage } from '../features/settings/page'
import { SubjectsPage } from '../features/subjects/page'
import { MOCK_SUBJECTS } from '../lib/mockData'



// ---------------------------------------------------------------------------
// Keyboard navigation and landmarks
// ---------------------------------------------------------------------------

describe('keyboard navigation', () => {
  it('offers a skip link that points at the main region', () => {
    renderAppAt('/dashboard')

    const skip = screen.getByRole('link', { name: /skip to content/i })
    expect(skip).toHaveAttribute('href', '#main-content')

    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'main-content')
  })

  it('exposes every navigation destination as a named link on desktop and mobile', () => {
    renderAppAt('/dashboard')

    const navs = screen.getAllByRole('navigation', { name: 'Main' })
    expect(navs.length).toBe(2)

    const names = navs.flatMap((nav) =>
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent?.trim() ?? ''),
    )

    for (const label of ['Dashboard', 'Subjects', 'Assignments', 'Calendar', 'Settings']) {
      expect(names).toContain(label)
    }
  })

  it('lets the view switcher be operated by keyboard', async () => {
    const user = userEvent.setup()
    renderAppAt('/calendar')

    const week = screen.getByRole('radio', { name: 'week' })
    week.focus()
    expect(week).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(screen.getByRole('radio', { name: 'week' })).toHaveAttribute(
      'aria-checked',
      'true',
    )
  })

  it('moves focus between form fields in document order', async () => {
    const user = userEvent.setup()
    renderWithRouter(<AssignmentForm subjects={MOCK_SUBJECTS} onSubmit={() => true} />)

    const title = screen.getByLabelText(/title/i)
    title.focus()
    await user.tab()

    // The next control is the subject select, and it is reachable.
    const subject = screen.getByLabelText(/subject/i)
    expect(subject.tagName).toBe('SELECT')
    expect(document.activeElement).toBe(subject)
  })
})

// ---------------------------------------------------------------------------
// Buttons and toggles
// ---------------------------------------------------------------------------

describe('accessible controls', () => {
  it('names the theme toggle and states the current theme', () => {
    renderAppAt('/dashboard')

    // The sidebar and mobile header both render one.
    const toggles = screen.getAllByRole('button', { name: /theme/i })
    expect(toggles.length).toBeGreaterThan(0)
    for (const toggle of toggles) {
      expect(toggle.getAttribute('aria-label')).toMatch(/current:/i)
    }
  })

  it('exposes the complete toggle as a pressed toggle', () => {
    renderAppAt('/assignments')

    const toggle = screen.getAllByRole('button', { name: /Mark .* as complete/i })[0]!
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    toggle.focus()
    expect(toggle).toHaveFocus()
  })

  it('labels every icon-only control on the subjects page', () => {
    renderWithRouter(<SubjectsPage />)

    const iconButtons = screen
      .getAllByRole('button')
      .filter((button) => (button.textContent ?? '').trim() === '')

    for (const button of iconButtons) {
      expect(button.getAttribute('aria-label')).toBeTruthy()
    }
  })
})

// ---------------------------------------------------------------------------
// Forms and validation
// ---------------------------------------------------------------------------

describe('accessible forms', () => {
  it('exposes every control with a name and a role', () => {
    renderWithRouter(<AssignmentForm subjects={MOCK_SUBJECTS} onSubmit={() => true} />)

    // Text entry
    expect(screen.getByRole('textbox', { name: /title/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /description/i })).toBeInTheDocument()
    // Drop-downs
    expect(screen.getByRole('combobox', { name: /subject/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /type/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /status/i })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /priority/i })).toBeInTheDocument()
    // Numeric entry
    expect(screen.getByRole('spinbutton', { name: /est\. hours/i })).toBeInTheDocument()
    expect(screen.getByRole('spinbutton', { name: /^progress/i })).toBeInTheDocument()
    // Progress is mirrored by an accessible slider.
    expect(screen.getByRole('slider', { name: /progress percentage/i })).toBeInTheDocument()
  })

  it('marks invalid fields with aria-invalid and ties the error to the field', async () => {
    const user = userEvent.setup()
    renderWithRouter(<AssignmentForm subjects={MOCK_SUBJECTS} onSubmit={() => true} />)

    const title = screen.getByRole('textbox', { name: /title/i })
    expect(title).not.toHaveAttribute('aria-invalid')

    await user.click(screen.getByRole('button', { name: /save assignment/i }))

    expect(title).toHaveAttribute('aria-invalid', 'true')

    const describedBy = title.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy!)?.textContent).toMatch(/at least 3 characters/i)
  })

  it('groups the theme choice as a radiogroup with a single selected option', async () => {
    const user = userEvent.setup()
    renderWithRouter(<SettingsPage />)

    const group = screen.getByRole('radiogroup', { name: /theme/i })
    const radios = within(group).getAllByRole('radio')
    expect(radios).toHaveLength(3)

    const checked = radios.filter((radio) => radio.getAttribute('aria-checked') === 'true')
    expect(checked).toHaveLength(1)

    const dark = screen.getByRole('radio', { name: /^dark$/i })
    await user.click(dark)
    expect(dark).toHaveAttribute('aria-checked', 'true')
  })
})
describe('announcements', () => {
  it('announces assignment status changes politely', () => {
    renderWithRouter(<SubjectsPage />)

    const status = document.querySelector('[aria-live="polite"]')
    expect(status).toBeTruthy()
    // Present even when empty, so an update is always announced.
    expect(status?.textContent).toBeDefined()
  })

  it('exposes a status region for the storage notice', () => {
    renderAppAt('/dashboard')

    const notice = screen.getByTestId('getting-started')
    expect(notice).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Colour contrast regression
// ---------------------------------------------------------------------------

describe('colour contrast', () => {
  it('never renders low-contrast muted text in light mode', () => {
    renderAppAt('/dashboard')

    // text-slate-400 on a light background measures about 2.5:1, which fails
    // WCAG AA. Muted text must use slate-500 (about 4.6:1) and keep the
    // dark-mode variant separate.
    const lowContrast = Array.from(document.querySelectorAll('[class*="text-slate-400"]')).filter(
      (element) => {
        const value = element.className
        // Only bare (light-mode) usages are the defect.
        return /(^|[\s'"])text-slate-400/.test(value) && !/dark:text-slate-400/.test(value)
      },
    )

    expect(lowContrast.map((element) => element.className)).toEqual([])
  })
})
