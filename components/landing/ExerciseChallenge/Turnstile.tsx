'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'

declare global {
  interface Window {
    turnstile: {
      render: (element: HTMLElement, options: TurnstileOptions) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

interface TurnstileOptions {
  sitekey: string
  callback?: (token: string) => void
  'error-callback'?: () => void
  'expired-callback'?: () => void
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact'
}

interface TurnstileProps {
  siteKey: string
  onSuccess: (token: string) => void
  onError?: () => void
  onExpire?: () => void
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact'
}

// Global flag to track if script is already loaded
let scriptLoaded = false
let scriptLoading = false

export const Turnstile: React.FC<TurnstileProps> = ({
  siteKey,
  onSuccess,
  onError,
  onExpire,
  theme = 'auto',
  size = 'normal',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const callbacksRef = useRef({ onSuccess, onError, onExpire })
  const [isLoaded, setIsLoaded] = useState(false)
  const isMountedRef = useRef(true)

  // Update callbacks ref when they change (without triggering re-render)
  useEffect(() => {
    callbacksRef.current = { onSuccess, onError, onExpire }
  }, [onSuccess, onError, onExpire])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    // Check if script is already loaded
    if (scriptLoaded && window.turnstile) {
      setIsLoaded(true)
      return
    }

    // Check if script is already in the DOM
    const existingScript = document.querySelector(
      'script[src="https://challenges.cloudflare.com/turnstile/v0/api.js"]'
    )

    if (existingScript) {
      // Script exists, wait for it to load
      if (window.turnstile) {
        scriptLoaded = true
        setIsLoaded(true)
      } else {
        existingScript.addEventListener('load', () => {
          if (isMountedRef.current) {
            scriptLoaded = true
            setIsLoaded(true)
          }
        })
      }
      return
    }

    // Load Turnstile script only if not already loading
    if (scriptLoading) {
      return
    }

    scriptLoading = true
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true

    script.onload = () => {
      scriptLoaded = true
      scriptLoading = false
      if (isMountedRef.current) {
        setIsLoaded(true)
      }
    }

    script.onerror = () => {
      scriptLoading = false
      console.error('Failed to load Cloudflare Turnstile script')
    }

    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!isLoaded || !containerRef.current || !window.turnstile) {
      return
    }

    // If widget already exists, just reset it instead of removing/recreating
    if (widgetIdRef.current) {
      try {
        window.turnstile.reset(widgetIdRef.current)
        return
      } catch (e) {
        // If reset fails, remove and recreate
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch (removeError) {
          // Ignore remove errors
        }
        widgetIdRef.current = null
      }
    }

    // Create wrapper callbacks that use the ref
    const handleSuccess = (token: string) => {
      if (isMountedRef.current && callbacksRef.current.onSuccess) {
        callbacksRef.current.onSuccess(token)
      }
    }

    const handleError = () => {
      if (isMountedRef.current && callbacksRef.current.onError) {
        callbacksRef.current.onError()
      }
    }

    const handleExpire = () => {
      if (isMountedRef.current && callbacksRef.current.onExpire) {
        callbacksRef.current.onExpire()
      }
    }

    // Render widget only once
    try {
      const widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: handleSuccess,
        'error-callback': handleError,
        'expired-callback': handleExpire,
        theme,
        size,
      })

      widgetIdRef.current = widgetId
    } catch (error) {
      console.error('Failed to render Turnstile widget:', error)
    }

    return () => {
      // Only remove on unmount, not on every render
      if (widgetIdRef.current && window.turnstile && !isMountedRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current)
          widgetIdRef.current = null
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    }
  }, [isLoaded, siteKey, theme, size]) // Removed callbacks from dependencies

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch (e) {
          // Ignore errors during cleanup
        }
        widgetIdRef.current = null
      }
    }
  }, [])

  return <div ref={containerRef} />
}
