'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/Button/Button'
import { Drawer } from '@/components/ui/Drawer/Drawer'
import { trackButtonClick, trackNavigationClick, trackVercelEvent } from '@/lib/analytics'
import styles from './Navbar.module.scss'

export const Navbar: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [logoError, setLogoError] = useState(false)

  const toggleDrawer = () => {
    const newState = !isDrawerOpen
    setIsDrawerOpen(newState)
    trackVercelEvent('Menu Toggle', {
      action: newState ? 'open' : 'close',
      location: 'navbar',
    })
  }

  const closeDrawer = () => {
    setIsDrawerOpen(false)
    trackVercelEvent('Menu Toggle', {
      action: 'close',
      location: 'navbar',
    })
  }

  const handleNavClick = (destination: string, label: string) => {
    closeDrawer()
    trackNavigationClick(destination, 'nav_link', 'navbar', {
      link_label: label,
    })
  }

  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    closeDrawer()
    trackNavigationClick('#hero', 'nav_link', 'navbar', {
      link_label: 'Home',
    })
    // Check if we're on the home page
    if (typeof window !== 'undefined' && window.location.pathname === '/') {
      // Scroll to hero section
      const heroSection = document.getElementById('hero')
      if (heroSection) {
        heroSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    } else if (typeof window !== 'undefined') {
      // Navigate to home page, then scroll to hero
      window.location.href = '/#hero'
    }
  }

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    closeDrawer()
    trackNavigationClick('#workout-builder', 'nav_link', 'navbar', {
      link_label: 'Logo',
    })
    // Check if we're on the home page
    if (typeof window !== 'undefined' && window.location.pathname === '/') {
      // Scroll to workout-builder section (intro screen)
      const workoutBuilderSection = document.getElementById('workout-builder')
      if (workoutBuilderSection) {
        workoutBuilderSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    } else if (typeof window !== 'undefined') {
      // Navigate to home page, then scroll to workout-builder
      window.location.href = '/#workout-builder'
    }
  }

  const navLinks = (
    <>
      <a href="#hero" className={styles.navLink} onClick={handleHomeClick}>
        <Button variant="secondary" size="md" className={styles.button} type="button">
          Home
        </Button>
      </a>
      <Link href="/blog" className={styles.navLink} onClick={() => handleNavClick('/blog', 'Blog')}>
        <Button variant="secondary" size="md" className={styles.button} type="button">
          Blog
        </Button>
      </Link>
      <Link
        href="/exercise-challenge"
        className={styles.navLink}
        onClick={() => handleNavClick('/exercise-challenge', 'Submit an Exercise')}
      >
        <Button variant="secondary" size="md" className={styles.button} type="button">
          Submit an Exercise
        </Button>
      </Link>
    </>
  )

  const signInButton = (
    <div className={styles.signInButton}>
      <a
        href="https://aiworkoutgen.app/login"
        onClick={() => {
          closeDrawer()
          trackButtonClick('Sign In', 'navbar', { type: 'external_link' })
        }}
      >
        <Button variant="primary" size="md">
          Sign In
        </Button>
      </a>
    </div>
  )

  return (
    <>
      <nav className={styles.navbar} role="navigation" aria-label="Main navigation">
        <div className={styles.container}>
          {/* Logo */}
          <a href="#workout-builder" className={styles.logoLink} onClick={handleLogoClick}>
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
          </a>

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
