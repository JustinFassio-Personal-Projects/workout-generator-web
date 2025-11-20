'use client'

import { useEffect } from 'react'

export function AOSInitializer() {
  useEffect(() => {
    // Initialize AOS for blog pages
    if (typeof window !== 'undefined') {
      import('aos').then(AOS => {
        AOS.default.init({
          duration: 800,
          easing: 'ease-out',
          once: true,
          offset: 100,
        })
      })
    }
  }, [])

  return null
}
