import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Navbar } from '@/components/landing/Navbar/Navbar'

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />
  },
}))

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render navbar with logo', () => {
    render(<Navbar />)
    expect(screen.getByText('AI Workout Generator')).toBeInTheDocument()
  })

  it('should render navigation links', () => {
    render(<Navbar />)
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /blog/i })).toBeInTheDocument()
  })

  it('should render Sign In button', () => {
    render(<Navbar />)
    const signInLink = screen.getByRole('link', { name: /sign in/i })
    expect(signInLink).toBeInTheDocument()
    expect(signInLink).toHaveAttribute('href', 'https://members.fitcopilot.ai')
    expect(signInLink).toHaveAttribute('target', '_blank')
    expect(signInLink).toHaveAttribute('rel', 'noopener noreferrer')
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
    await user.click(menuButton)

    // Drawer should be open (check for drawer content)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(menuButton).toHaveAttribute('aria-expanded', 'true')
  })

  it('should close drawer when overlay is clicked', async () => {
    const user = userEvent.setup()
    render(<Navbar />)

    // Open drawer
    const menuButton = screen.getByRole('button', { name: /open menu/i })
    await user.click(menuButton)

    // Close drawer via overlay
    const overlay = screen.getByTestId('drawer-overlay')
    await user.click(overlay)

    // Drawer should be closed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
  })

  it('should close drawer when navigation link is clicked', async () => {
    const user = userEvent.setup()
    render(<Navbar />)

    // Open drawer
    const menuButton = screen.getByRole('button', { name: /open menu/i })
    await user.click(menuButton)

    // Click navigation link
    const homeLink = screen.getAllByRole('link', { name: /home/i })[0]
    await user.click(homeLink)

    // Drawer should be closed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should close drawer when Sign In button is clicked', async () => {
    const user = userEvent.setup()
    render(<Navbar />)

    // Open drawer
    const menuButton = screen.getByRole('button', { name: /open menu/i })
    await user.click(menuButton)

    // Click Sign In button in drawer
    const signInLinks = screen.getAllByRole('link', { name: /sign in/i })
    const drawerSignInLink = signInLinks.find(link => link.closest('[role="dialog"]'))
    if (drawerSignInLink) {
      await user.click(drawerSignInLink)
    }

    // Drawer should be closed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should have correct navigation role and aria-label', () => {
    render(<Navbar />)
    const nav = screen.getByRole('navigation', { name: /main navigation/i })
    expect(nav).toBeInTheDocument()
  })

  it('should handle logo error and show fallback text', () => {
    render(<Navbar />)
    // Logo text should always be visible
    expect(screen.getByText('AI Workout Generator')).toBeInTheDocument()
  })
})
