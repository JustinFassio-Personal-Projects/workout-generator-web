'use client'

import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import styles from './Accordion.module.scss'

export interface AccordionItem {
  id: string
  question: string
  answer: string
}

interface AccordionProps {
  items: AccordionItem[]
  defaultOpenId?: string
}

export const Accordion: React.FC<AccordionProps> = ({ items, defaultOpenId }) => {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? null)

  const toggleItem = (id: string) => {
    setOpenId(prevId => (prevId === id ? null : id))
  }

  return (
    <div className={styles.accordion}>
      {items.map((item, index) => {
        const isOpen = openId === item.id
        return (
          <div key={item.id} className={styles.item} data-aos="fade-up" data-aos-delay={index * 50}>
            <button
              id={`accordion-trigger-${item.id}`}
              className={styles.trigger}
              onClick={() => toggleItem(item.id)}
              aria-expanded={isOpen}
              aria-controls={`accordion-content-${item.id}`}
            >
              <span className={styles.question}>{item.question}</span>
              <ChevronDown
                className={`${styles.icon} ${isOpen ? styles.iconOpen : ''}`}
                size={24}
              />
            </button>
            <div
              id={`accordion-content-${item.id}`}
              className={`${styles.content} ${isOpen ? styles.contentOpen : ''}`}
              role="region"
              aria-labelledby={`accordion-trigger-${item.id}`}
            >
              <div className={styles.answer}>{item.answer}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
