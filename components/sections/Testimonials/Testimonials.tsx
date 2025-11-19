'use client'

import React, { useEffect, useState, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { testimonials } from '@/data/testimonials'
import { TestimonialCard } from './TestimonialCard'
import styles from './Testimonials.module.scss'

export const Testimonials: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)
  const [itemsPerPage, setItemsPerPage] = useState(3)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const updateItemsPerPage = () => {
      if (typeof window !== 'undefined') {
        setItemsPerPage(window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1)
      }
    }

    updateItemsPerPage()
    window.addEventListener('resize', updateItemsPerPage)
    return () => window.removeEventListener('resize', updateItemsPerPage)
  }, [])

  const totalPages = Math.ceil(testimonials.length / itemsPerPage)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('aos').then((AOS) => {
        AOS.default.init({
          duration: 800,
          easing: 'ease-out',
          once: true,
        })
      })
    }
  }, [])

  useEffect(() => {
    if (isAutoPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % totalPages)
      }, 5000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isAutoPlaying, totalPages])

  const handlePrev = () => {
    setIsAutoPlaying(false)
    setCurrentIndex((prev) => (prev - 1 + totalPages) % totalPages)
  }

  const handleNext = () => {
    setIsAutoPlaying(false)
    setCurrentIndex((prev) => (prev + 1) % totalPages)
  }

  return (
    <section id="testimonials" className={styles.testimonials}>
      <div className={styles.container}>
        <div className={styles.header} data-aos="fade-up">
          <h2 className={styles.title}>
            Loved by
            <span className={styles.gradientText}> Thousands</span>
          </h2>
          <p className={styles.subtitle}>
            See what our community has to say about their fitness transformation journey.
          </p>
        </div>
        <div className={styles.carouselWrapper}>
          <button
            className={styles.navButton}
            onClick={handlePrev}
            aria-label="Previous testimonials"
          >
            <ChevronLeft size={24} />
          </button>
          <div className={styles.carousel}>
            <div
              className={styles.carouselTrack}
              style={{
                transform: `translateX(-${currentIndex * (100 / itemsPerPage)}%)`,
              }}
            >
              {testimonials.map((testimonial, index) => (
                <div
                  key={testimonial.id}
                  className={styles.carouselItem}
                  style={{
                    width: `${100 / itemsPerPage}%`,
                  }}
                  data-aos="fade-up"
                  data-aos-delay={(index % itemsPerPage) * 100}
                >
                  <TestimonialCard testimonial={testimonial} />
                </div>
              ))}
            </div>
          </div>
          <button
            className={styles.navButton}
            onClick={handleNext}
            aria-label="Next testimonials"
          >
            <ChevronRight size={24} />
          </button>
        </div>
        <div className={styles.dots}>
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              className={`${styles.dot} ${index === currentIndex ? styles['dot--active'] : ''}`}
              onClick={() => {
                setIsAutoPlaying(false)
                setCurrentIndex(index)
              }}
              aria-label={`Go to page ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

