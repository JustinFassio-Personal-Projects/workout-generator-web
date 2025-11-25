import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  isGA4Available,
  isGTMAvailable,
  trackGA4Event,
  trackGTMEvent,
  trackEvent,
  trackPageView,
  analytics,
} from '@/lib/analytics'

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
  })

  describe('analytics object', () => {
    beforeEach(() => {
      const gtagMock = vi.fn()
      const dataLayer: any[] = []
      window.gtag = gtagMock
      window.dataLayer = dataLayer
    })

    it('should track CTA click', () => {
      analytics.trackCTAClick('Get Started', 'hero')
      expect(window.gtag).toHaveBeenCalledWith('event', 'cta_click', {
        cta_name: 'Get Started',
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

    it('should track blog post click', () => {
      analytics.trackBlogPostClick('test-slug', 'Test Post')
      expect(window.gtag).toHaveBeenCalledWith('event', 'blog_post_click', {
        post_slug: 'test-slug',
        post_title: 'Test Post',
      })
    })

    it('should track feature click', () => {
      analytics.trackFeatureClick('AI Generation')
      expect(window.gtag).toHaveBeenCalledWith('event', 'feature_click', {
        feature_name: 'AI Generation',
      })
    })

    it('should track pricing plan click', () => {
      analytics.trackPricingPlanClick('Premium', 10)
      expect(window.gtag).toHaveBeenCalledWith('event', 'pricing_plan_click', {
        plan_name: 'Premium',
        plan_price: 10,
      })
    })

    it('should track chat open', () => {
      analytics.trackChatOpen()
      expect(window.gtag).toHaveBeenCalledWith('event', 'chat_open', {})
    })

    it('should track chat message', () => {
      analytics.trackChatMessage(50)
      expect(window.gtag).toHaveBeenCalledWith('event', 'chat_message', {
        message_length: 50,
      })
    })
  })
})
