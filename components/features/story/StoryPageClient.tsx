'use client'

import React, { useEffect } from 'react'

export const StoryPageClient: React.FC = () => {
  useEffect(() => {
    // Initialize AOS for story pages
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
            aosInstance.init({
              duration: 800,
              easing: 'ease-out',
              once: true,
              offset: 100,
            })
          } catch (error) {
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
            if (document.body && aosInstance.refresh) {
              aosInstance.refresh()
            }
          } catch (error) {
            // Silently handle refresh errors during cleanup
          }
        }
      }
    }
  }, [])

  return null
}
