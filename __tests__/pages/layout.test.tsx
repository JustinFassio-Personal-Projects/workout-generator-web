import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import RootLayout from '@/app/layout'

// Mock Next.js font loader
vi.mock('next/font/google', () => ({
  Inter: vi.fn(() => ({
    className: 'inter-font',
  })),
}))

describe('RootLayout', () => {
  it('should render root layout with children', () => {
    const { container } = render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    )

    expect(container.querySelector('html')).toBeInTheDocument()
    expect(container.querySelector('body')).toBeInTheDocument()
    expect(container.querySelector('html')?.getAttribute('lang')).toBe('en')
  })

  it('should render children inside body', () => {
    const { getByText } = render(
      <RootLayout>
        <div>Test Content</div>
      </RootLayout>
    )

    expect(getByText('Test Content')).toBeInTheDocument()
  })
})

