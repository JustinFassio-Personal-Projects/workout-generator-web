import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Navbar } from '@/components/landing/Navbar/Navbar'
import * as analyticsModule from '@/lib/analytics'

// Mock analytics
vi.mock('@/lib/analytics', () => ({
  trackButtonClick: vi.fn(),
  trackNavigationClick: vi.fn(),
  trackVercelEvent: vi.fn(),
  analytics: {
    trackLoginIntent: vi.fn(),
  },
}))

// Note: next/image is already mocked globally in src/test/setup.ts
// We don't need to mock it here, and doing so can cause conflicts in the test suite

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.alert
    global.alert = vi.fn()
    // Reset body overflow (Drawer component modifies it)
    document.body.style.overflow = ''
  })

  afterEach(() => {
    // Cleanup: Reset body overflow after each test
    document.body.style.overflow = ''
    vi.clearAllMocks()
    // Cleanup rendered components to prevent test isolation issues
    cleanup()
  })

  it('should render navbar with logo', () => {
    render(<Navbar />)
    // Brand name should be visible
    expect(screen.getByText(/AI Workout/i)).toBeInTheDocument()
    expect(screen.getByText(/Generator/i)).toBeInTheDocument()
    // Tagline should be visible
    expect(screen.getByText(/AI-Powered Fitness Plans/i)).toBeInTheDocument()
  })

  it('should render navigation links', () => {
    render(<Navbar />)
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /blog/i })).toBeInTheDocument()
  })

  it('should render Sign In button', () => {
    render(<Navbar />)
    const signInButton = screen.getByRole('button', { name: /sign in/i })
    expect(signInButton).toBeInTheDocument()
  })

  it('should render mobile menu button', () => {
    render(<Navbar />)
    const menuButton = screen.getByRole('button', { name: /open menu/i })
    expect(menuButton).toBeInTheDocument()
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
  })

  it('should open drawer when menu button is clicked', async () => {
    const user = userEvent.setup()
    render(<Navbar />)

    const menuButton = screen.getByRole('button', { name: /open menu/i })
    await act(async () => {
      await user.click(menuButton)
    })

    // Drawer should be open (check for drawer content)
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    expect(menuButton).toHaveAttribute('aria-expanded', 'true')
  })

  it('should close drawer when overlay is clicked', async () => {
    const user = userEvent.setup()
    render(<Navbar />)

    // Open drawer
    const menuButton = screen.getByRole('button', { name: /open menu/i })
    await act(async () => {
      await user.click(menuButton)
    })

    // Wait for drawer to be open
    await waitFor(
      () => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      },
      { timeout: 5000 }
    )

    // Close drawer via overlay
    const overlay = screen.getByTestId('drawer-overlay')
    await act(async () => {
      await user.click(overlay)
    })

    // Wait for drawer to be closed
    await waitFor(
      () => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      },
      { timeout: 5000 }
    )
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
  }, 20000)

  it('should close drawer when navigation link is clicked', async () => {
    const user = userEvent.setup()
    render(<Navbar />)

    // Open drawer
    const menuButton = screen.getByRole('button', { name: /open menu/i })
    await act(async () => {
      await user.click(menuButton)
    })

    // Wait for drawer to be open
    await waitFor(
      () => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      },
      { timeout: 5000 }
    )

    // Click navigation link
    const homeLink = screen.getAllByRole('link', { name: /home/i })[0]
    await act(async () => {
      await user.click(homeLink)
    })

    // Drawer should be closed
    await waitFor(
      () => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      },
      { timeout: 5000 }
    )
  }, 20000)

  it('should close drawer when Sign In button is clicked', async () => {
    const user = userEvent.setup()
    render(<Navbar />)

    // Open drawer
    const menuButton = screen.getByRole('button', { name: /open menu/i })
    await act(async () => {
      await user.click(menuButton)
    })

    // Wait for drawer to be open
    await waitFor(
      () => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      },
      { timeout: 5000 }
    )

    // Click Sign In button in drawer
    const signInButtons = screen.getAllByRole('button', { name: /sign in/i })
    const drawerSignInButton = signInButtons.find(button => button.closest('[role="dialog"]'))
    if (drawerSignInButton) {
      await act(async () => {
        await user.click(drawerSignInButton)
      })
    }

    // Wait for drawer to be closed
    await waitFor(
      () => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      },
      { timeout: 5000 }
    )
  }, 20000)

  it('should have correct navigation role and aria-label', () => {
    render(<Navbar />)
    const nav = screen.getByRole('navigation', { name: /main navigation/i })
    expect(nav).toBeInTheDocument()
  }, 15000)
})
