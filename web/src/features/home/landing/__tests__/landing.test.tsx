/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'

import { Landing } from '../index'

async function renderLanding() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const router = createRouter({
    routeTree: createRootRoute({ component: Landing }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

test('shows the JetCloud headline and hides partner and open-source claims', async () => {
  await renderLanding()
  expect(
    screen.getByRole('heading', { name: 'Every top model. One key.' })
  ).toBeInTheDocument()
  expect(screen.queryByText(/Cherry Studio|CC Switch|NewAPI/)).not.toBeInTheDocument()
  expect(screen.queryByText('Open Source')).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Models and prices' })).toHaveAttribute(
    'href',
    '/pricing'
  )
})

test('swaps only the model name in the demo snippet', async () => {
  const user = userEvent.setup()
  await renderLanding()
  expect(screen.getByText(/gpt-4o/)).toBeInTheDocument()
  await user.click(screen.getByRole('tab', { name: 'Claude' }))
  expect(screen.getByText(/claude-sonnet/)).toBeInTheDocument()
  expect(screen.queryByText(/gpt-4o/)).not.toBeInTheDocument()
})
