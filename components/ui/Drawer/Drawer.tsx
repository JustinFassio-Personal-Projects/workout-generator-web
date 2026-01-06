'use client'

import React, { useEffect, useRef } from 'react'
import classNames from 'classnames'
import styles from './Drawer.module.scss'

export interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
}

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, children, title }) => {
  const drawerRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousFocusRef.current = document.activeElement as HTMLElement

      // Focus the drawer when it opens
      setTimeout(() => {
        drawerRef.current?.focus()
      }, 100)

      // Prevent body scroll when drawer is open
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'

      // Handle escape key
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose()
        }
      }

      document.addEventListener('keydown', handleEscape)

      return () => {
        document.removeEventListener('keydown', handleEscape)
        document.body.style.overflow = originalOverflow
        // Restore focus when drawer closes
        previousFocusRef.current?.focus()
      }
    } else {
      // Restore body scroll when drawer closes
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  return (
    <>
      {/* Overlay backdrop */}
      <div
        className={classNames(styles.overlay, {
          [styles['overlay--visible']]: isOpen,
        })}
        onClick={onClose}
        aria-hidden={!isOpen}
        data-testid="drawer-overlay"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={classNames(styles.drawer, {
          [styles['drawer--open']]: isOpen,
        })}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'drawer-title' : undefined}
        aria-hidden={!isOpen}
        tabIndex={-1}
      >
        {title && (
          <div className={styles.header}>
            <h2 id="drawer-title" className={styles.title}>
              {title}
            </h2>
            <button
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close drawer"
              type="button"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        )}
        <div className={styles.content}>{children}</div>
      </div>
    </>
  )
}
