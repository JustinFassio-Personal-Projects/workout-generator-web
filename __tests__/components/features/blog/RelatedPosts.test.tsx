import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RelatedPosts } from '@/components/features/blog/RelatedPosts'
import { BlogPost } from '@/features/blog/types'

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

const mockPosts: BlogPost[] = [
  {
    id: '1',
    slug: 'post-1',
    title: 'Test Post 1',
    excerpt: 'Test excerpt 1',
    content: 'Test content 1',
    date: '2025-01-15',
    author: 'Test Author',
    category: 'Test',
    tags: ['test'],
    image: '/test-image-1.jpg',
  },
  {
    id: '2',
    slug: 'post-2',
    title: 'Test Post 2',
    excerpt: 'Test excerpt 2',
    content: 'Test content 2',
    date: '2025-01-14',
    author: 'Test Author',
    category: 'Test',
    tags: ['test'],
  },
]

describe('RelatedPosts', () => {
  it('should not render when posts array is empty', () => {
    const { container } = render(<RelatedPosts posts={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('should render related posts section', () => {
    render(<RelatedPosts posts={mockPosts} />)

    expect(screen.getByText('Related Articles')).toBeInTheDocument()
  })

  it('should render all provided posts', () => {
    render(<RelatedPosts posts={mockPosts} />)

    expect(screen.getByText('Test Post 1')).toBeInTheDocument()
    expect(screen.getByText('Test Post 2')).toBeInTheDocument()
  })

  it('should render post images when available', () => {
    render(<RelatedPosts posts={mockPosts} />)

    const image = screen.getByAltText('Test Post 1')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', '/test-image-1.jpg')
  })

  it('should use default image when post image is not provided', () => {
    render(<RelatedPosts posts={[mockPosts[1]]} />)

    const image = screen.getByAltText('Test Post 2')
    expect(image).toHaveAttribute('src', '/og-image.jpg')
  })

  it('should render post categories', () => {
    render(<RelatedPosts posts={mockPosts} />)

    const categories = screen.getAllByText('Test')
    expect(categories.length).toBeGreaterThan(0)
  })

  it('should render post links', () => {
    render(<RelatedPosts posts={mockPosts} />)

    const link1 = screen.getByText('Test Post 1').closest('a')
    expect(link1).toHaveAttribute('href', '/blog/post-1')

    const link2 = screen.getByText('Test Post 2').closest('a')
    expect(link2).toHaveAttribute('href', '/blog/post-2')
  })
})
