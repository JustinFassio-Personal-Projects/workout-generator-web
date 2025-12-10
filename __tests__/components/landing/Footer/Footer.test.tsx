import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Footer } from '@/components/landing/Footer/Footer'
import * as analyticsModule from '@/lib/analytics'

// Mock analytics
vi.mock('@/lib/analytics', () => ({
  trackVercelEvent: vi.fn(),
  trackNavigationClick: vi.fn(),
}))

describe('Footer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render footer section', () => {
    render(<Footer />)
    const footer = document.querySelector('footer#footer')
    expect(footer).toBeInTheDocument()
  })

  it('should render brand logo and tagline', () => {
    render(<Footer />)
    expect(screen.getByText('Workout')).toBeInTheDocument()
    expect(screen.getByText('Generator')).toBeInTheDocument()
    expect(screen.getByText(/Transform your fitness journey/i)).toBeInTheDocument()
  })

  it('should render navigation links', () => {
    render(<Footer />)
    expect(screen.getByText('Product')).toBeInTheDocument()
    expect(screen.getByText('Company')).toBeInTheDocument()
    expect(screen.getByText('Resources')).toBeInTheDocument()
    expect(screen.getByText('Legal')).toBeInTheDocument()
    expect(screen.getByText('Features')).toBeInTheDocument()
    expect(screen.getByText('Blog')).toBeInTheDocument()
  })

  it('should render social links', () => {
    render(<Footer />)
    expect(screen.getByLabelText('Facebook')).toBeInTheDocument()
    expect(screen.getByLabelText('Twitter')).toBeInTheDocument()
    expect(screen.getByLabelText('Instagram')).toBeInTheDocument()
    expect(screen.getByLabelText('LinkedIn')).toBeInTheDocument()
  })

  it('should render newsletter form', () => {
    render(<Footer />)
    expect(screen.getByText('Newsletter')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Subscribe/i })).toBeInTheDocument()
  })

  it('should call trackVercelEvent when social link is clicked', () => {
    const { trackVercelEvent } = analyticsModule
    render(<Footer />)

    const facebookLink = screen.getByLabelText('Facebook')
    fireEvent.click(facebookLink)

    expect(trackVercelEvent).toHaveBeenCalledWith('Social Link Click', {
      platform: 'Facebook',
      location: 'footer',
    })
  })

  it('should call trackNavigationClick when footer link is clicked', () => {
    const { trackNavigationClick } = analyticsModule
    render(<Footer />)

    const featuresLink = screen.getByText('Features')
    fireEvent.click(featuresLink)

    expect(trackNavigationClick).toHaveBeenCalledWith('#features', 'footer_link', 'footer', {
      category: 'product',
      link_label: 'Features',
    })
  })

  it('should call trackVercelEvent when newsletter form is submitted', () => {
    const { trackVercelEvent } = analyticsModule
    render(<Footer />)

    const emailInput = screen.getByPlaceholderText('Enter your email')
    const form = emailInput.closest('form')

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.submit(form!)

    expect(trackVercelEvent).toHaveBeenCalledWith('Newsletter Subscribe', {
      location: 'footer',
      form_type: 'newsletter',
    })
  })

  it('should display current year in copyright', () => {
    render(<Footer />)
    const currentYear = new Date().getFullYear()
    expect(screen.getByText(new RegExp(`© ${currentYear}`))).toBeInTheDocument()
  })
})
