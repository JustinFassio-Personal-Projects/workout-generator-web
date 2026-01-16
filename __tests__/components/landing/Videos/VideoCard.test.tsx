import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { VideoCard } from '@/components/landing/Videos/VideoCard'
import { Video } from '@/data/videos'
import * as analytics from '@/lib/analytics'

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(callback => {
  return {
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
  }
})

// Mock AOS
vi.mock('aos', () => ({
  default: {
    init: vi.fn(),
  },
}))

describe('VideoCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockVideo: Video = {
    id: '1',
    title: 'Test Video',
    description: 'Test description',
    videoUrl: '/videos/test.mp4',
    category: 'featured-exercise',
    featured: true,
  }

  const mockBrandVideo: Video = {
    id: '2',
    title: 'Brand Video',
    description: 'Brand description',
    videoUrl: '/videos/brand.mp4',
    category: 'brand',
    featured: true,
  }

  it('should render video card with video element', () => {
    render(<VideoCard video={mockVideo} />)
    const videoElement = document.querySelector('video')
    expect(videoElement).toBeInTheDocument()
    expect(videoElement?.getAttribute('src')).toBe('/videos/test.mp4')
  })

  it('should render video title and description for non-brand videos', () => {
    render(<VideoCard video={mockVideo} />)
    expect(screen.getByText('Test Video')).toBeInTheDocument()
    expect(screen.getByText('Test description')).toBeInTheDocument()
  })

  it('should not render title and description for brand videos', () => {
    render(<VideoCard video={mockBrandVideo} />)
    expect(screen.queryByText('Brand Video')).not.toBeInTheDocument()
    expect(screen.queryByText('Brand description')).not.toBeInTheDocument()
  })

  it('should return null when videoUrl is empty', () => {
    const videoWithoutUrl: Video = {
      ...mockVideo,
      videoUrl: '',
    }
    const { container } = render(<VideoCard video={videoWithoutUrl} />)
    expect(container.firstChild).toBeNull()
  })

  it('should render video with correct attributes', () => {
    render(<VideoCard video={mockVideo} />)
    const videoElement = document.querySelector('video') as HTMLVideoElement
    expect(videoElement?.hasAttribute('controls')).toBe(true)
    expect(videoElement?.hasAttribute('loop')).toBe(true)
    expect(videoElement?.muted).toBe(true)
    expect(videoElement?.hasAttribute('playsInline')).toBe(true)
  })

  it('should handle video error', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<VideoCard video={mockVideo} />)
    const videoElement = document.querySelector('video') as HTMLVideoElement
    act(() => {
      const errorEvent = new Event('error')
      videoElement.dispatchEvent(errorEvent)
    })
    expect(consoleErrorSpy).toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })

  it('should handle video play events', () => {
    const trackVideoStartSpy = vi.spyOn(analytics, 'trackVideoStart').mockImplementation(() => {})

    render(<VideoCard video={mockVideo} />)
    const videoElement = document.querySelector('video') as HTMLVideoElement

    act(() => {
      // Simulate play event
      const playEvent = new Event('play')
      videoElement.dispatchEvent(playEvent)
    })

    // Function should be called (may be async)
    expect(trackVideoStartSpy).toHaveBeenCalled()

    trackVideoStartSpy.mockRestore()
  })

  it('should handle video ended events', () => {
    const trackVideoCompleteSpy = vi
      .spyOn(analytics, 'trackVideoComplete')
      .mockImplementation(() => {})

    render(<VideoCard video={mockVideo} />)
    const videoElement = document.querySelector('video') as HTMLVideoElement

    // Set up video duration
    Object.defineProperty(videoElement, 'duration', { value: 100, writable: true })

    act(() => {
      // Simulate ended event
      const endedEvent = new Event('ended')
      videoElement.dispatchEvent(endedEvent)
    })

    // Function should be called
    expect(trackVideoCompleteSpy).toHaveBeenCalled()

    trackVideoCompleteSpy.mockRestore()
  })
})
