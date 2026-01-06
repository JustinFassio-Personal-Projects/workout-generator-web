import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Bio } from '@/components/landing/Bio/Bio'

// Mock dependencies
const mockTrackButtonClick = vi.fn()

vi.mock('@/lib/analytics', () => ({
  trackButtonClick: (...args: any[]) => mockTrackButtonClick(...args),
}))

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    onClick,
  }: {
    children: React.ReactNode
    href: string
    onClick?: () => void
  }) => (
    <a href={href} onClick={onClick}>
      {children}
    </a>
  ),
}))

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: any }) => (
    <img src={src} alt={alt} {...props} data-testid="profile-image" />
  ),
}))

vi.mock('@/components/ui/Button/Button', () => ({
  Button: ({
    children,
    variant,
    size,
    icon: Icon,
    iconPosition,
    onClick,
  }: {
    children: React.ReactNode
    variant?: string
    size?: string
    icon?: any
    iconPosition?: string
    onClick?: () => void
  }) => (
    <button
      data-testid={`button-${variant || 'default'}`}
      data-size={size}
      onClick={onClick}
      data-icon-position={iconPosition}
    >
      {iconPosition === 'left' && Icon && <Icon />}
      {children}
      {iconPosition === 'right' && Icon && <Icon />}
    </button>
  ),
}))

vi.mock('@/components/ui/LogoWatermark/LogoWatermark', () => ({
  LogoWatermark: () => <div data-testid="logo-watermark">LogoWatermark</div>,
}))

vi.mock('lucide-react', () => ({
  ArrowRight: () => <span data-testid="arrow-icon">→</span>,
  Check: () => <span data-testid="check-icon">✓</span>,
}))

describe('Bio', () => {
  let mockGetElementById: any
  let mockScrollIntoView: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock document.getElementById
    mockScrollIntoView = vi.fn()
    mockGetElementById = vi.fn()
    document.getElementById = mockGetElementById
  })

  it('should render bio section with image and content', () => {
    render(<Bio />)

    expect(screen.getByTestId('profile-image')).toBeInTheDocument()
    expect(screen.getByText(/Built by a coach, not a prompt/)).toBeInTheDocument()
    expect(screen.getByText(/Justin Fassio/)).toBeInTheDocument()
  })

  it('should render credentials list', () => {
    render(<Bio />)

    expect(screen.getByText(/Certified trainer since 1996/)).toBeInTheDocument()
    expect(screen.getByText(/U.S. Air Force TACP veteran/)).toBeInTheDocument()
    expect(screen.getByText(/Founder: San Diego Core Fitness/)).toBeInTheDocument()
    expect(screen.getByText(/Builder\/designer: GymGo/)).toBeInTheDocument()
  })

  it('should render all credentials with check icons', () => {
    render(<Bio />)

    const checkIcons = screen.getAllByTestId('check-icon')
    expect(checkIcons.length).toBe(4) // 4 credentials
  })

  it('should handle "Read the Founder Story" button click', async () => {
    const user = userEvent.setup()
    render(<Bio />)

    const link = screen.getByRole('link', { name: /Read the Founder Story/i })
    await user.click(link)

    expect(mockTrackButtonClick).toHaveBeenCalledWith('Read the Founder Story', 'bio')
    expect(link).toHaveAttribute('href', '/founder-story')
  })

  it('should handle "Generate My First Workout" button click and scroll', async () => {
    const user = userEvent.setup()

    // Mock element for scrollIntoView
    const mockElement = {
      scrollIntoView: mockScrollIntoView,
    }
    mockGetElementById.mockReturnValue(mockElement)

    render(<Bio />)

    const button = screen.getByRole('button', { name: /Generate My First Workout/i })
    await user.click(button)

    expect(mockTrackButtonClick).toHaveBeenCalledWith('Generate My First Workout', 'bio')
    expect(mockGetElementById).toHaveBeenCalledWith('workout-builder')
    expect(mockScrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    })
  })

  it('should handle scroll when workout-builder element does not exist', async () => {
    const user = userEvent.setup()

    // Mock getElementById to return null
    mockGetElementById.mockReturnValue(null)

    render(<Bio />)

    const button = screen.getByRole('button', { name: /Generate My First Workout/i })

    // Should not throw error when element doesn't exist
    await user.click(button)

    expect(mockTrackButtonClick).toHaveBeenCalledWith('Generate My First Workout', 'bio')
    expect(mockGetElementById).toHaveBeenCalledWith('workout-builder')
    expect(mockScrollIntoView).not.toHaveBeenCalled()
  })

  it('should render both CTA buttons', () => {
    render(<Bio />)

    expect(screen.getByRole('link', { name: /Read the Founder Story/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Generate My First Workout/i })).toBeInTheDocument()
  })

  it('should render founder story button with arrow icon', () => {
    render(<Bio />)

    const link = screen.getByRole('link', { name: /Read the Founder Story/i })
    expect(link).toBeInTheDocument()
    expect(screen.getByTestId('arrow-icon')).toBeInTheDocument()
  })

  it('should render micro trust text', () => {
    render(<Bio />)

    expect(screen.getByText(/AI-generated doesn't mean reckless/)).toBeInTheDocument()
  })

  it('should render logo watermark', () => {
    render(<Bio />)

    expect(screen.getByTestId('logo-watermark')).toBeInTheDocument()
  })

  it('should render expertise section title', () => {
    render(<Bio />)

    expect(screen.getByText(/Expertise and Experience Behind Every Workout/)).toBeInTheDocument()
  })
})
