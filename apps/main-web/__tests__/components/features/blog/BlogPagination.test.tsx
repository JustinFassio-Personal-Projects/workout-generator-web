import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BlogPagination } from '@/components/features/blog/BlogPagination'

describe('BlogPagination', () => {
  const mockOnPageChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when totalPages is 1', () => {
    const { container } = render(
      <BlogPagination currentPage={1} totalPages={1} onPageChange={mockOnPageChange} />
    )

    expect(container.firstChild).toBeNull()
  })

  it('should render pagination controls', () => {
    render(<BlogPagination currentPage={1} totalPages={5} onPageChange={mockOnPageChange} />)

    expect(screen.getByLabelText('Previous page')).toBeInTheDocument()
    expect(screen.getByLabelText('Next page')).toBeInTheDocument()
    expect(screen.getByLabelText('Page 1')).toBeInTheDocument()
  })

  it('should disable previous button on first page', () => {
    render(<BlogPagination currentPage={1} totalPages={5} onPageChange={mockOnPageChange} />)

    const prevButton = screen.getByLabelText('Previous page')
    expect(prevButton).toBeDisabled()
  })

  it('should disable next button on last page', () => {
    render(<BlogPagination currentPage={5} totalPages={5} onPageChange={mockOnPageChange} />)

    const nextButton = screen.getByLabelText('Next page')
    expect(nextButton).toBeDisabled()
  })

  it('should call onPageChange when next button is clicked', async () => {
    const user = userEvent.setup()
    render(<BlogPagination currentPage={1} totalPages={5} onPageChange={mockOnPageChange} />)

    const nextButton = screen.getByLabelText('Next page')
    await user.click(nextButton)

    expect(mockOnPageChange).toHaveBeenCalledWith(2)
  })

  it('should call onPageChange when previous button is clicked', async () => {
    const user = userEvent.setup()
    render(<BlogPagination currentPage={2} totalPages={5} onPageChange={mockOnPageChange} />)

    const prevButton = screen.getByLabelText('Previous page')
    await user.click(prevButton)

    expect(mockOnPageChange).toHaveBeenCalledWith(1)
  })

  it('should call onPageChange when page number is clicked', async () => {
    const user = userEvent.setup()
    render(<BlogPagination currentPage={1} totalPages={5} onPageChange={mockOnPageChange} />)

    const page3Button = screen.getByLabelText('Page 3')
    await user.click(page3Button)

    expect(mockOnPageChange).toHaveBeenCalledWith(3)
  })

  it('should highlight current page', () => {
    render(<BlogPagination currentPage={3} totalPages={5} onPageChange={mockOnPageChange} />)

    const currentPageButton = screen.getByLabelText('Page 3')
    expect(currentPageButton).toHaveClass(/active/)
  })

  it('should show ellipsis for large page counts', () => {
    render(<BlogPagination currentPage={5} totalPages={10} onPageChange={mockOnPageChange} />)

    // Should show first page, ellipsis, pages around current, ellipsis, last page
    expect(screen.getByLabelText('Page 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Page 10')).toBeInTheDocument()
  })
})
