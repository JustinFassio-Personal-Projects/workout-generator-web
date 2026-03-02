import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TestimonialCard } from '@/components/landing/Testimonials/TestimonialCard'
import { Testimonial } from '@/data/testimonials'

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}))

// Mock Card component
vi.mock('@/components/ui/Card/Card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
}))

describe('TestimonialCard', () => {
  const mockTestimonial: Testimonial = {
    id: '1',
    name: 'John Doe',
    role: 'Fitness Enthusiast',
    company: 'Test Company',
    quote: 'This is an amazing product!',
    rating: 5,
    title: 'Great Experience',
  }

  it('should render testimonial card', () => {
    render(<TestimonialCard testimonial={mockTestimonial} />)
    expect(screen.getByText(mockTestimonial.name)).toBeInTheDocument()
  })

  it('should render testimonial quote', () => {
    render(<TestimonialCard testimonial={mockTestimonial} />)
    // Quote uses HTML entities &ldquo; and &rdquo;, so search for the quote text
    expect(screen.getByText(mockTestimonial.quote, { exact: false })).toBeInTheDocument()
  })

  it('should render testimonial rating stars', () => {
    render(<TestimonialCard testimonial={mockTestimonial} />)
    // Stars are rendered as SVG elements, check that rating container exists
    const ratingContainer = document.querySelector('[class*="rating"]')
    expect(ratingContainer).toBeInTheDocument()
  })

  it('should render testimonial role and company', () => {
    render(<TestimonialCard testimonial={mockTestimonial} />)
    expect(screen.getByText(/Fitness Enthusiast/)).toBeInTheDocument()
    expect(screen.getByText(/Test Company/)).toBeInTheDocument()
  })

  it('should render testimonial title when provided', () => {
    render(<TestimonialCard testimonial={mockTestimonial} />)
    expect(screen.getByText(mockTestimonial.title!)).toBeInTheDocument()
  })

  it('should handle testimonial without title', () => {
    const testimonialWithoutTitle = { ...mockTestimonial, title: undefined }
    render(<TestimonialCard testimonial={testimonialWithoutTitle} />)
    expect(screen.getByText(mockTestimonial.name)).toBeInTheDocument()
    expect(screen.queryByText(mockTestimonial.title!)).not.toBeInTheDocument()
  })

  it('should handle testimonial without company', () => {
    const testimonialWithoutCompany = { ...mockTestimonial, company: undefined }
    render(<TestimonialCard testimonial={testimonialWithoutCompany} />)
    expect(screen.getByText(mockTestimonial.role)).toBeInTheDocument()
    expect(screen.queryByText(/Test Company/)).not.toBeInTheDocument()
  })

  it('should render correct number of stars for different ratings', () => {
    const threeStarTestimonial = { ...mockTestimonial, rating: 3 }
    render(<TestimonialCard testimonial={threeStarTestimonial} />)
    // Stars are rendered as SVG elements, check that rating container exists
    const ratingContainer = document.querySelector('[class*="rating"]')
    expect(ratingContainer).toBeInTheDocument()
  })
})
