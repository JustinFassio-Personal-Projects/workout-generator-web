'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { HelpCircle, Headphones } from 'lucide-react'
// import { Brain } from 'lucide-react' // Disabled: ChatKit not configured
import classNames from 'classnames'
// import { ChatWidget } from '../ChatWidget/ChatWidget' // Disabled: ChatKit not configured
import { TicketSubmissionForm } from '@/components/support/TicketSubmissionForm'
import styles from './GroupedFAB.module.scss'

export const GroupedFAB: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false)
  // const [isChatOpen, setIsChatOpen] = useState(false) // Disabled: ChatKit not configured
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Ensure we only render portal on client side
  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleExpansion = () => {
    setIsExpanded(prev => !prev)
  }

  // const handleAskClick = () => {
  //   setIsExpanded(false)
  //   setIsChatOpen(true)
  // } // Disabled: ChatKit not configured

  const handleSupportClick = () => {
    setIsExpanded(false)
    setIsFormOpen(true)
  }

  // const handleCloseChat = () => {
  //   setIsChatOpen(false)
  // } // Disabled: ChatKit not configured

  const handleCloseForm = () => {
    setIsFormOpen(false)
    // Force repaint by toggling a CSS property to ensure FAB is visible after modal closes
    if (containerRef.current) {
      containerRef.current.style.transform = 'translateZ(0.1px)'
      requestAnimationFrame(() => {
        if (containerRef.current) {
          containerRef.current.style.transform = ''
        }
      })
    }
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

  const fabContent = (
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
          // Removed data-aos attributes - AOS was causing the FAB to disappear after modal closes
        >
          <HelpCircle className={styles.mainFabIcon} />
        </button>

        {/* Radial Expansion Options */}
        {isExpanded && (
          <div className={styles.expansionMenu}>
            {/* Ask Option - Disabled: ChatKit not configured */}
            {/* <button
              className={classNames(styles.optionButton, styles.optionAsk)}
              onClick={handleAskClick}
              aria-label="Ask AI assistant"
              type="button"
            >
              <Brain className={styles.optionIcon} />
              <span className={styles.optionLabel}>Ask</span>
            </button> */}

            {/* Support Option */}
            <button
              className={classNames(styles.optionButton, styles.optionFeedback)}
              onClick={handleSupportClick}
              aria-label="Get support"
              type="button"
            >
              <Headphones className={styles.optionIcon} />
              <span className={styles.optionLabel}>Support</span>
            </button>
          </div>
        )}
      </div>

      {/* ChatWidget - Disabled: ChatKit not configured */}
      {/* <ChatWidget
        key="chat-widget"
        showButton={false}
        defaultOpen={isChatOpen}
        onClose={handleCloseChat}
      /> */}

      {/* TicketSubmissionForm - controlled by GroupedFAB */}
      <TicketSubmissionForm isOpen={isFormOpen} onClose={handleCloseForm} />
    </>
  )

  // Render FAB in a portal at document.body level to ensure it's always on top
  if (!mounted) {
    return null
  }

  return createPortal(fabContent, document.body)
}
