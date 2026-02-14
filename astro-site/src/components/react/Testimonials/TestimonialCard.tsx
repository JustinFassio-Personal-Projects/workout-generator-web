'use client'

import React from 'react'
import { Star } from 'lucide-react'
import type { Testimonial } from '@/data/testimonials'
import styles from './Testimonials.module.scss'

export interface TestimonialCardProps {
  testimonial: Testimonial
}

export const TestimonialCard: React.FC<TestimonialCardProps> = ({ testimonial }) => {
  return (
    <div className={styles.testimonialCard}>
      <div className={styles.rating}>
        {Array.from({ length: testimonial.rating }).map((_, i) => (
          <Star key={i} size={16} fill="currentColor" className={styles.star} />
        ))}
      </div>
      {testimonial.title && <h4 className={styles.title}>{testimonial.title}</h4>}
      <p className={styles.quote}>&ldquo;{testimonial.quote}&rdquo;</p>
      <div className={styles.author}>
        <div className={styles.authorInfo}>
          <div className={styles.name}>{testimonial.name}</div>
          <div className={styles.role}>
            {testimonial.role}
            {testimonial.company && ` • ${testimonial.company}`}
          </div>
        </div>
      </div>
    </div>
  )
}
