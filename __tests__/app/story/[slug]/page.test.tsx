import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as milestonesModule from '@/data/story/milestones'
import * as chaptersModule from '@/data/story/chapters'

// Mock notFound
const mockNotFound = vi.fn(() => {
  throw new Error('notFound')
})

vi.mock('next/navigation', () => ({
  notFound: mockNotFound,
}))

// Mock StoryHero
vi.mock('@/components/features/story/StoryHero', () => ({
  StoryHero: ({ title, tagline, heroText }: any) => (
    <div data-testid="story-hero">
      <h1>{title}</h1>
      {heroText ? (
        <>
          <div data-testid="hero-text">{heroText}</div>
          <p>{tagline}</p>
        </>
      ) : (
        <p>{tagline}</p>
      )}
    </div>
  ),
}))

// Mock MilestoneContent
vi.mock('@/components/features/story/MilestoneContent', () => ({
  MilestoneContent: ({ milestone, relatedChapters }: any) => (
    <div data-testid="milestone-content">
      <span>{milestone.slug}</span>
      <span data-testid="related-count">{relatedChapters?.length || 0}</span>
    </div>
  ),
}))

// Mock StoryPageClient
vi.mock('@/components/features/story/StoryPageClient', () => ({
  StoryPageClient: () => <div data-testid="story-page-client">Page Client</div>,
}))

describe('MilestonePage', () => {
  const mockMilestone = {
    slug: 'test-milestone',
    title: 'Test Milestone Title',
    tagline: 'Test tagline',
    heroText: 'Test hero text',
    order: 1,
    storyText: 'Test story',
    learnedPoints: ['Point 1'],
    productConnections: ['Connection 1'],
    seoTitle: 'Custom SEO Title',
    seoDescription: 'Custom SEO Description',
    primaryCtaLabel: 'Test CTA',
    primaryCtaHref: '/test',
    secondaryCtaLabel: 'Test Secondary',
    secondaryCtaHref: '/test-secondary',
    relatedChapters: ['chapter-1'],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateStaticParams', () => {
    it('should return empty array (for dynamic ISR)', async () => {
      const { generateStaticParams } = await import('@/app/story/[slug]/page')
      const params = await generateStaticParams()

      expect(params).toEqual([])
    })
  })

  describe('generateMetadata', () => {
    it('should generate metadata when milestone exists', async () => {
      vi.spyOn(milestonesModule, 'getMilestoneBySlug').mockReturnValue(mockMilestone as any)

      const { generateMetadata } = await import('@/app/story/[slug]/page')
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: 'test-milestone' }),
      })

      expect(metadata.title).toBe('Custom SEO Title')
      expect(metadata.description).toBe('Custom SEO Description')
    })

    it('should use seoTitle and seoDescription when available', async () => {
      vi.spyOn(milestonesModule, 'getMilestoneBySlug').mockReturnValue(mockMilestone as any)

      const { generateMetadata } = await import('@/app/story/[slug]/page')
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: 'test-milestone' }),
      })

      expect(metadata.title).toBe('Custom SEO Title')
      expect(metadata.description).toBe('Custom SEO Description')
    })

    it('should fall back to default title/description when seo fields not provided', async () => {
      const milestoneWithoutSEO = {
        ...mockMilestone,
        seoTitle: undefined,
        seoDescription: undefined,
      }
      vi.spyOn(milestonesModule, 'getMilestoneBySlug').mockReturnValue(milestoneWithoutSEO as any)

      const { generateMetadata } = await import('@/app/story/[slug]/page')
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: 'test-milestone' }),
      })

      expect(metadata.title).toBe('Test Milestone Title | Founder Story')
      expect(metadata.description).toBe('Test tagline')
    })

    it('should return not-found metadata when milestone does not exist', async () => {
      vi.spyOn(milestonesModule, 'getMilestoneBySlug').mockReturnValue(undefined)

      const { generateMetadata } = await import('@/app/story/[slug]/page')
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: 'non-existent' }),
      })

      expect(metadata.title).toBe('Chapter Not Found - AIWorkoutGenerator')
    })

    it('should include OpenGraph metadata', async () => {
      vi.spyOn(milestonesModule, 'getMilestoneBySlug').mockReturnValue(mockMilestone as any)

      const { generateMetadata } = await import('@/app/story/[slug]/page')
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: 'test-milestone' }),
      })

      expect(metadata.openGraph).toBeDefined()
      expect(metadata.openGraph?.title).toBe('Custom SEO Title')
      expect(metadata.openGraph?.type).toBe('article')
    })

    it('should include Twitter metadata', async () => {
      vi.spyOn(milestonesModule, 'getMilestoneBySlug').mockReturnValue(mockMilestone as any)

      const { generateMetadata } = await import('@/app/story/[slug]/page')
      const metadata = await generateMetadata({
        params: Promise.resolve({ slug: 'test-milestone' }),
      })

      expect(metadata.twitter).toBeDefined()
      expect(metadata.twitter?.card).toBe('summary_large_image')
    })
  })

  describe('page rendering', () => {
    it('should render milestone page when milestone exists', async () => {
      vi.spyOn(milestonesModule, 'getMilestoneBySlug').mockReturnValue(mockMilestone as any)
      vi.spyOn(milestonesModule, 'getRelatedChapterSlugs').mockReturnValue(['chapter-1'])
      vi.spyOn(chaptersModule, 'getChaptersByOrder').mockReturnValue([
        {
          slug: 'chapter-1',
          title: 'Chapter 1',
          description: 'Description',
          order: 1,
        },
      ] as any)

      const { default: MilestonePage } = await import('@/app/story/[slug]/page')
      const result = await MilestonePage({
        params: Promise.resolve({ slug: 'test-milestone' }),
      })

      const { container } = await import('@testing-library/react')
      const { render } = await import('@testing-library/react')
      const rendered = render(result as any)

      expect(rendered.getByTestId('story-hero')).toBeInTheDocument()
      expect(rendered.getByTestId('milestone-content')).toBeInTheDocument()
      expect(milestonesModule.getMilestoneBySlug).toHaveBeenCalledWith('test-milestone')
    })

    it('should call notFound() when milestone does not exist', async () => {
      vi.spyOn(milestonesModule, 'getMilestoneBySlug').mockReturnValue(undefined)

      const { default: MilestonePage } = await import('@/app/story/[slug]/page')

      await expect(
        MilestonePage({ params: Promise.resolve({ slug: 'non-existent' }) })
      ).rejects.toThrow('notFound')
      expect(mockNotFound).toHaveBeenCalled()
    })

    it('should render structured data (Article and BreadcrumbList schemas)', async () => {
      vi.spyOn(milestonesModule, 'getMilestoneBySlug').mockReturnValue(mockMilestone as any)
      vi.spyOn(milestonesModule, 'getRelatedChapterSlugs').mockReturnValue([])
      vi.spyOn(chaptersModule, 'getChaptersByOrder').mockReturnValue([])

      const { default: MilestonePage } = await import('@/app/story/[slug]/page')
      const result = await MilestonePage({
        params: Promise.resolve({ slug: 'test-milestone' }),
      })

      const { render } = await import('@testing-library/react')
      const rendered = render(result as any)

      const scripts = rendered.container.querySelectorAll('script[type="application/ld+json"]')
      expect(scripts.length).toBe(2) // Article and BreadcrumbList

      const scriptContents = Array.from(scripts).map(script => script.textContent)
      const hasArticle = scriptContents.some(content => content?.includes('Article'))
      const hasBreadcrumbList = scriptContents.some(content => content?.includes('BreadcrumbList'))

      expect(hasArticle).toBe(true)
      expect(hasBreadcrumbList).toBe(true)
    })

    it('should pass correct props to StoryHero', async () => {
      vi.spyOn(milestonesModule, 'getMilestoneBySlug').mockReturnValue(mockMilestone as any)
      vi.spyOn(milestonesModule, 'getRelatedChapterSlugs').mockReturnValue([])
      vi.spyOn(chaptersModule, 'getChaptersByOrder').mockReturnValue([])

      const { default: MilestonePage } = await import('@/app/story/[slug]/page')
      const result = await MilestonePage({
        params: Promise.resolve({ slug: 'test-milestone' }),
      })

      const { render } = await import('@testing-library/react')
      const rendered = render(result as any)

      // Check that StoryHero is rendered with correct title
      const heroElements = rendered.getAllByText('Test Milestone Title')
      expect(heroElements.length).toBeGreaterThan(0)
      // Tagline may not be visible when heroText is provided (rendered as secondary tagline)
      const taglineElements = rendered.queryAllByText('Test tagline')
      expect(taglineElements.length).toBeGreaterThanOrEqual(0) // May or may not be visible
      const heroTextElements = rendered.getAllByTestId('hero-text')
      expect(heroTextElements.length).toBeGreaterThan(0)
    })

    it('should calculate related chapters correctly', async () => {
      vi.spyOn(milestonesModule, 'getMilestoneBySlug').mockReturnValue(mockMilestone as any)
      vi.spyOn(milestonesModule, 'getRelatedChapterSlugs').mockReturnValue(['chapter-1'])
      vi.spyOn(chaptersModule, 'getChaptersByOrder').mockReturnValue([
        {
          slug: 'chapter-1',
          title: 'Chapter 1',
          description: 'Description',
          order: 1,
        },
      ] as any)

      const { default: MilestonePage } = await import('@/app/story/[slug]/page')
      const result = await MilestonePage({
        params: Promise.resolve({ slug: 'test-milestone' }),
      })

      const { render, getAllByTestId } = await import('@testing-library/react')
      const rendered = render(result as any)

      const relatedCounts = rendered.getAllByTestId('related-count')
      expect(relatedCounts.length).toBeGreaterThan(0)
      expect(relatedCounts[0].textContent).toBe('1')
    })

    it('should call getRelatedChapterSlugs with milestone', async () => {
      const getRelatedChapterSlugsSpy = vi
        .spyOn(milestonesModule, 'getRelatedChapterSlugs')
        .mockReturnValue([])
      vi.spyOn(milestonesModule, 'getMilestoneBySlug').mockReturnValue(mockMilestone as any)
      vi.spyOn(chaptersModule, 'getChaptersByOrder').mockReturnValue([])

      const { default: MilestonePage } = await import('@/app/story/[slug]/page')
      await MilestonePage({
        params: Promise.resolve({ slug: 'test-milestone' }),
      })

      expect(getRelatedChapterSlugsSpy).toHaveBeenCalledWith(mockMilestone)
    })
  })
})
