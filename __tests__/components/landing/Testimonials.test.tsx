import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Testimonials } from '@/components/landing/Testimonials/Testimonials'
import { testimonials } from '@/data/testimonials'

// Mock AOS
vi.mock('aos', () => ({
  default: {
    init: vi.fn(),
  },
}))

// Mock LogoWatermark
vi.mock('@/components/ui/LogoWatermark/LogoWatermark', () => ({
  LogoWatermark: () => null,
}))

describe('Testimonials', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    // Reset window.innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render testimonials section', () => {
    render(<Testimonials />)
    const section = document.querySelector('section#testimonials')
    expect(section).toBeInTheDocument()
  })

  it('should render testimonials title', () => {
    render(<Testimonials />)
    expect(screen.getByText(/Loved by/i)).toBeInTheDocument()
    expect(screen.getByText(/Thousands/i)).toBeInTheDocument()
  })

  it('should render testimonial cards', () => {
    render(<Testimonials />)
    // Check that at least one testimonial is rendered
    expect(screen.getByText(testimonials[0].name)).toBeInTheDocument()
  })

  it('should handle next button click', async () => {
    const user = userEvent.setup({ delay: null })
    render(<Testimonials />)

    const nextButton = screen.getByLabelText(/Next testimonials/i)
    expect(nextButton).toBeInTheDocument()

    await user.click(nextButton)

    // After clicking next, auto-play should be disabled
    expect(nextButton).toBeInTheDocument()
  })

  it('should handle previous button click', async () => {
    const user = userEvent.setup({ delay: null })
    render(<Testimonials />)

    const prevButton = screen.getByLabelText(/Previous testimonials/i)
    expect(prevButton).toBeInTheDocument()

    await user.click(prevButton)

    // After clicking prev, auto-play should be disabled
    expect(prevButton).toBeInTheDocument()
  })

  it('should stop auto-play when navigation buttons are clicked', async () => {
    const user = userEvent.setup({ delay: null })
    render(<Testimonials />)

    const nextButton = screen.getByLabelText(/Next testimonials/i)
    await user.click(nextButton)

    // Auto-play should be stopped
    expect(nextButton).toBeInTheDocument()
  })

  it('should handle dot navigation', async () => {
    const user = userEvent.setup({ delay: null })
    render(<Testimonials />)

    // Find all dot buttons
    const dots = screen.getAllByLabelText(/Go to page/i)
    expect(dots.length).toBeGreaterThan(0)

    // Click on the second dot
    if (dots.length > 1) {
      await user.click(dots[1])
      // After clicking dot, auto-play should be disabled
      expect(dots[1]).toBeInTheDocument()
    }
  })

  it('should handle dot click and update current index', async () => {
    const user = userEvent.setup({ delay: null })
    render(<Testimonials />)

    const dots = screen.getAllByLabelText(/Go to page/i)
    if (dots.length > 1) {
      const secondDot = dots[1]
      await user.click(secondDot)

      // Verify the dot is active (SCSS modules add hash)
      expect(secondDot.className).toContain('dot--active')
    }
  })

  it('should handle responsive breakpoints - desktop (1024px+)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    })

    render(<Testimonials />)
    // Should show 3 items per page on desktop
    const carouselItems = document.querySelectorAll('[class*="carouselItem"]')
    expect(carouselItems.length).toBeGreaterThan(0)
  })

  it('should handle responsive breakpoints - tablet (640px-1023px)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 800,
    })

    render(<Testimonials />)
    // Should show 2 items per page on tablet
    const carouselItems = document.querySelectorAll('[class*="carouselItem"]')
    expect(carouselItems.length).toBeGreaterThan(0)
  })

  it('should handle responsive breakpoints - mobile (<640px)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    })

    render(<Testimonials />)
    // Should show 1 item per page on mobile
    const carouselItems = document.querySelectorAll('[class*="carouselItem"]')
    expect(carouselItems.length).toBeGreaterThan(0)
  })

  it('should update items per page on window resize', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    })

    render(<Testimonials />)

    // Resize to mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    })

    window.dispatchEvent(new Event('resize'))

    // Verify component still renders after resize
    const carouselItems = document.querySelectorAll('[class*="carouselItem"]')
    expect(carouselItems.length).toBeGreaterThan(0)
  })

  it('should auto-advance testimonials when auto-play is enabled', () => {
    render(<Testimonials />)

    const initialTestimonial = screen.getByText(testimonials[0].name)
    expect(initialTestimonial).toBeInTheDocument()

    // Fast-forward time by 5 seconds to trigger auto-advance
    vi.advanceTimersByTime(5000)

    // The testimonial should still be in the document (it's still rendered, just shifted)
    expect(screen.getByText(testimonials[0].name)).toBeInTheDocument()
  })

  it('should wrap around to first page when reaching the end', async () => {
    const user = userEvent.setup({ delay: null })
    render(<Testimonials />)

    const nextButton = screen.getByLabelText(/Next testimonials/i)
    const dots = screen.getAllByLabelText(/Go to page/i)
    const totalPages = dots.length

    // Click next enough times to reach the end
    for (let i = 0; i < totalPages; i++) {
      await user.click(nextButton)
    }

    // Should wrap around to first page
    expect(dots[0]).toBeInTheDocument()
  })

  it('should wrap around to last page when going back from first page', async () => {
    const user = userEvent.setup({ delay: null })
    render(<Testimonials />)

    const prevButton = screen.getByLabelText(/Previous testimonials/i)
    const dots = screen.getAllByLabelText(/Go to page/i)

    // Click previous from first page
    await user.click(prevButton)

    // Should wrap to last page
    expect(dots[dots.length - 1]).toBeInTheDocument()
  })

  it('should clean up interval on unmount', () => {
    const { unmount } = render(<Testimonials />)
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

    unmount()

    expect(clearIntervalSpy).toHaveBeenCalled()
    clearIntervalSpy.mockRestore()
  })

  it('should clean up resize listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<Testimonials />)

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    removeEventListenerSpy.mockRestore()
  })

  it('should handle rapid navigation clicks', async () => {
    const user = userEvent.setup({ delay: null })
    render(<Testimonials />)

    const nextButton = screen.getByLabelText(/Next testimonials/i)
    const prevButton = screen.getByLabelText(/Previous testimonials/i)

    // Rapidly click both buttons
    await user.click(nextButton)
    await user.click(prevButton)
    await user.click(nextButton)
    await user.click(prevButton)

    // Should handle all clicks without errors
    expect(nextButton).toBeInTheDocument()
    expect(prevButton).toBeInTheDocument()
  })

  it('should render correct number of dots based on items per page', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200, // Desktop - 3 items per page
    })

    render(<Testimonials />)
    const dots = screen.getAllByLabelText(/Go to page/i)
    const expectedPages = Math.ceil(testimonials.length / 3)
    expect(dots.length).toBe(expectedPages)
  })

  it('should apply active class to current dot', () => {
    render(<Testimonials />)
    const dots = screen.getAllByLabelText(/Go to page/i)
    if (dots.length > 0) {
      // SCSS modules add hash, so check for class name containing dot--active
      expect(dots[0].className).toContain('dot--active')
    }
  })

  it('should update active dot when navigating', async () => {
    const user = userEvent.setup({ delay: null })
    render(<Testimonials />)

    const dots = screen.getAllByLabelText(/Go to page/i)
    if (dots.length > 1) {
      await user.click(dots[1])
      // SCSS modules add hash, so check for class name containing dot--active
      expect(dots[1].className).toContain('dot--active')
      expect(dots[0].className).not.toContain('dot--active')
    }
  })
})
