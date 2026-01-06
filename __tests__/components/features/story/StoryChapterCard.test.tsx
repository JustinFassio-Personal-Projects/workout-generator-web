import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StoryChapterCard } from '@/components/features/story/StoryChapterCard'
import * as analyticsModule from '@/lib/analytics'
import type { Chapter } from '@/data/story/chapters'

// Mock Card component
vi.mock('@/components/ui/Card/Card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className} data-testid="card">
      {children}
    </div>
  ),
}))

// Mock Next.js Link
vi.mock('next/link', () => ({
  default: ({ children, href, onClick, className, ...props }: any) => (
    <a href={href} onClick={onClick} className={className} {...props}>
      {children}
    </a>
  ),
}))

// Mock analytics
vi.mock('@/lib/analytics', () => ({
  trackNavigationClick: vi.fn(),
}))

// Mock AOS
vi.mock('aos', () => ({
  default: {
    init: vi.fn(),
  },
}))

describe('StoryChapterCard', () => {
  const mockChapter: Chapter = {
    slug: 'test-chapter',
    title: 'Test Chapter Title',
    description: 'Test chapter description',
    order: 1,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render chapter title, description, and order badge', () => {
    render(<StoryChapterCard chapter={mockChapter} index={0} />)

    expect(screen.getByText('Test Chapter Title')).toBeInTheDocument()
    expect(screen.getByText('Test chapter description')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument() // Order badge
  })

  it('should render "Read chapter" link', () => {
    render(<StoryChapterCard chapter={mockChapter} index={0} />)

    expect(screen.getByText(/Read chapter/i)).toBeInTheDocument()
  })

  it('should link to correct URL', () => {
    render(<StoryChapterCard chapter={mockChapter} index={0} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/story/test-chapter')
  })

  it('should call trackNavigationClick with correct parameters when clicked', () => {
    const { trackNavigationClick } = analyticsModule
    render(<StoryChapterCard chapter={mockChapter} index={0} />)

    const link = screen.getByRole('link')
    // Prevent navigation to avoid jsdom errors
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
    vi.spyOn(clickEvent, 'preventDefault')
    fireEvent.click(link, clickEvent)

    expect(trackNavigationClick).toHaveBeenCalledWith(
      '/story/test-chapter',
      'chapter_card',
      'founder_story',
      {
        chapter_slug: 'test-chapter',
        chapter_order: 1,
      }
    )
  })

  it('should render with data-aos attribute and delay based on index', () => {
    const { container } = render(<StoryChapterCard chapter={mockChapter} index={2} />)

    const link = container.querySelector('[data-aos="fade-up"]')
    expect(link).not.toBeNull()
    if (link) {
      expect(link).toHaveAttribute('data-aos-delay', '100') // 2 * 50
    }
  })

  it('should render Card component', () => {
    render(<StoryChapterCard chapter={mockChapter} index={0} />)

    expect(screen.getByTestId('card')).toBeInTheDocument()
  })
})
