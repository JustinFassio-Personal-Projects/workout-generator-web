import { describe, it, expect } from 'vitest'
import { GET } from '@/app/feed.xml/route'
import { getAllPosts } from '@/features/blog/lib/getBlogPosts'

// Mock getBlogPosts
vi.mock('@/features/blog/lib/getBlogPosts', () => ({
  getAllPosts: vi.fn(),
}))

describe('feed.xml route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate valid RSS feed XML', async () => {
    const mockPosts = [
      {
        id: '1',
        slug: 'test-post',
        title: 'Test Post',
        excerpt: 'Test excerpt',
        content: 'Test content',
        date: '2025-01-15',
        author: 'Test Author',
        category: 'Test',
        tags: ['test'],
        image: '/test-image.jpg',
      },
    ]

    vi.mocked(getAllPosts).mockResolvedValue(mockPosts)

    const response = await GET()
    const text = await response.text()

    expect(response.headers.get('content-type')).toBe('application/rss+xml; charset=utf-8')
    expect(text).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(text).toContain('<rss version="2.0"')
    expect(text).toContain('<channel>')
    expect(text).toContain('<title>Workout Generator Blog</title>')
    expect(text).toContain('<item>')
    expect(text).toContain('<![CDATA[Test Post]]>')
    expect(text).toContain('<![CDATA[Test excerpt]]>')
  })

  it('should include post images in enclosure when available', async () => {
    const mockPosts = [
      {
        id: '1',
        slug: 'test-post',
        title: 'Test Post',
        excerpt: 'Test excerpt',
        content: 'Test content',
        date: '2025-01-15',
        author: 'Test Author',
        category: 'Test',
        tags: ['test'],
        image: '/test-image.jpg',
      },
    ]

    vi.mocked(getAllPosts).mockResolvedValue(mockPosts)

    const response = await GET()
    const text = await response.text()

    expect(text).toContain('<enclosure url=')
    expect(text).toContain('/test-image.jpg')
  })

  it('should use dateModified when available', async () => {
    const mockPosts = [
      {
        id: '1',
        slug: 'test-post',
        title: 'Test Post',
        excerpt: 'Test excerpt',
        content: 'Test content',
        date: '2025-01-15',
        dateModified: '2025-01-20',
        author: 'Test Author',
        category: 'Test',
        tags: ['test'],
      },
    ]

    vi.mocked(getAllPosts).mockResolvedValue(mockPosts)

    const response = await GET()
    const text = await response.text()

    // Should use dateModified (2025-01-20) in pubDate - check for formatted date
    expect(text).toContain('20 Jan 2025')
  })

  it('should set proper cache headers', async () => {
    const mockPosts: any[] = []
    vi.mocked(getAllPosts).mockResolvedValue(mockPosts)

    const response = await GET()

    expect(response.headers.get('cache-control')).toBe(
      'public, s-maxage=3600, stale-while-revalidate=86400'
    )
  })
})
