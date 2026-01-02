'use client'

import React from 'react'
import { faqItems } from '@/data/faq'
import { Accordion } from '@/components/ui/Accordion/Accordion'
import type { AccordionItem } from '@/components/ui/Accordion/Accordion'
import { LogoWatermark } from '@/components/ui/LogoWatermark/LogoWatermark'
import { trackButtonClick } from '@/lib/analytics'
import styles from './FAQ.module.scss'

export const FAQ: React.FC = () => {
  const handleButtonClick = (buttonText: string) => {
    trackButtonClick(buttonText, 'faq')
    const workoutBuilderSection = document.getElementById('workout-builder')
    if (workoutBuilderSection) {
      workoutBuilderSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Map FAQ items to Accordion items with button handlers
  const accordionItems: AccordionItem[] = faqItems.map(item => ({
    id: item.id,
    question: item.question,
    answer: item.answer,
    buttonText: item.buttonText,
    onButtonClick: item.buttonText ? () => handleButtonClick(item.buttonText!) : undefined,
  }))

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
        <Accordion items={accordionItems} />
      </div>
    </section>
  )
}
