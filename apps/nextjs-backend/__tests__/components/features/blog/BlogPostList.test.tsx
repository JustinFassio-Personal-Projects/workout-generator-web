import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BlogPostList } from '@/components/features/blog/BlogPostList'
import { BlogPost } from '@/features/blog/types'

const mockPost: BlogPost = {
  id: '1',
  slug: 'test-post',
  title: 'Test Post',
  excerpt: 'Test excerpt',
  content: 'Test content',
  date: '2025-01-15',
  author: 'Test Author',
  category: 'Test',
  tags: ['test'],
}

describe('BlogPostList', () => {
  it('should render blog posts', () => {
    render(<BlogPostList posts={[mockPost]} />)
    expect(screen.getByText('Test Post')).toBeInTheDocument()
    expect(screen.getByText('Test excerpt')).toBeInTheDocument()
  })

  it('should render multiple posts', () => {
    const posts: BlogPost[] = [
      mockPost,
      {
        ...mockPost,
        id: '2',
        slug: 'test-post-2',
        title: 'Test Post 2',
      },
    ]

    render(<BlogPostList posts={posts} />)
    expect(screen.getByText('Test Post')).toBeInTheDocument()
    expect(screen.getByText('Test Post 2')).toBeInTheDocument()
  })

  it('should display empty state when no posts', () => {
    render(<BlogPostList posts={[]} />)
    expect(screen.getByText(/No blog posts found/i)).toBeInTheDocument()
  })
})
