'use client'

import { useEffect } from 'react'

export const AOSStyles: React.FC = () => {
  useEffect(() => {
    // Dynamically load AOS CSS to avoid render blocking
    // This will be code-split by Next.js and loaded asynchronously
    // @ts-ignore - CSS imports are handled by Next.js
    import('aos/dist/aos.css')
  }, [])

  return null
}
