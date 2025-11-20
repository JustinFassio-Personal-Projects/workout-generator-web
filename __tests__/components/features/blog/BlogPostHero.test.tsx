import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BlogPostHero } from '@/components/features/blog/BlogPostHero'
import { BlogPost } from '@/features/blog/types'

const mockPost: BlogPost = {
  id: '1',
  slug: 'test-post',
  title: 'Test Blog Post Title',
  excerpt: 'This is a test excerpt for the blog post',
  content: 'Full content of the blog post',
  date: '2025-01-15',
  author: 'John Doe',
  category: 'Fitness',
  tags: ['workout', 'fitness', 'health'],
}

const mockPostWithoutExcerpt: BlogPost = {
  ...mockPost,
  excerpt: '',
}

const mockPostWithoutTags: BlogPost = {
  ...mockPost,
  tags: [],
}

describe('BlogPostHero', () => {
  it('should render blog post title', () => {
    render(<BlogPostHero post={mockPost} />)
    expect(screen.getByText('Test Blog Post Title')).toBeInTheDocument()
  })

  it('should render category badge', () => {
    render(<BlogPostHero post={mockPost} />)
    expect(screen.getByText('Fitness')).toBeInTheDocument()
  })

  it('should render excerpt when provided', () => {
    render(<BlogPostHero post={mockPost} />)
    expect(screen.getByText('This is a test excerpt for the blog post')).toBeInTheDocument()
  })

  it('should not render excerpt when not provided', () => {
    render(<BlogPostHero post={mockPostWithoutExcerpt} />)
    expect(screen.queryByText('This is a test excerpt for the blog post')).not.toBeInTheDocument()
  })

  it('should render formatted date', () => {
    render(<BlogPostHero post={mockPost} />)
    // formatDate formats as "January 15, 2025"
    expect(screen.getByText(/January 15, 2025/i)).toBeInTheDocument()
  })

  it('should render author name', () => {
    render(<BlogPostHero post={mockPost} />)
    expect(screen.getByText(/By John Doe/i)).toBeInTheDocument()
  })

  it('should render tags when provided', () => {
    render(<BlogPostHero post={mockPost} />)
    expect(screen.getByText('#workout')).toBeInTheDocument()
    expect(screen.getByText('#fitness')).toBeInTheDocument()
    expect(screen.getByText('#health')).toBeInTheDocument()
  })

  it('should not render tags section when tags array is empty', () => {
    render(<BlogPostHero post={mockPostWithoutTags} />)
    expect(screen.queryByText('#workout')).not.toBeInTheDocument()
  })

  it('should have correct dateTime attribute', () => {
    render(<BlogPostHero post={mockPost} />)
    const timeElement = screen.getByText(/January 15, 2025/i)
    expect(timeElement).toHaveAttribute('dateTime', '2025-01-15T00:00:00.000Z')
  })

  it('should have correct data-aos attribute', () => {
    render(<BlogPostHero post={mockPost} />)
    const heroText = screen.getByText('Test Blog Post Title').closest('[data-aos="fade-up"]')
    expect(heroText).toBeInTheDocument()
  })

  it('should render separator between date and author', () => {
    render(<BlogPostHero post={mockPost} />)
    const separator = screen.getByText('•')
    expect(separator).toBeInTheDocument()
    expect(separator).toHaveAttribute('aria-hidden', 'true')
  })
})
