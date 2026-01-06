import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LogoWatermark } from '@/components/ui/LogoWatermark/LogoWatermark'

vi.mock('next/image', () => ({
  default: ({ src, alt, width, height, onError, ...props }: any) => (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      data-testid="logo-image"
      onError={onError}
      {...props}
    />
  ),
}))

describe('LogoWatermark', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render logo watermark', () => {
    render(<LogoWatermark />)
    expect(screen.getByTestId('logo-image')).toBeInTheDocument()
  })

  it('should apply custom opacity', () => {
    const { container } = render(<LogoWatermark opacity={0.1} />)
    const watermark = container.querySelector('[aria-hidden="true"]')
    expect(watermark).toHaveStyle({ opacity: '0.1' })
  })

  it('should apply custom size', () => {
    render(<LogoWatermark size={200} />)
    const image = screen.getByTestId('logo-image')
    expect(image).toHaveAttribute('width', '200')
    expect(image).toHaveAttribute('height', '200')
  })

  it('should apply position classes', () => {
    const { container } = render(<LogoWatermark position="top-left" />)
    const watermark = container.querySelector('[aria-hidden="true"]')
    expect(watermark?.className).toContain('watermark--top-left')
  })

  it('should apply rotation transform', () => {
    const { container } = render(<LogoWatermark position="top-left" rotation={45} />)
    const watermark = container.querySelector('[aria-hidden="true"]') as HTMLElement
    expect(watermark?.style.transform).toContain('rotate(45deg)')
  })

  it('should apply center transform when position is center', () => {
    const { container } = render(<LogoWatermark position="center" rotation={90} />)
    const watermark = container.querySelector('[aria-hidden="true"]') as HTMLElement
    expect(watermark?.style.transform).toContain('translate(-50%, -50%)')
  })

  it('should hide on image error', () => {
    const { container, rerender } = render(<LogoWatermark />)
    const image = screen.getByTestId('logo-image')

    // Simulate image error
    const errorEvent = new Event('error')
    image.dispatchEvent(errorEvent)

    rerender(<LogoWatermark />)
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument()
  })

  it('should apply custom className', () => {
    const { container } = render(<LogoWatermark className="custom-class" />)
    const watermark = container.querySelector('[aria-hidden="true"]')
    expect(watermark).toHaveClass('custom-class')
  })
})
