'use client'

import { useEffect } from 'react'

export const AOSStyles: React.FC = () => {
  useEffect(() => {
    // Dynamically load AOS CSS to avoid render blocking
    // This will be code-split by Next.js and loaded asynchronously
    // @ts-expect-error Next.js handles CSS imports at build time; TypeScript does not understand CSS modules here
    import('aos/dist/aos.css')
  }, [])

  return null
}
