import { render } from '@testing-library/react'
import type { RenderOptions } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement, ReactNode } from 'react'

type RenderOptionsWithoutWrapper = Omit<RenderOptions, 'wrapper'>

export type RenderWithRouterOptions = RenderOptionsWithoutWrapper & {
  route?: string
}

/**
 * Render a component inside a MemoryRouter so route-aware components
 * (Link, NavLink, useNavigate) behave deterministically in tests.
 */
export function renderWithRouter(
  ui: ReactElement,
  { route = '/dashboard', ...options }: RenderWithRouterOptions = {},
) {
  return render(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    ),
    ...options,
  })
}
