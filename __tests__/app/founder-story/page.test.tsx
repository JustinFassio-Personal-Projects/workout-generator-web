import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import FounderStoryPage from '@/app/founder-story/page'
import * as chaptersModule from '@/data/story/chapters'

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: (props: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt="" {...props} />
  ),
}))

// Mock StoryHero
vi.mock('@/components/features/story/StoryHero', () => ({
  StoryHero: ({ title, tagline }: any) => (
    <div data-testid="story-hero">
      <h1>{title}</h1>
      <p>{tagline}</p>
    </div>
  ),
}))

// Mock StoryChapterCard
vi.mock('@/components/features/story/StoryChapterCard', () => ({
  StoryChapterCard: ({ chapter }: any) => (
    <div data-testid="story-chapter-card">{chapter.title}</div>
  ),
}))

// Mock StoryCTASection
vi.mock('@/components/features/story/StoryCTASection', () => ({
  StoryCTASection: () => <div data-testid="story-cta-section">CTA Section</div>,
}))

// Mock StoryPageClient
vi.mock('@/components/features/story/StoryPageClient', () => ({
  StoryPageClient: () => <div data-testid="story-page-client">Page Client</div>,
}))

// Mock AOS
vi.mock('aos', () => ({
  default: {
    init: vi.fn(),
  },
}))

describe('FounderStoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render main sections', () => {
    const result = render(<FounderStoryPage />)

    expect(result.container.querySelector('main')).toBeInTheDocument()
    expect(result.getByTestId('story-hero')).toBeInTheDocument()
    expect(result.getByTestId('story-page-client')).toBeInTheDocument()
  })

  it('should render structured data (JSON-LD scripts)', () => {
    const result = render(<FounderStoryPage />)

    const scripts = result.container.querySelectorAll('script[type="application/ld+json"]')
    expect(scripts.length).toBe(2) // WebPage and BreadcrumbList schemas

    // Check that scripts contain expected schema types
    const scriptContents = Array.from(scripts).map(script => script.textContent)
    const hasWebPage = scriptContents.some(content => content?.includes('WebPage'))
    const hasBreadcrumbList = scriptContents.some(content => content?.includes('BreadcrumbList'))

    expect(hasWebPage).toBe(true)
    expect(hasBreadcrumbList).toBe(true)
  })

  it('should render all chapter cards', () => {
    const result = render(<FounderStoryPage />)

    const chapterCards = result.container.querySelectorAll('[data-testid="story-chapter-card"]')
    // Should render all chapters from getChaptersByOrder()
    expect(chapterCards.length).toBeGreaterThan(0)
  })

  it('should render principles grid', () => {
    const result = render(<FounderStoryPage />)

    expect(result.getByText('Principles that power the product')).toBeInTheDocument()
    expect(result.getByText('Safety')).toBeInTheDocument()
    expect(result.getByText('Progression')).toBeInTheDocument()
    expect(result.getByText('Adaptability')).toBeInTheDocument()
    expect(result.getByText('Scale')).toBeInTheDocument()
  })

  it('should render profile image section', () => {
    const result = render(<FounderStoryPage />)

    expect(result.getByText('Training Boot Camp Instructors in San Diego, CA')).toBeInTheDocument()
    const image = result.container.querySelector('img')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', '/Justin Profile Section 5.png')
  })

  it('should render narrative section', () => {
    const result = render(<FounderStoryPage />)

    expect(result.getByText(/I grew up in the coastal community of/)).toBeInTheDocument()
    expect(result.getByText(/Santa Cruz, California/)).toBeInTheDocument()
  })

  it('should render chapters section header', () => {
    const result = render(<FounderStoryPage />)

    expect(result.getByText('Explore the chapters')).toBeInTheDocument()
    expect(result.getByText(/Each chapter tells a different part of the story/)).toBeInTheDocument()
  })

  it('should render CTA section', () => {
    const result = render(<FounderStoryPage />)

    expect(result.getByText('Want the system I wish I had back then?')).toBeInTheDocument()
    expect(
      result.getByText(/Generate your first workout and experience how real coaching/)
    ).toBeInTheDocument()
    expect(result.getByTestId('story-cta-section')).toBeInTheDocument()
  })

  it('should call getChaptersByOrder', () => {
    const getChaptersByOrderSpy = vi.spyOn(chaptersModule, 'getChaptersByOrder')
    render(<FounderStoryPage />)

    expect(getChaptersByOrderSpy).toHaveBeenCalled()
  })

  it('should render with correct metadata structure', () => {
    const result = render(<FounderStoryPage />)

    // Verify the page structure is correct
    const main = result.container.querySelector('main')
    expect(main).toBeInTheDocument()
    expect(main?.className).toBeDefined()
  })
})
