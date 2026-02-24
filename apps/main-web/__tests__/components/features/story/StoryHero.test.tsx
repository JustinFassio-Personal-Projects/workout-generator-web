import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StoryHero } from '@/components/features/story/StoryHero'

// Mock AOS
vi.mock('aos', () => ({
  default: {
    init: vi.fn(),
  },
}))

// Mock LogoWatermark
vi.mock('@/components/ui/LogoWatermark/LogoWatermark', () => ({
  LogoWatermark: () => <div data-testid="logo-watermark">LogoWatermark</div>,
}))

describe('StoryHero', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render title and tagline', () => {
    render(<StoryHero title="Test Title" tagline="Test tagline text" />)

    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test tagline text')).toBeInTheDocument()
  })

  it('should render heroText when provided (replaces tagline)', () => {
    const heroText = 'Hero text line 1\nHero text line 2'
    render(<StoryHero title="Test Title" tagline="Test tagline" heroText={heroText} />)

    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText(/Hero text line 1/)).toBeInTheDocument()
    expect(screen.getByText(/Hero text line 2/)).toBeInTheDocument()
    // Tagline should still be rendered as secondary when heroText is provided
    expect(screen.getByText('Test tagline')).toBeInTheDocument()
  })

  it('should format heroText with line breaks', () => {
    const heroText = 'Line 1\nLine 2\nLine 3'
    render(<StoryHero title="Test Title" tagline="Tagline" heroText={heroText} />)

    // All lines should be present
    expect(screen.getByText(/Line 1/)).toBeInTheDocument()
    expect(screen.getByText(/Line 2/)).toBeInTheDocument()
    expect(screen.getByText(/Line 3/)).toBeInTheDocument()
  })

  it('should render secondary tagline when heroText is provided', () => {
    render(
      <StoryHero title="Test Title" tagline="Secondary tagline" heroText="Hero text content" />
    )

    expect(screen.getByText('Secondary tagline')).toBeInTheDocument()
    expect(screen.getByText(/Hero text content/)).toBeInTheDocument()
  })

  it('should render logo watermark', () => {
    render(<StoryHero title="Test Title" tagline="Test tagline" />)

    expect(screen.getByTestId('logo-watermark')).toBeInTheDocument()
  })

  it('should render with data-aos attribute', () => {
    const { container } = render(<StoryHero title="Test Title" tagline="Test tagline" />)

    const contentDiv = container.querySelector('[data-aos="fade-up"]')
    expect(contentDiv).toBeInTheDocument()
  })
})
