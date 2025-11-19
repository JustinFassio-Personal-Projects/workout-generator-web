'use client'

import React from 'react'
import Image from 'next/image'
import { Star } from 'lucide-react'
import { Card } from '@/components/ui/Card/Card'
import { Testimonial } from '@/data/testimonials'
import styles from './Testimonials.module.scss'

export interface TestimonialCardProps {
  testimonial: Testimonial
}

export const TestimonialCard: React.FC<TestimonialCardProps> = ({ testimonial }) => {
  return (
    <Card variant="default" hover={true} className={styles.testimonialCard}>
      <div className={styles.rating}>
        {Array.from({ length: testimonial.rating }).map((_, i) => (
          <Star key={i} size={16} fill="currentColor" className={styles.star} />
        ))}
      </div>
      <p className={styles.quote}>&ldquo;{testimonial.quote}&rdquo;</p>
      <div className={styles.author}>
        <Image
          src={testimonial.avatar}
          alt={testimonial.name}
          width={48}
          height={48}
          className={styles.avatar}
        />
        <div className={styles.authorInfo}>
          <div className={styles.name}>{testimonial.name}</div>
          <div className={styles.role}>
            {testimonial.role}
            {testimonial.company && ` • ${testimonial.company}`}
          </div>
        </div>
      </div>
    </Card>
  )
}

