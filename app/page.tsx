'use client'

import { useEffect } from 'react'
import { Hero } from '@/components/landing/Hero/Hero'
import { Features } from '@/components/landing/Features/Features'
import { Journey } from '@/components/landing/Journey/Journey'
import { Testimonials } from '@/components/landing/Testimonials/Testimonials'
import { Videos } from '@/components/landing/Videos/Videos'
import { Blog } from '@/components/landing/Blog/Blog'
import { Pricing } from '@/components/landing/Pricing/Pricing'
import { Footer } from '@/components/landing/Footer/Footer'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://workoutgenerator.com'

export default function Home() {
  useEffect(() => {
    // Initialize AOS globally
    if (typeof window !== 'undefined') {
      let aosInstance: any = null
      let isMounted = true

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
            if (document.body) {
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

  // HomePage structured data (JSON-LD)
  const homepageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': baseUrl,
    name: 'Workout Generator - AI-Powered Fitness Plans',
    description:
      'Create personalized AI-powered workout plans tailored to your goals, fitness level, and equipment. Start your fitness journey today!',
    url: baseUrl,
    inLanguage: 'en-US',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Workout Generator',
      url: baseUrl,
    },
    about: {
      '@type': 'Thing',
      name: 'AI-Powered Fitness Plans',
      description: 'Personalized workout plans created using artificial intelligence',
    },
  }

  // BreadcrumbList structured data (JSON-LD) for homepage
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homepageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <main className="min-h-screen">
        <Hero />
        <Features />
        <Journey />
        <Testimonials />
        <Videos />
        <Blog />
        <Pricing />
        <Footer />
      </main>
    </>
  )
}
