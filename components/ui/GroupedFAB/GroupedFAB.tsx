'use client'

import React, { useState, useRef, useEffect } from 'react'
import { HelpCircle, Brain, Headphones } from 'lucide-react'
import classNames from 'classnames'
import { ChatWidget } from '../ChatWidget/ChatWidget'
import { TicketSubmissionForm } from '@/components/support/TicketSubmissionForm'
import styles from './GroupedFAB.module.scss'

export const GroupedFAB: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const toggleExpansion = () => {
    setIsExpanded(prev => !prev)
  }

  const handleAskClick = () => {
    setIsExpanded(false)
    setIsChatOpen(true)
  }

  const handleFeedbackClick = () => {
    setIsExpanded(false)
    setIsFormOpen(true)
  }

  const handleCloseChat = () => {
    setIsChatOpen(false)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
  }

  // Close expansion on Escape key only (removed click-outside handler per user request)
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isExpanded) {
        setIsExpanded(false)
      }
    }

    if (isExpanded) {
      document.addEventListener('keydown', handleEscape)
      return () => {
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [isExpanded])

  return (
    <>
      <div ref={containerRef} className={styles.groupedFab}>
        {/* Main FAB Button */}
        <button
          className={classNames(styles.mainFab, {
            [styles.mainFabExpanded]: isExpanded,
          })}
          onClick={toggleExpansion}
          aria-label={isExpanded ? 'Close menu' : 'Open support menu'}
          aria-expanded={isExpanded}
          type="button"
          data-aos="fade-up"
          data-aos-delay="300"
        >
          <HelpCircle className={styles.mainFabIcon} />
        </button>

        {/* Radial Expansion Options */}
        {isExpanded && (
          <div className={styles.expansionMenu}>
            {/* Ask Option */}
            <button
              className={classNames(styles.optionButton, styles.optionAsk)}
              onClick={handleAskClick}
              aria-label="Ask AI assistant"
              type="button"
            >
              <Brain className={styles.optionIcon} />
              <span className={styles.optionLabel}>Ask</span>
            </button>

            {/* Feedback Option */}
            <button
              className={classNames(styles.optionButton, styles.optionFeedback)}
              onClick={handleFeedbackClick}
              aria-label="Submit feedback"
              type="button"
            >
              <Headphones className={styles.optionIcon} />
              <span className={styles.optionLabel}>Feedback</span>
            </button>
          </div>
        )}
      </div>

      {/* ChatWidget - controlled by GroupedFAB */}
      <ChatWidget
        key={`chat-${isChatOpen}`}
        showButton={false}
        defaultOpen={isChatOpen}
        onClose={handleCloseChat}
      />

      {/* TicketSubmissionForm - controlled by GroupedFAB */}
      <TicketSubmissionForm isOpen={isFormOpen} onClose={handleCloseForm} />
    </>
  )
}
