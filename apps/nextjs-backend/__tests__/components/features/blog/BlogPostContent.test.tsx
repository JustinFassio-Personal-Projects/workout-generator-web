import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BlogPostContent } from '@/components/features/blog/BlogPostContent'
import { BlogPost } from '@/features/blog/types'

const mockPost: BlogPost = {
  id: '1',
  slug: 'test-post',
  title: 'Test Post Title',
  excerpt: 'Test excerpt',
  content: '# Test Content\n\nThis is test content.',
  date: '2025-01-15',
  author: 'Test Author',
  category: 'Test Category',
  tags: ['test', 'example'],
}

describe('BlogPostContent', () => {
  it('should render markdown content', () => {
    render(<BlogPostContent post={mockPost} />)

    // ReactMarkdown renders the content, so we check for the markdown content
    expect(screen.getByText('Test Content')).toBeInTheDocument()
    expect(screen.getByText('This is test content.')).toBeInTheDocument()
  })

  it('should render article element with correct structure', () => {
    render(<BlogPostContent post={mockPost} />)

    const article = document.querySelector('article')
    expect(article).toBeInTheDocument()
    expect(article?.tagName).toBe('ARTICLE')
  })

  it('should render markdown headings correctly', () => {
    const postWithHeadings: BlogPost = {
      ...mockPost,
      content: '# Heading 1\n## Heading 2\n### Heading 3',
    }

    render(<BlogPostContent post={postWithHeadings} />)

    // Headings are shifted down by one level (h1 -> h2, h2 -> h3, etc.)
    expect(screen.getByRole('heading', { level: 2, name: 'Heading 1' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Heading 2' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'Heading 3' })).toBeInTheDocument()
  })

  it('should render paragraphs correctly', () => {
    const postWithParagraphs: BlogPost = {
      ...mockPost,
      content: 'First paragraph.\n\nSecond paragraph.',
    }

    render(<BlogPostContent post={postWithParagraphs} />)

    expect(screen.getByText('First paragraph.')).toBeInTheDocument()
    expect(screen.getByText('Second paragraph.')).toBeInTheDocument()
  })

  it('should handle empty content', () => {
    const postWithEmptyContent: BlogPost = {
      ...mockPost,
      content: '',
    }

    render(<BlogPostContent post={postWithEmptyContent} />)

    const article = document.querySelector('article')
    expect(article).toBeInTheDocument()
  })

  it('should render all heading levels correctly', () => {
    const postWithAllHeadings: BlogPost = {
      ...mockPost,
      content: '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6',
    }

    render(<BlogPostContent post={postWithAllHeadings} />)

    // All headings are shifted down by one level
    expect(screen.getByRole('heading', { level: 2, name: 'H1' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'H2' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'H3' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 5, name: 'H4' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 6, name: 'H5' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 6, name: 'H6' })).toBeInTheDocument()
  })
})
