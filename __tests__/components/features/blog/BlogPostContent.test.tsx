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
  it('should render blog post content', () => {
    render(<BlogPostContent post={mockPost} />)

    expect(screen.getByText('Test Post Title')).toBeInTheDocument()
    expect(screen.getByText('Test Category')).toBeInTheDocument()
    expect(screen.getByText(/Test Author/i)).toBeInTheDocument()
  })

  it('should render formatted date', () => {
    render(<BlogPostContent post={mockPost} />)

    expect(screen.getByText(/January 15, 2025/i)).toBeInTheDocument()
  })

  it('should render tags when present', () => {
    render(<BlogPostContent post={mockPost} />)

    expect(screen.getByText('#test')).toBeInTheDocument()
    expect(screen.getByText('#example')).toBeInTheDocument()
  })

  it('should render post without tags', () => {
    const postWithoutTags: BlogPost = {
      ...mockPost,
      tags: [],
    }

    render(<BlogPostContent post={postWithoutTags} />)

    expect(screen.getByText('Test Post Title')).toBeInTheDocument()
    expect(screen.queryByText('#test')).not.toBeInTheDocument()
  })

  it('should render markdown content', () => {
    render(<BlogPostContent post={mockPost} />)

    // ReactMarkdown renders the content, so we check for the article element
    const article = document.querySelector('article')
    expect(article).toBeInTheDocument()
    expect(article?.className).toContain('max-w-4xl')
  })
})

