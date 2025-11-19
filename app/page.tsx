'use client'

import { useEffect } from 'react'
import { Hero } from '@/components/sections/Hero/Hero'
import { Features } from '@/components/sections/Features/Features'
import { Journey } from '@/components/sections/Journey/Journey'
import { Testimonials } from '@/components/sections/Testimonials/Testimonials'
import { Pricing } from '@/components/sections/Pricing/Pricing'
import { Footer } from '@/components/sections/Footer/Footer'

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

