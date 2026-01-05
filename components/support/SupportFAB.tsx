'use client'

import React, { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import classNames from 'classnames'
import { TicketSubmissionForm } from './TicketSubmissionForm'
import styles from './SupportFAB.module.scss'

export const SupportFAB: React.FC = () => {
  const [isFormOpen, setIsFormOpen] = useState(false)

  const handleOpenForm = () => {
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
  }

  return (
    <>
      <button
        className={styles.fab}
        onClick={handleOpenForm}
        aria-label="Open feedback"
        type="button"
        data-aos="fade-up"
        data-aos-delay="300"
      >
        <MessageSquare className={styles.fabIcon} />
        <span className={styles.fabLabel}>Feedback</span>
      </button>

      <TicketSubmissionForm isOpen={isFormOpen} onClose={handleCloseForm} />
    </>
  )
}
