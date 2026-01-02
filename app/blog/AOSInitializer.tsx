'use client'

import { useEffect } from 'react'

export function AOSInitializer() {
  useEffect(() => {
    // Initialize AOS for blog pages
    // Wait for CSS to load before initializing to prevent timing issues
    if (typeof window !== 'undefined') {
      let aosInstance: any = null
      let isMounted = true

      // Function to initialize AOS after CSS is loaded
      const initAOS = () => {
        if (!isMounted) return

        import('aos').then(AOS => {
          if (!isMounted) return

          aosInstance = AOS.default
          try {
            // Check if AOS is already initialized
            if (!aosInstance.init) {
              return
            }
            aosInstance.init({
              duration: 800,
              easing: 'ease-out',
              once: true,
              offset: 100,
            })
          } catch (error) {
            // Handle initialization errors gracefully (log warning for debugging)
            console.warn('AOS initialization error:', error)
          }
        })
      }

      // Check if CSS is already loaded
      if ((window as any).__AOS_CSS_LOADED__) {
        initAOS()
      } else {
        // Wait for CSS to load
        const handleCSSLoaded = () => {
          initAOS()
          window.removeEventListener('aos-css-loaded', handleCSSLoaded)
        }
        window.addEventListener('aos-css-loaded', handleCSSLoaded)

        // Fallback: if event doesn't fire, wait a bit and try anyway
        setTimeout(() => {
          if (isMounted && !aosInstance) {
            initAOS()
          }
        }, 100)
      }

      // Cleanup function
      return () => {
        isMounted = false
        if (aosInstance && typeof window !== 'undefined') {
          try {
            // Only refresh if document body still exists
            if (document.body && aosInstance.refresh) {
              aosInstance.refresh()
            }
          } catch (error) {
            // Silently handle refresh errors during cleanup
            // This prevents errors when React has already removed DOM elements
            // Intentionally ignored - errors during cleanup are non-critical
          }
        }
      }
    }
  }, [])

  return null
}
