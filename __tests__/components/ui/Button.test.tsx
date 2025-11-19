import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/Button/Button'
import { ArrowRight } from 'lucide-react'

describe('Button', () => {
  it('should render button with children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('should handle click events', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick}>Click me</Button>)

    const button = screen.getByRole('button', { name: 'Click me' })
    await user.click(button)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('should be disabled when loading prop is true', () => {
    render(<Button loading>Loading Button</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('should render icon on the left', () => {
    render(
      <Button icon={ArrowRight} iconPosition="left">
        With Icon
      </Button>
    )
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    // Icon should be rendered (checking for SVG element)
    expect(button.querySelector('svg')).toBeInTheDocument()
  })

  it('should render icon on the right', () => {
    render(
      <Button icon={ArrowRight} iconPosition="right">
        With Icon
      </Button>
    )
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(button.querySelector('svg')).toBeInTheDocument()
  })

  it('should apply variant classes', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>)
    let button = screen.getByRole('button')
    expect(button.className).toContain('button--primary')

    rerender(<Button variant="secondary">Secondary</Button>)
    button = screen.getByRole('button')
    expect(button.className).toContain('button--secondary')
  })

  it('should apply size classes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    let button = screen.getByRole('button')
    expect(button.className).toContain('button--sm')

    rerender(<Button size="lg">Large</Button>)
    button = screen.getByRole('button')
    expect(button.className).toContain('button--lg')
  })
})
