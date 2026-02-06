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
  theme: 'dark'
  size?: 'normal' | 'compact'
}

interface TurnstileProps {
  siteKey: string
  onSuccess: (token: string) => void
  onError?: () => void
  onExpire?: () => void
  size?: 'normal' | 'compact'
}

let scriptLoaded = false
let scriptLoading = false

export const Turnstile: React.FC<TurnstileProps> = ({
  siteKey,
  onSuccess,
  onError,
  onExpire,
  size = 'normal',
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const callbacksRef = useRef({ onSuccess, onError, onExpire })
  const [isLoaded, setIsLoaded] = useState(false)
  const isMountedRef = useRef(true)

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
    if (scriptLoaded && window.turnstile) {
      setIsLoaded(true)
      return
    }

    const existingScript = document.querySelector(
      'script[src="https://challenges.cloudflare.com/turnstile/v0/api.js"]'
    )

    if (existingScript) {
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

    if (scriptLoading) return

    scriptLoading = true
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true

    script.onload = () => {
      scriptLoaded = true
      scriptLoading = false
      if (isMountedRef.current) setIsLoaded(true)
    }

    script.onerror = () => {
      scriptLoading = false
      console.error('Failed to load Cloudflare Turnstile script')
    }

    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!isLoaded || !containerRef.current || !window.turnstile) return

    if (widgetIdRef.current) {
      try {
        window.turnstile.reset(widgetIdRef.current)
        return
      } catch (e) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch {}
        widgetIdRef.current = null
      }
    }

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

    try {
      const widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: handleSuccess,
        'error-callback': handleError,
        'expired-callback': handleExpire,
        theme: 'dark',
        size,
      })
      widgetIdRef.current = widgetId
    } catch (error) {
      console.error('Failed to render Turnstile widget:', error)
    }

    return () => {
      if (widgetIdRef.current && window.turnstile && !isMountedRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current)
          widgetIdRef.current = null
        } catch (e) {}
      }
    }
  }, [isLoaded, siteKey, size])

  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch (e) {}
        widgetIdRef.current = null
      }
    }
  }, [])

  return <div ref={containerRef} />
}
