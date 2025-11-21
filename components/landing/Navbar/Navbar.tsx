'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/Button/Button'
import { Drawer } from '@/components/ui/Drawer/Drawer'
import styles from './Navbar.module.scss'

export const Navbar: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [logoError, setLogoError] = useState(false)

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen)
  }

  const closeDrawer = () => {
    setIsDrawerOpen(false)
  }

  const handleNavClick = () => {
    closeDrawer()
  }

  const navLinks = (
    <>
      <Link href="/" className={styles.navLink} onClick={handleNavClick}>
        <Button variant="secondary" size="md" className={styles.button} type="button">
          Home
        </Button>
      </Link>
      <Link href="/blog" className={styles.navLink} onClick={handleNavClick}>
        <Button variant="secondary" size="md" className={styles.button} type="button">
          Blog
        </Button>
      </Link>
    </>
  )

  const signInButton = (
    <a
      href="https://members.fitcopilot.ai"
      target="_blank"
      rel="noopener noreferrer"
      className={styles.signInButton}
      onClick={handleNavClick}
    >
      <Button variant="primary" size="md">
        Sign In
      </Button>
    </a>
  )

  return (
    <>
      <nav className={styles.navbar} role="navigation" aria-label="Main navigation">
        <div className={styles.container}>
          {/* Logo */}
          <Link href="/" className={styles.logoLink}>
            <div className={styles.logo}>
              {!logoError ? (
                <Image
                  src="/logo.png"
                  alt="AI Workout Generator"
                  width={80}
                  height={80}
                  className={styles.logoImage}
                  unoptimized
                  style={{ backgroundColor: 'transparent' }}
                  onError={() => setLogoError(true)}
                  onLoad={e => {
                    const img = e.currentTarget
                    if (img.naturalWidth === 0) {
                      setLogoError(true)
                    }
                  }}
                />
              ) : (
                <span className={styles.logoText}>AI Workout Generator</span>
              )}
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className={styles.desktopNav}>
            <div className={styles.navLinks}>{navLinks}</div>
            {signInButton}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="secondary"
            size="md"
            className={`${styles.button} ${styles.menuButton}`}
            onClick={toggleDrawer}
            aria-label="Open menu"
            aria-expanded={isDrawerOpen}
          >
            Menu
          </Button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <Drawer isOpen={isDrawerOpen} onClose={closeDrawer}>
        <div className={styles.drawerContent}>
          <div className={styles.drawerSignIn}>{signInButton}</div>
          <div className={styles.drawerDivider} />
          <div className={styles.drawerNavLinks}>{navLinks}</div>
        </div>
      </Drawer>
    </>
  )
}
