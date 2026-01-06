import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Chip } from '@/components/ui/Chip/Chip'

describe('Chip', () => {
  it('should render chip with children', () => {
    render(<Chip>Test Chip</Chip>)
    expect(screen.getByText('Test Chip')).toBeInTheDocument()
  })

  it('should apply selected class when selected', () => {
    render(<Chip selected>Selected Chip</Chip>)
    const chip = screen.getByText('Selected Chip')
    expect(chip).toHaveAttribute('aria-pressed', 'true')
  })

  it('should not have selected class when not selected', () => {
    render(<Chip>Unselected Chip</Chip>)
    const chip = screen.getByText('Unselected Chip')
    expect(chip).toHaveAttribute('aria-pressed', 'false')
  })

  it('should call onClick when clicked', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()
    render(<Chip onClick={handleClick}>Clickable Chip</Chip>)

    await user.click(screen.getByText('Clickable Chip'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should pass through additional props', () => {
    render(
      <Chip data-testid="custom-chip" disabled>
        Disabled Chip
      </Chip>
    )
    const chip = screen.getByTestId('custom-chip')
    expect(chip).toBeDisabled()
  })

  it('should apply custom className', () => {
    render(<Chip className="custom-class">Custom Chip</Chip>)
    const chip = screen.getByText('Custom Chip')
    expect(chip).toHaveClass('custom-class')
  })
})
