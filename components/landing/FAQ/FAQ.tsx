'use client'

import React from 'react'
import { faqItems } from '@/data/faq'
import { Accordion } from '@/components/ui/Accordion/Accordion'
import { LogoWatermark } from '@/components/ui/LogoWatermark/LogoWatermark'
import styles from './FAQ.module.scss'

export const FAQ: React.FC = () => {
  return (
    <section id="faq" className={styles.faq}>
      <LogoWatermark position="top-right" opacity={0.04} size={300} rotation={-10} />
      <div className={styles.container}>
        <div className={styles.header} data-aos="fade-up">
          <h2 className={styles.title}>
            Frequently Asked
            <span className={styles.gradientText}> Questions</span>
          </h2>
          <p className={styles.subtitle}>Quick answers to help you get started with confidence.</p>
        </div>
        <Accordion items={faqItems} />
      </div>
    </section>
  )
}
