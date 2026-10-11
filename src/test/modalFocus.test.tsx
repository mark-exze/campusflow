import { useState } from 'react'

import { Modal } from '../components/ui/Modal'
import { renderAppAt } from './renderAppAt'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * A dialog whose PARENT re-renders on every keystroke. This reproduces the
 * condition that used to steal focus: `Modal` received a fresh inline
 * `onClose` arrow each time, which re-ran the focus-setup effect and yanked
 * focus back to the panel.
 */
function HostWithRerenderingParent() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')

  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>

      <p data-testid="render-marker">{name.length}</p>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Edit subject"
        footer={
          <button type="button" onClick={() => setOpen(false)}>
            Done
          </button>
        }
      >
        <label htmlFor="subject-name">Subject name</label>
        <input
          id="subject-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Modal>
    </div>
  )
}

describe('Modal focus stability', () => {
  it('keeps focus in a field while the parent re-renders on each keystroke', async () => {
    const user = userEvent.setup()
    render(<HostWithRerenderingParent />)

    await user.click(screen.getByRole('button', { name: /open dialog/i }))

    const input = screen.getByLabelText(/subject name/i)
    await user.click(input)
    expect(input).toHaveFocus()

    // The parent re-renders on every keystroke, so each character would have
    // lost focus under the old dependency array.
    await user.type(input, 'Calc')

    expect(input).toHaveFocus()
    expect(input).toHaveValue('Calc')
  })

  it('never lets focus escape the dialog when tabbing', async () => {
    const user = userEvent.setup()
    render(<HostWithRerenderingParent />)

    await user.click(screen.getByRole('button', { name: /open dialog/i }))
    const dialog = screen.getByRole('dialog')
    const input = screen.getByLabelText(/subject name/i)
    await user.click(input)

    // Tab repeatedly: focus must always remain inside the panel.
    for (let index = 0; index < 6; index += 1) {
      await user.tab()
      expect(dialog.contains(document.activeElement)).toBe(true)
    }

    // Shift+Tab must behave the same way.
    await user.tab({ shift: true })
    expect(dialog.contains(document.activeElement)).toBe(true)
  })

  it('restores focus to the trigger when the dialog closes', async () => {
    const user = userEvent.setup()
    render(<HostWithRerenderingParent />)

    const trigger = screen.getByRole('button', { name: /open dialog/i })
    trigger.focus()

    await user.click(trigger)
    const input = screen.getByLabelText(/subject name/i)
    expect(input).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('locks and restores scrolling of the page behind the dialog', async () => {
    const user = userEvent.setup()
    render(<HostWithRerenderingParent />)

    expect(document.body.style.overflow).toBe('')

    await user.click(screen.getByRole('button', { name: /open dialog/i }))
    expect(document.body.style.overflow).toBe('hidden')

    await user.keyboard('{Escape}')
    expect(document.body.style.overflow).toBe('')
  })

  it('keeps the real app dialogs free of the same issue', async () => {
    // The subject form lives in a Modal. Its own state changes on each
    // keystroke, which is exactly the re-render condition.
    const user = userEvent.setup()
    renderAppAt('/subjects')

    await user.click(screen.getAllByRole('button', { name: /^Edit /i })[0]!)
    const dialog = await screen.findByRole('dialog')

    const nameInput = within(dialog).getByLabelText(/subject name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Renamed')

    expect(nameInput).toHaveFocus()
    expect(nameInput).toHaveValue('Renamed')
  })
})
