'use client'

import { useEffect } from 'react'
import { Hero } from '@/components/landing/Hero/Hero'
import { Features } from '@/components/landing/Features/Features'
import { Journey } from '@/components/landing/Journey/Journey'
import { Testimonials } from '@/components/landing/Testimonials/Testimonials'
import { Pricing } from '@/components/landing/Pricing/Pricing'
import { Footer } from '@/components/landing/Footer/Footer'

export default function Home() {
  useEffect(() => {
    // Initialize AOS globally
    if (typeof window !== 'undefined') {
      import('aos').then((AOS) => {
        AOS.default.init({
          duration: 800,
          easing: 'ease-out',
          once: true,
          offset: 100,
        })
      })
    }
  }, [])

  return (
    <main className="min-h-screen">
      <Hero />
      <Features />
      <Journey />
      <Testimonials />
      <Pricing />
      <Footer />
    </main>
  )
}

