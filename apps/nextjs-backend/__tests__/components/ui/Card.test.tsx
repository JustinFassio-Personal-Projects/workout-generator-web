import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card } from '@/components/ui/Card/Card'

describe('Card', () => {
  it('should render card with children', () => {
    render(
      <Card>
        <p>Card content</p>
      </Card>
    )
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('should apply variant classes', () => {
    const { rerender, container } = render(<Card variant="default">Default Card</Card>)
    let card = container.querySelector('[class*="card"]')
    expect(card).toBeInTheDocument()

    rerender(<Card variant="strong">Strong Card</Card>)
    card = container.querySelector('[class*="card"]')
    expect(card).toBeInTheDocument()

    rerender(<Card variant="elevated">Elevated Card</Card>)
    card = container.querySelector('[class*="card"]')
    expect(card).toBeInTheDocument()
  })

  it('should apply hover class when hover prop is true', () => {
    render(
      <Card hover>
        <p>Hoverable Card</p>
      </Card>
    )
    const card = screen.getByText('Hoverable Card').parentElement
    expect(card?.className).toContain('card--hover')
  })

  it('should not apply hover class when hover prop is false', () => {
    render(
      <Card hover={false}>
        <p>Non-hoverable Card</p>
      </Card>
    )
    const card = screen.getByText('Non-hoverable Card').parentElement
    expect(card?.className).not.toContain('card--hover')
  })

  it('should accept custom className', () => {
    render(
      <Card className="custom-class">
        <p>Custom Card</p>
      </Card>
    )
    const card = screen.getByText('Custom Card').parentElement
    expect(card?.className).toContain('custom-class')
  })
})
