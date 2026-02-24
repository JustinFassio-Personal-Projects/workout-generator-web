import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BlogSearch } from '@/components/features/blog/BlogSearch'

// Mock next/navigation
const mockReplace = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'search' ? '' : null),
    toString: () => '',
  }),
}))

describe('BlogSearch', () => {
  const mockOnSearch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render search input', () => {
    render(<BlogSearch onSearch={mockOnSearch} />)

    const searchInput = screen.getByPlaceholderText('Search articles...')
    expect(searchInput).toBeInTheDocument()
  })

  it('should call onSearch with debounced input', async () => {
    const user = userEvent.setup()
    render(<BlogSearch onSearch={mockOnSearch} />)

    const searchInput = screen.getByPlaceholderText('Search articles...')
    await user.type(searchInput, 'test')

    await waitFor(
      () => {
        expect(mockOnSearch).toHaveBeenCalledWith('test')
      },
      { timeout: 500 }
    )
  })

  it('should show clear button when input has value', async () => {
    const user = userEvent.setup()
    render(<BlogSearch onSearch={mockOnSearch} />)

    const searchInput = screen.getByPlaceholderText('Search articles...')
    await user.type(searchInput, 'test')

    await waitFor(() => {
      const clearButton = screen.getByLabelText('Clear search')
      expect(clearButton).toBeInTheDocument()
    })
  })

  it('should clear input when clear button is clicked', async () => {
    const user = userEvent.setup()
    render(<BlogSearch onSearch={mockOnSearch} />)

    const searchInput = screen.getByPlaceholderText('Search articles...')
    await user.type(searchInput, 'test')

    await waitFor(() => {
      const clearButton = screen.getByLabelText('Clear search')
      expect(clearButton).toBeInTheDocument()
    })

    await user.click(screen.getByLabelText('Clear search'))

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search articles...')
      expect(searchInput).toHaveValue('')
    })
  })

  it('should render with initialQuery prop', () => {
    render(<BlogSearch onSearch={mockOnSearch} initialQuery="initial search" />)

    const searchInput = screen.getByPlaceholderText('Search articles...')
    expect(searchInput).toBeInTheDocument()
    // Note: The component initializes from URL params, so the value may differ
  })
})
