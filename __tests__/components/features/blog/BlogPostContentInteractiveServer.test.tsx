import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BlogPostContentInteractiveServer } from '@/components/features/blog/BlogPostContentInteractiveServer'
import { BlogPost } from '@/features/blog/types'

// Mock client components that BlogPostContentInteractiveServer imports
vi.mock('@/components/features/blog/InteractiveHero', () => ({
  InteractiveHero: ({ post }: { post: BlogPost }) => (
    <div data-testid="interactive-hero">{post.title}</div>
  ),
}))

vi.mock('@/components/features/blog/InteractiveNav', () => ({
  InteractiveNav: () => <nav data-testid="interactive-nav">Navigation</nav>,
}))

vi.mock('@/components/features/blog/ProgressChart', () => ({
  ProgressChart: () => <div data-testid="progress-chart">Progress Chart</div>,
}))

vi.mock('@/components/features/blog/TierSelector', () => ({
  TierSelector: () => <div data-testid="tier-selector">Tier Selector</div>,
}))

vi.mock('@/components/features/blog/LogicSimulation', () => ({
  LogicSimulation: () => <div data-testid="logic-simulation">Logic Simulation</div>,
}))

vi.mock('@/components/features/blog/RetentionChart', () => ({
  RetentionChart: () => <div data-testid="retention-chart">Retention Chart</div>,
}))

const mockPost: BlogPost = {
  id: '1',
  slug: 'test-interactive-post',
  title: 'Test Interactive Post',
  excerpt: 'Test excerpt for interactive post',
  content: 'Test content',
  date: '2025-01-15',
  author: 'Test Author',
  category: 'Test Category',
  tags: ['test', 'interactive'],
}

describe('BlogPostContentInteractiveServer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render interactive post article', () => {
    render(<BlogPostContentInteractiveServer post={mockPost} />)

    const article = document.querySelector('article')
    expect(article).toBeInTheDocument()
  })

  it('should render InteractiveNav component', () => {
    render(<BlogPostContentInteractiveServer post={mockPost} />)

    expect(screen.getByTestId('interactive-nav')).toBeInTheDocument()
  })

  it('should render InteractiveHero with post', () => {
    render(<BlogPostContentInteractiveServer post={mockPost} />)

    expect(screen.getByTestId('interactive-hero')).toBeInTheDocument()
    expect(screen.getByText('Test Interactive Post')).toBeInTheDocument()
  })

  it('should render all interactive sections', () => {
    render(<BlogPostContentInteractiveServer post={mockPost} />)

    expect(screen.getByTestId('progress-chart')).toBeInTheDocument()
    expect(screen.getByTestId('tier-selector')).toBeInTheDocument()
    expect(screen.getByTestId('logic-simulation')).toBeInTheDocument()
    expect(screen.getByTestId('retention-chart')).toBeInTheDocument()
  })

  it('should render section headings', () => {
    render(<BlogPostContentInteractiveServer post={mockPost} />)

    expect(screen.getByRole('heading', { name: /The "Randomness" Trap/i })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /The 3 Tiers of AI Fitness Tools/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /How It Thinks: System vs\. Random/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /The 2026 Verdict/i })).toBeInTheDocument()
  })

  it('should render footer with copyright', () => {
    render(<BlogPostContentInteractiveServer post={mockPost} />)

    expect(screen.getByText(/© 2026 AI Workout Generator Research/i)).toBeInTheDocument()
  })

  it('should render CTA button link', () => {
    render(<BlogPostContentInteractiveServer post={mockPost} />)

    const ctaLink = screen.getByRole('link', { name: /Generate Your System Plan/i })
    expect(ctaLink).toBeInTheDocument()
    expect(ctaLink).toHaveAttribute('href', '/onboard')
  })

  it('should render all list items in verdict section', () => {
    render(<BlogPostContentInteractiveServer post={mockPost} />)

    expect(screen.getByText(/Retention:/i)).toBeInTheDocument()
    expect(screen.getByText(/Results:/i)).toBeInTheDocument()
    expect(screen.getByText(/Safety:/i)).toBeInTheDocument()
  })
})
