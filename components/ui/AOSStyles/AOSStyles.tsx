'use client'

import { useEffect } from 'react'

export const AOSStyles: React.FC = () => {
  useEffect(() => {
    // Dynamically load AOS CSS to avoid render blocking
    // This will be code-split by Next.js and loaded asynchronously
    // We set a flag when CSS is loaded so AOS.init() can wait for it
    if (typeof window !== 'undefined') {
      // Check if CSS is already loaded
      if ((window as any).__AOS_CSS_LOADED__) {
        return
      }

      // Load CSS and set flag when complete
      // @ts-expect-error Next.js handles CSS imports at build time; TypeScript does not understand CSS modules here
      import('aos/dist/aos.css')
        .then(() => {
          // CSS is loaded, set a flag that AOS.init() can check
          ;(window as any).__AOS_CSS_LOADED__ = true
          // Dispatch event for any components waiting for CSS
          window.dispatchEvent(new Event('aos-css-loaded'))
        })
        .catch(() => {
          // Even if import fails, set flag to not block AOS initialization
          ;(window as any).__AOS_CSS_LOADED__ = true
          window.dispatchEvent(new Event('aos-css-loaded'))
        })
    }
  }, [])

  return null
}
