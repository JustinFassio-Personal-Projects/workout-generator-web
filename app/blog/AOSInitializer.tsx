'use client'

import { useEffect } from 'react'

export function AOSInitializer() {
  useEffect(() => {
    // Initialize AOS for blog pages
    if (typeof window !== 'undefined') {
      let aosInstance: any = null
      let isMounted = true

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
