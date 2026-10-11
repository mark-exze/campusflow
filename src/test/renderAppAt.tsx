import { render } from '@testing-library/react'

import App from '../App'

/**
 * Render the whole app. `App` owns its own BrowserRouter, so instead of
 * wrapping it again we point the jsdom address bar at the route first.
 */
export function renderAppAt(route: string) {
  window.history.pushState({}, 'Test page', route)
  return render(<App />)
}
