/**
 * Flag Tracking Utilities
 * Utilities for emitting feature flags to the DOM for Vercel Web Analytics
 */

import { FLAG_NAMES, type FlagName } from './flags'

/**
 * Emit a feature flag to the DOM so Vercel Web Analytics can detect it
 * Flags are emitted as data attributes that Web Analytics automatically reads
 *
 * @param flagName - The name of the flag (kebab-case)
 * @param value - The value of the flag (boolean or string)
 */
export const emitFlagToDOM = (flagName: string, value: boolean | string): void => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    // Check if flag element already exists
    const existingFlag = document.querySelector(`[data-vercel-flag="${flagName}"]`)

    if (existingFlag) {
      // Update existing flag value
      existingFlag.setAttribute('data-vercel-flag-value', String(value))
    } else {
      // Create new flag element
      const flagElement = document.createElement('div')
      flagElement.setAttribute('data-vercel-flag', flagName)
      flagElement.setAttribute('data-vercel-flag-value', String(value))
      flagElement.style.display = 'none' // Hide from view
      document.body.appendChild(flagElement)
    }
  } catch (error) {
    console.warn('Failed to emit flag to DOM:', error)
  }
}

/**
 * Remove a flag from the DOM
 *
 * @param flagName - The name of the flag to remove
 */
export const removeFlagFromDOM = (flagName: string): void => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const flagElement = document.querySelector(`[data-vercel-flag="${flagName}"]`)
    if (flagElement) {
      flagElement.remove()
    }
  } catch (error) {
    console.warn('Failed to remove flag from DOM:', error)
  }
}

/**
 * Get all flags currently in the DOM
 *
 * @returns Array of flag names currently in the DOM
 */
export const getFlagsFromDOM = (): string[] => {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const flagElements = document.querySelectorAll('[data-vercel-flag]')
    return Array.from(flagElements)
      .map(el => el.getAttribute('data-vercel-flag'))
      .filter((name): name is string => !!name)
  } catch (error) {
    console.warn('Failed to get flags from DOM:', error)
    return []
  }
}

/**
 * Store flag in localStorage for persistence across page loads
 *
 * @param flagName - The name of the flag
 * @param value - The value of the flag
 */
export const storeFlagInLocalStorage = (flagName: FlagName, value: boolean | string): void => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const key = `vercel-flag-${flagName}`
    localStorage.setItem(key, String(value))
  } catch (error) {
    console.warn('Failed to store flag in localStorage:', error)
  }
}

/**
 * Retrieve flag from localStorage
 *
 * @param flagName - The name of the flag
 * @returns The flag value or null if not found
 */
export const getFlagFromLocalStorage = (flagName: FlagName): string | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const key = `vercel-flag-${flagName}`
    return localStorage.getItem(key)
  } catch (error) {
    console.warn('Failed to get flag from localStorage:', error)
    return null
  }
}

/**
 * Restore flags from localStorage and emit them to DOM
 * Call this on page load to restore flags from previous sessions
 */
export const restoreFlagsFromLocalStorage = (): void => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    Object.values(FLAG_NAMES).forEach(flagName => {
      const storedValue = getFlagFromLocalStorage(flagName)
      if (storedValue !== null) {
        emitFlagToDOM(flagName, storedValue)
      }
    })
  } catch (error) {
    console.warn('Failed to restore flags from localStorage:', error)
  }
}
