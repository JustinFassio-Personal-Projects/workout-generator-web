'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Activity, Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import { Drawer } from '@/components/ui/Drawer/Drawer'
import { trackButtonClick, trackNavigationClick, trackVercelEvent } from '@/lib/analytics'
import styles from './Navbar.module.scss'

export const Navbar: React.FC = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Initialize from localStorage or system preference (client-side only)
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('theme')
        if (stored === 'dark' || stored === 'light') {
          return stored === 'dark'
        }
        // Check system preference
        return window.matchMedia('(prefers-color-scheme: dark)').matches
      } catch {
        // Fallback if localStorage is not available
        return true
      }
    }
    return true // Default for SSR
  })

  useEffect(() => {
    // Apply theme class and persist preference when state changes
    if (typeof window === 'undefined') return

    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      localStorage.setItem('theme', isDarkMode ? 'dark' : 'light')
    } catch {
      // Silently fail if localStorage or DOM manipulation fails
    }
  }, [isDarkMode])

  useEffect(() => {
    // Initialize theme synchronously on mount to prevent flash
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem('theme')
      if (stored === 'dark' || stored === 'light') {
        const shouldBeDark = stored === 'dark'
        if (shouldBeDark) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
        // Sync state if it differs from initial state
        setIsDarkMode(prev => (prev !== shouldBeDark ? shouldBeDark : prev))
      } else {
        // No stored preference, check system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        if (prefersDark) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
        // Sync state if it differs from initial state
        setIsDarkMode(prev => (prev !== prefersDark ? prefersDark : prev))
      }
    } catch {
      // Silently fail if localStorage or DOM manipulation fails
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const navLinkBaseClasses =
    'inline-flex items-center justify-center p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-brand-green transition-colors border border-slate-200 dark:border-white/10 shadow-sm text-sm font-medium px-4 whitespace-nowrap'

  const navLinks = (
    <>
      <a href="#hero" onClick={handleHomeClick} className={navLinkBaseClasses}>
        Home
      </a>
      <Link
        href="/blog"
        onClick={() => handleNavClick('/blog', 'Blog')}
        className={navLinkBaseClasses}
      >
        Blog
      </Link>
      <Link
        href="/exercise-challenge"
        onClick={() => handleNavClick('/exercise-challenge', 'Submit an Exercise')}
        className={navLinkBaseClasses}
      >
        Submit an Exercise
      </Link>
    </>
  )

  const drawerNavLinks = (
    <>
      <a
        href="#hero"
        onClick={handleHomeClick}
        className={`${navLinkBaseClasses} w-full justify-center`}
      >
        Home
      </a>
      <Link
        href="/blog"
        onClick={() => handleNavClick('/blog', 'Blog')}
        className={`${navLinkBaseClasses} w-full justify-center`}
      >
        Blog
      </Link>
      <Link
        href="/exercise-challenge"
        onClick={() => handleNavClick('/exercise-challenge', 'Submit an Exercise')}
        className={`${navLinkBaseClasses} w-full justify-center`}
      >
        Submit an Exercise
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
      <header
        className="border-b border-slate-200 dark:border-white/10 sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-brand-dark/60 transition-colors"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between">
          {/* Logo */}
          <a
            href="#workout-builder"
            onClick={handleLogoClick}
            className="flex items-center gap-3 md:gap-4 group"
          >
            <div className="relative scale-90 md:scale-100">
              <div className="absolute inset-0 bg-brand-green blur-lg opacity-20 dark:opacity-40 group-hover:opacity-60 transition-opacity"></div>
              <div className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-white/10 relative z-10 shadow-sm dark:shadow-none">
                <Activity className="w-6 h-6 text-brand-green dark:text-brand-lime" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg md:text-2xl tracking-tight text-slate-900 dark:text-white leading-none">
                AI Workout{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-green to-brand-lime">
                  Generator
                </span>
              </span>
              <span className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-medium">
                AI-Powered Fitness Plans
              </span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="flex items-center gap-2">{navLinks}</div>
            {signInButton}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-brand-green transition-colors border border-slate-200 dark:border-white/10 shadow-sm"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-brand-green transition-colors border border-slate-200 dark:border-white/10 shadow-sm"
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleDrawer}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-brand-green transition-colors border border-slate-200 dark:border-white/10 shadow-sm text-sm font-medium px-4"
              aria-label="Open menu"
              aria-expanded={isDrawerOpen}
            >
              Menu
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <Drawer isOpen={isDrawerOpen} onClose={closeDrawer}>
        <div className="flex flex-col w-full">
          <div className="w-full mb-4">{signInButton}</div>
          <div className="h-px bg-slate-200 dark:bg-white/10 my-4"></div>
          <div className="flex flex-col gap-2 w-full">{drawerNavLinks}</div>
        </div>
      </Drawer>
    </>
  )
}
