import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Drawer } from '@/components/ui/Drawer/Drawer'

describe('Drawer', () => {
  beforeEach(() => {
    // Reset body overflow
    document.body.style.overflow = ''
  })

  afterEach(() => {
    // Cleanup
    document.body.style.overflow = ''
    vi.clearAllMocks()
  })

  it('should not render when isOpen is false', () => {
    render(
      <Drawer isOpen={false} onClose={vi.fn()}>
        <div>Test Content</div>
      </Drawer>
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('should render when isOpen is true', () => {
    render(
      <Drawer isOpen={true} onClose={vi.fn()}>
        <div>Test Content</div>
      </Drawer>
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should render with title when provided', () => {
    render(
      <Drawer isOpen={true} onClose={vi.fn()} title="Test Title">
        <div>Test Content</div>
      </Drawer>
    )
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Close drawer')).toBeInTheDocument()
  })

  it('should not render title when not provided', () => {
    render(
      <Drawer isOpen={true} onClose={vi.fn()}>
        <div>Test Content</div>
      </Drawer>
    )
    expect(screen.queryByText('Test Title')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Close drawer')).not.toBeInTheDocument()
  })

  it('should call onClose when overlay is clicked', async () => {
    const handleClose = vi.fn()
    const user = userEvent.setup()

    render(
      <Drawer isOpen={true} onClose={handleClose}>
        <div>Test Content</div>
      </Drawer>
    )

    const overlay = screen.getByTestId('drawer-overlay')
    await user.click(overlay)

    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('should call onClose when close button is clicked', async () => {
    const handleClose = vi.fn()
    const user = userEvent.setup()

    render(
      <Drawer isOpen={true} onClose={handleClose} title="Test Title">
        <div>Test Content</div>
      </Drawer>
    )

    const closeButton = screen.getByLabelText('Close drawer')
    await user.click(closeButton)

    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('should call onClose when Escape key is pressed', async () => {
    const handleClose = vi.fn()
    const user = userEvent.setup()

    render(
      <Drawer isOpen={true} onClose={handleClose}>
        <div>Test Content</div>
      </Drawer>
    )

    await user.keyboard('{Escape}')

    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('should prevent body scroll when open', () => {
    render(
      <Drawer isOpen={true} onClose={vi.fn()}>
        <div>Test Content</div>
      </Drawer>
    )
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('should restore body scroll when closed', () => {
    const { rerender } = render(
      <Drawer isOpen={true} onClose={vi.fn()}>
        <div>Test Content</div>
      </Drawer>
    )
    expect(document.body.style.overflow).toBe('hidden')

    rerender(
      <Drawer isOpen={false} onClose={vi.fn()}>
        <div>Test Content</div>
      </Drawer>
    )
    // After cleanup, overflow should be restored
    expect(document.body.style.overflow).toBe('')
  })

  it('should focus drawer when opened', () => {
    render(
      <Drawer isOpen={true} onClose={vi.fn()}>
        <div>Test Content</div>
      </Drawer>
    )
    const drawer = screen.getByRole('dialog')
    expect(drawer).toHaveFocus()
  })

  it('should have correct ARIA attributes', () => {
    render(
      <Drawer isOpen={true} onClose={vi.fn()} title="Test Title">
        <div>Test Content</div>
      </Drawer>
    )
    const drawer = screen.getByRole('dialog')
    expect(drawer).toHaveAttribute('aria-modal', 'true')
    expect(drawer).toHaveAttribute('aria-labelledby', 'drawer-title')
  })

  it('should not have aria-labelledby when title is not provided', () => {
    render(
      <Drawer isOpen={true} onClose={vi.fn()}>
        <div>Test Content</div>
      </Drawer>
    )
    const drawer = screen.getByRole('dialog')
    expect(drawer).not.toHaveAttribute('aria-labelledby')
  })
})
