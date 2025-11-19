import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import BlogLayout from '@/app/blog/layout'

describe('BlogLayout', () => {
  it('should render blog layout with children', () => {
    const { container } = render(
      <BlogLayout>
        <div>Blog Content</div>
      </BlogLayout>
    )

    const layout = container.querySelector('.blog-layout')
    expect(layout).toBeInTheDocument()
    expect(layout?.className).toContain('min-h-screen')
  })

  it('should render children inside layout', () => {
    const { getByText } = render(
      <BlogLayout>
        <div>Blog Content</div>
      </BlogLayout>
    )

    expect(getByText('Blog Content')).toBeInTheDocument()
  })
})

