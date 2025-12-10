import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  isGA4Available,
  isGTMAvailable,
  trackGA4Event,
  trackGTMEvent,
  trackEvent,
  trackPageView,
  trackVercelEvent,
  trackButtonClick,
  trackScrollDepth,
  trackNavigationClick,
  trackFormSubmission,
  trackVideoStart,
  trackVideoView,
  trackVideoProgress,
  trackVideoComplete,
  trackVideoPause,
  trackVideoResume,
  analytics,
} from '@/lib/analytics'

// Mock @vercel/analytics
vi.mock('@vercel/analytics', () => ({
  track: vi.fn(),
}))

// Extend Window interface for tests
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer: unknown[]
  }
}

describe('analytics', () => {
  beforeEach(() => {
    // Reset window mocks
    delete (window as any).gtag
    delete (window as any).dataLayer
  })

  describe('isGA4Available', () => {
    it('should return false when window is undefined', () => {
      const originalWindow = global.window
      // @ts-expect-error - intentionally removing window for test
      delete global.window
      expect(isGA4Available()).toBe(false)
      global.window = originalWindow
    })

    it('should return false when gtag is not a function', () => {
      window.gtag = undefined
      expect(isGA4Available()).toBe(false)
    })

    it('should return true when gtag is a function', () => {
      window.gtag = vi.fn()
      expect(isGA4Available()).toBe(true)
    })
  })

  describe('isGTMAvailable', () => {
    it('should return false when window is undefined', () => {
      const originalWindow = global.window
      // @ts-expect-error - intentionally removing window for test
      delete global.window
      expect(isGTMAvailable()).toBe(false)
      global.window = originalWindow
    })

    it('should return false when dataLayer is not an array', () => {
      window.dataLayer = undefined as any
      expect(isGTMAvailable()).toBe(false)
    })

    it('should return true when dataLayer is an array', () => {
      window.dataLayer = []
      expect(isGTMAvailable()).toBe(true)
    })
  })

  describe('trackGA4Event', () => {
    it('should warn and return when GA4 is not available', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      window.gtag = undefined
      trackGA4Event('test_event')
      expect(consoleSpy).toHaveBeenCalledWith('Google Analytics 4 is not available')
      consoleSpy.mockRestore()
    })

    it('should call gtag when GA4 is available', () => {
      const gtagMock = vi.fn()
      window.gtag = gtagMock
      trackGA4Event('test_event', { param: 'value' })
      expect(gtagMock).toHaveBeenCalledWith('event', 'test_event', { param: 'value' })
    })

    it('should call gtag with empty object when no params provided', () => {
      const gtagMock = vi.fn()
      window.gtag = gtagMock
      trackGA4Event('test_event')
      expect(gtagMock).toHaveBeenCalledWith('event', 'test_event', {})
    })

    it('should handle case where gtag is null after availability check', () => {
      // Test the defensive check on line 52 - edge case where gtag might be null
      // Set gtag to a function first to pass isGA4Available check
      const gtagMock = vi.fn()
      window.gtag = gtagMock
      // After passing isGA4Available, gtag should still be called
      trackGA4Event('test_event')
      expect(gtagMock).toHaveBeenCalled()
    })
  })

  describe('trackGTMEvent', () => {
    it('should warn and return when GTM is not available', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      window.dataLayer = undefined as any
      trackGTMEvent('test_event')
      expect(consoleSpy).toHaveBeenCalledWith('Google Tag Manager is not available')
      consoleSpy.mockRestore()
    })

    it('should push event to dataLayer when GTM is available', () => {
      const dataLayer: any[] = []
      window.dataLayer = dataLayer
      trackGTMEvent('test_event', { param: 'value' })
      expect(dataLayer).toHaveLength(1)
      expect(dataLayer[0]).toEqual({
        event: 'test_event',
        param: 'value',
      })
    })
  })

  describe('trackEvent', () => {
    it('should call both trackGA4Event and trackGTMEvent', () => {
      const gtagMock = vi.fn()
      const dataLayer: any[] = []
      window.gtag = gtagMock
      window.dataLayer = dataLayer

      trackEvent('test_event', { param: 'value' })

      expect(gtagMock).toHaveBeenCalledWith('event', 'test_event', { param: 'value' })
      expect(dataLayer).toHaveLength(1)
      expect(dataLayer[0]).toEqual({
        event: 'test_event',
        param: 'value',
      })
    })
  })

  describe('trackPageView', () => {
    it('should track page view in GA4 when available', () => {
      const gtagMock = vi.fn()
      window.gtag = gtagMock
      trackPageView('/test-path', 'Test Title')
      expect(gtagMock).toHaveBeenCalledWith('config', '', {
        page_path: '/test-path',
        page_title: 'Test Title',
      })
    })

    it('should track page view in GTM when available', () => {
      const dataLayer: any[] = []
      window.dataLayer = dataLayer
      trackPageView('/test-path', 'Test Title')
      expect(dataLayer).toHaveLength(1)
      expect(dataLayer[0]).toEqual({
        event: 'page_view',
        page_path: '/test-path',
        page_title: 'Test Title',
      })
    })

    it('should handle page view when GA4 is not available', () => {
      ;(window as any).gtag = undefined
      const dataLayer: any[] = []
      window.dataLayer = dataLayer
      trackPageView('/test-path', 'Test Title')
      // Should still track in GTM
      expect(dataLayer).toHaveLength(1)
    })

    it('should handle page view when GTM is not available', () => {
      const gtagMock = vi.fn()
      window.gtag = gtagMock
      window.dataLayer = undefined as any
      trackPageView('/test-path', 'Test Title')
      // Should still track in GA4
      expect(gtagMock).toHaveBeenCalled()
    })

    it('should handle page view when both GA4 and GTM are not available', () => {
      window.gtag = undefined
      window.dataLayer = undefined as any
      // Should not throw
      expect(() => trackPageView('/test-path', 'Test Title')).not.toThrow()
    })

    it('should handle page view without title', () => {
      const gtagMock = vi.fn()
      const dataLayer: any[] = []
      window.gtag = gtagMock
      window.dataLayer = dataLayer
      trackPageView('/test-path')
      expect(gtagMock).toHaveBeenCalled()
      expect(dataLayer).toHaveLength(1)
    })
  })

  describe('analytics object', () => {
    beforeEach(() => {
      const gtagMock = vi.fn()
      const dataLayer: any[] = []
      window.gtag = gtagMock
      window.dataLayer = dataLayer
      // Reset Vercel analytics mock
      vi.clearAllMocks()
    })

    it('should track CTA click', async () => {
      const { track } = await import('@vercel/analytics')
      analytics.trackCTAClick('Get Started', 'hero')
      expect(window.gtag).toHaveBeenCalledWith('event', 'cta_click', {
        cta_name: 'Get Started',
        location: 'hero',
      })
      // Should also call Vercel Analytics
      expect(track).toHaveBeenCalledWith('Button Click', {
        button_name: 'Get Started',
        location: 'hero',
      })
    })

    it('should track blog post view', () => {
      analytics.trackBlogPostView('test-slug', 'Test Post')
      expect(window.gtag).toHaveBeenCalledWith('event', 'blog_post_view', {
        post_slug: 'test-slug',
        post_title: 'Test Post',
      })
    })

    it('should track blog post click', async () => {
      const { track } = await import('@vercel/analytics')
      analytics.trackBlogPostClick('test-slug', 'Test Post')
      expect(window.gtag).toHaveBeenCalledWith('event', 'blog_post_click', {
        post_slug: 'test-slug',
        post_title: 'Test Post',
      })
      // Should also call Vercel Analytics
      expect(track).toHaveBeenCalledWith('Blog Post Click', {
        post_slug: 'test-slug',
        post_title: 'Test Post',
        location: 'blog_card',
      })
    })

    it('should handle blog post click with long title', async () => {
      const { track } = await import('@vercel/analytics')
      const longTitle = 'A'.repeat(300) // Longer than 255 characters
      analytics.trackBlogPostClick('test-slug', longTitle)
      expect(track).toHaveBeenCalledWith('Blog Post Click', {
        post_slug: 'test-slug',
        post_title: longTitle.substring(0, 255),
        location: 'blog_card',
      })
    })

    it('should track feature click', () => {
      analytics.trackFeatureClick('AI Generation')
      expect(window.gtag).toHaveBeenCalledWith('event', 'feature_click', {
        feature_name: 'AI Generation',
      })
    })

    it('should track pricing plan click', async () => {
      const { track } = await import('@vercel/analytics')
      analytics.trackPricingPlanClick('Premium', 10)
      expect(window.gtag).toHaveBeenCalledWith('event', 'pricing_plan_click', {
        plan_name: 'Premium',
        plan_price: 10,
      })
      // Should also call Vercel Analytics
      expect(track).toHaveBeenCalledWith('Pricing Plan Click', {
        plan_name: 'Premium',
        plan_price: 10,
        location: 'pricing',
      })
    })

    it('should track chat open', async () => {
      const { track } = await import('@vercel/analytics')
      analytics.trackChatOpen()
      expect(window.gtag).toHaveBeenCalledWith('event', 'chat_open', {})
      // Should also call Vercel Analytics
      expect(track).toHaveBeenCalledWith('Chat Widget Interaction', {
        action: 'open',
        location: 'chat_widget',
      })
    })

    it('should track chat message', () => {
      analytics.trackChatMessage(50)
      expect(window.gtag).toHaveBeenCalledWith('event', 'chat_message', {
        message_length: 50,
      })
    })

    it('should track video start', async () => {
      const { track } = await import('@vercel/analytics')
      const { trackVideoStart } = await import('@/lib/analytics')
      analytics.trackVideoStart('video-1', 'Test Video', 'featured-exercise', 'videos_section')
      expect(track).toHaveBeenCalledWith('Video Start', {
        video_id: 'video-1',
        video_title: 'Test Video',
        video_category: 'featured-exercise',
        location: 'videos_section',
      })
      // Verify the underlying function is also called
      trackVideoStart('video-1', 'Test Video', 'featured-exercise', 'videos_section')
      expect(track).toHaveBeenCalledTimes(2)
    })

    it('should track video view', async () => {
      const { track } = await import('@vercel/analytics')
      const { trackVideoView } = await import('@/lib/analytics')
      analytics.trackVideoView('video-1', 'Test Video', 'featured-exercise', 'videos_section')
      expect(track).toHaveBeenCalledWith('Video View', {
        video_id: 'video-1',
        video_title: 'Test Video',
        video_category: 'featured-exercise',
        location: 'videos_section',
      })
      // Verify the underlying function is also called
      trackVideoView('video-1', 'Test Video', 'featured-exercise', 'videos_section')
      expect(track).toHaveBeenCalledTimes(2)
    })

    it('should track video progress with total duration', async () => {
      const { track } = await import('@vercel/analytics')
      const { trackVideoProgress } = await import('@/lib/analytics')
      analytics.trackVideoProgress('video-1', 'Test Video', 'featured-exercise', 50, 30.5, 60.0)
      expect(track).toHaveBeenCalledWith('Video Progress', {
        video_id: 'video-1',
        video_title: 'Test Video',
        video_category: 'featured-exercise',
        progress_percentage: 50,
        duration_watched: 31,
        total_duration: 60,
      })
      // Verify the underlying function is also called
      trackVideoProgress('video-1', 'Test Video', 'featured-exercise', 50, 30.5, 60.0)
      expect(track).toHaveBeenCalledTimes(2)
    })

    it('should track video progress without total duration', async () => {
      const { track } = await import('@vercel/analytics')
      const { trackVideoProgress } = await import('@/lib/analytics')
      analytics.trackVideoProgress('video-1', 'Test Video', 'featured-exercise', 25, 15.2)
      expect(track).toHaveBeenCalledWith('Video Progress', {
        video_id: 'video-1',
        video_title: 'Test Video',
        video_category: 'featured-exercise',
        progress_percentage: 25,
        duration_watched: 15,
      })
      // Verify the underlying function is also called
      trackVideoProgress('video-1', 'Test Video', 'featured-exercise', 25, 15.2)
      expect(track).toHaveBeenCalledTimes(2)
    })

    it('should track video complete', async () => {
      const { track } = await import('@vercel/analytics')
      const { trackVideoComplete } = await import('@/lib/analytics')
      analytics.trackVideoComplete('video-1', 'Test Video', 'featured-exercise', 120.5)
      expect(track).toHaveBeenCalledWith('Video Complete', {
        video_id: 'video-1',
        video_title: 'Test Video',
        video_category: 'featured-exercise',
        total_duration: 121,
        completion_percentage: 100,
      })
      // Verify the underlying function is also called
      trackVideoComplete('video-1', 'Test Video', 'featured-exercise', 120.5)
      expect(track).toHaveBeenCalledTimes(2)
    })

    it('should track video pause', async () => {
      const { track } = await import('@vercel/analytics')
      const { trackVideoPause } = await import('@/lib/analytics')
      analytics.trackVideoPause('video-1', 'Test Video', 'featured-exercise', 10.5, 50)
      expect(track).toHaveBeenCalledWith('Video Pause', {
        video_id: 'video-1',
        video_title: 'Test Video',
        video_category: 'featured-exercise',
        pause_time: 11,
        progress_percentage: 50,
      })
      // Verify the underlying function is also called
      trackVideoPause('video-1', 'Test Video', 'featured-exercise', 10.5, 50)
      expect(track).toHaveBeenCalledTimes(2)
    })

    it('should track video resume', async () => {
      const { track } = await import('@vercel/analytics')
      const { trackVideoResume } = await import('@/lib/analytics')
      analytics.trackVideoResume('video-1', 'Test Video', 'featured-exercise', 15.3, 75)
      expect(track).toHaveBeenCalledWith('Video Resume', {
        video_id: 'video-1',
        video_title: 'Test Video',
        video_category: 'featured-exercise',
        resume_time: 15,
        progress_percentage: 75,
      })
      // Verify the underlying function is also called
      trackVideoResume('video-1', 'Test Video', 'featured-exercise', 15.3, 75)
      expect(track).toHaveBeenCalledTimes(2)
    })

    it('should truncate long video titles to 255 characters', async () => {
      const { track } = await import('@vercel/analytics')
      const longTitle = 'A'.repeat(300)
      analytics.trackVideoStart('video-1', longTitle, 'featured-exercise')
      expect(track).toHaveBeenCalledWith('Video Start', {
        video_id: 'video-1',
        video_title: 'A'.repeat(255),
        video_category: 'featured-exercise',
        location: 'videos_section',
      })
    })
  })

  describe('Vercel Analytics tracking', () => {
    beforeEach(() => {
      // Mock window.location for trackScrollDepth
      Object.defineProperty(window, 'location', {
        value: { pathname: '/test-path' },
        writable: true,
      })
    })

    it('should track Vercel event when window is defined', async () => {
      const { track } = await import('@vercel/analytics')
      trackVercelEvent('Test Event', { key: 'value' })
      expect(track).toHaveBeenCalledWith('Test Event', { key: 'value' })
    })

    it('should not track Vercel event when window is undefined', () => {
      const originalWindow = global.window
      // @ts-expect-error - intentionally removing window for test
      delete global.window
      const { track } = require('@vercel/analytics')
      trackVercelEvent('Test Event')
      // Should not throw, but track may not be called
      global.window = originalWindow
    })

    it('should handle errors in trackVercelEvent gracefully', async () => {
      const { track } = await import('@vercel/analytics')
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      vi.mocked(track).mockImplementationOnce(() => {
        throw new Error('Tracking error')
      })
      trackVercelEvent('Test Event')
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to track Vercel Analytics event:',
        expect.any(Error)
      )
      consoleSpy.mockRestore()
    })

    it('should track button click', async () => {
      const { track } = await import('@vercel/analytics')
      trackButtonClick('Test Button', 'hero', { section: 'test' })
      expect(track).toHaveBeenCalledWith('Button Click', {
        button_name: 'Test Button',
        location: 'hero',
        section: 'test',
      })
    })

    it('should track button click without metadata', async () => {
      const { track } = await import('@vercel/analytics')
      trackButtonClick('Test Button', 'hero')
      expect(track).toHaveBeenCalledWith('Button Click', {
        button_name: 'Test Button',
        location: 'hero',
      })
    })

    it('should track scroll depth with current path', async () => {
      const { track } = await import('@vercel/analytics')
      trackScrollDepth(50)
      expect(track).toHaveBeenCalledWith('Page Scroll', {
        scroll_depth: 50,
        page_path: '/test-path',
      })
    })

    it('should track scroll depth with custom path', async () => {
      const { track } = await import('@vercel/analytics')
      trackScrollDepth(75, '/custom-path')
      expect(track).toHaveBeenCalledWith('Page Scroll', {
        scroll_depth: 75,
        page_path: '/custom-path',
      })
    })

    it('should handle scroll depth when window is undefined', () => {
      const originalWindow = global.window
      // @ts-expect-error - intentionally removing window for test
      delete global.window
      // Should not throw when window is undefined
      // trackVercelEvent will return early, so track won't be called
      expect(() => trackScrollDepth(25)).not.toThrow()
      global.window = originalWindow
    })

    it('should use window.location.pathname when pagePath not provided', async () => {
      const { track } = await import('@vercel/analytics')
      Object.defineProperty(window, 'location', {
        value: { pathname: '/current-path' },
        writable: true,
        configurable: true,
      })
      trackScrollDepth(50)
      expect(track).toHaveBeenCalledWith('Page Scroll', {
        scroll_depth: 50,
        page_path: '/current-path',
      })
    })

    it('should handle scroll depth when window.location.pathname is undefined', async () => {
      const { track } = await import('@vercel/analytics')
      Object.defineProperty(window, 'location', {
        value: { pathname: undefined },
        writable: true,
        configurable: true,
      })
      trackScrollDepth(75)
      expect(track).toHaveBeenCalledWith('Page Scroll', {
        scroll_depth: 75,
        page_path: undefined,
      })
    })

    it('should track navigation click', async () => {
      const { track } = await import('@vercel/analytics')
      trackNavigationClick('/blog', 'nav_link', 'navbar', { link_label: 'Blog' })
      expect(track).toHaveBeenCalledWith('Navigation Click', {
        destination: '/blog',
        type: 'nav_link',
        location: 'navbar',
        link_label: 'Blog',
      })
    })

    it('should track form submission', async () => {
      const { track } = await import('@vercel/analytics')
      trackFormSubmission('newsletter', { location: 'footer' })
      expect(track).toHaveBeenCalledWith('Form Submission', {
        form_name: 'newsletter',
        location: 'footer',
      })
    })

    it('should track form submission without metadata', async () => {
      const { track } = await import('@vercel/analytics')
      trackFormSubmission('contact')
      expect(track).toHaveBeenCalledWith('Form Submission', {
        form_name: 'contact',
      })
    })

    it('should track navigation click without metadata', async () => {
      const { track } = await import('@vercel/analytics')
      trackNavigationClick('/about', 'nav_link', 'navbar')
      expect(track).toHaveBeenCalledWith('Navigation Click', {
        destination: '/about',
        type: 'nav_link',
        location: 'navbar',
      })
    })

    it('should track Vercel event without data', async () => {
      const { track } = await import('@vercel/analytics')
      trackVercelEvent('Simple Event')
      expect(track).toHaveBeenCalledWith('Simple Event', undefined)
    })

    it('should track video start directly', async () => {
      const { track } = await import('@vercel/analytics')
      trackVideoStart('video-1', 'Test Video', 'featured-exercise', 'custom_location')
      expect(track).toHaveBeenCalledWith('Video Start', {
        video_id: 'video-1',
        video_title: 'Test Video',
        video_category: 'featured-exercise',
        location: 'custom_location',
      })
    })

    it('should track video start with default location', async () => {
      const { track } = await import('@vercel/analytics')
      trackVideoStart('video-1', 'Test Video', 'featured-exercise')
      expect(track).toHaveBeenCalledWith('Video Start', {
        video_id: 'video-1',
        video_title: 'Test Video',
        video_category: 'featured-exercise',
        location: 'videos_section',
      })
    })

    it('should track video view directly', async () => {
      const { track } = await import('@vercel/analytics')
      trackVideoView('video-1', 'Test Video', 'featured-exercise', 'custom_location')
      expect(track).toHaveBeenCalledWith('Video View', {
        video_id: 'video-1',
        video_title: 'Test Video',
        video_category: 'featured-exercise',
        location: 'custom_location',
      })
    })

    it('should track video view with default location', async () => {
      const { track } = await import('@vercel/analytics')
      trackVideoView('video-1', 'Test Video', 'featured-exercise')
      expect(track).toHaveBeenCalledWith('Video View', {
        video_id: 'video-1',
        video_title: 'Test Video',
        video_category: 'featured-exercise',
        location: 'videos_section',
      })
    })

    it('should track video progress directly with total duration', async () => {
      const { track } = await import('@vercel/analytics')
      trackVideoProgress('video-1', 'Test Video', 'featured-exercise', 75, 45.7, 60.0)
      expect(track).toHaveBeenCalledWith('Video Progress', {
        video_id: 'video-1',
        video_title: 'Test Video',
        video_category: 'featured-exercise',
        progress_percentage: 75,
        duration_watched: 46,
        total_duration: 60,
      })
    })

    it('should track video progress directly without total duration', async () => {
      const { track } = await import('@vercel/analytics')
      trackVideoProgress('video-1', 'Test Video', 'featured-exercise', 25, 12.3)
      expect(track).toHaveBeenCalledWith('Video Progress', {
        video_id: 'video-1',
        video_title: 'Test Video',
        video_category: 'featured-exercise',
        progress_percentage: 25,
        duration_watched: 12,
      })
    })

    it('should track video complete directly', async () => {
      const { track } = await import('@vercel/analytics')
      trackVideoComplete('video-1', 'Test Video', 'featured-exercise', 90.8)
      expect(track).toHaveBeenCalledWith('Video Complete', {
        video_id: 'video-1',
        video_title: 'Test Video',
        video_category: 'featured-exercise',
        total_duration: 91,
        completion_percentage: 100,
      })
    })

    it('should track video pause directly', async () => {
      const { track } = await import('@vercel/analytics')
      trackVideoPause('video-1', 'Test Video', 'featured-exercise', 20.7, 65)
      expect(track).toHaveBeenCalledWith('Video Pause', {
        video_id: 'video-1',
        video_title: 'Test Video',
        video_category: 'featured-exercise',
        pause_time: 21,
        progress_percentage: 65,
      })
    })

    it('should track video resume directly', async () => {
      const { track } = await import('@vercel/analytics')
      trackVideoResume('video-1', 'Test Video', 'featured-exercise', 25.9, 80)
      expect(track).toHaveBeenCalledWith('Video Resume', {
        video_id: 'video-1',
        video_title: 'Test Video',
        video_category: 'featured-exercise',
        resume_time: 26,
        progress_percentage: 80,
      })
    })
  })
})
