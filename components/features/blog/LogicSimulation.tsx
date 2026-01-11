'use client'

import React, { useState, useRef, useEffect } from 'react'
import styles from './BlogPostContentInteractive.module.scss'

interface Scenario {
  bad: string
  good: string
}

const scenarios: Record<string, Scenario> = {
  missed: {
    bad: 'Takes you to "Day 4" of the plan anyway, forcing you to do heavy squats after 3 days of sedentary stiffness. Risk of injury: High.',
    good: 'Detects the 72h gap. Automatically inserts a "Re-activation" warmup, reduces load by 5% to re-acclimate nervous system, and pushes the cycle back. Maintains momentum.',
  },
  pain: {
    bad: 'Suggests: "Just skip the leg exercises." Leaves you with a 15-minute workout and no volume compensation.',
    good: 'Recalculates session: Swaps Squats (high knee stress) for Glute Bridges and RDLs (posterior chain focus). Maintains training volume without aggravating the joint.',
  },
  plateau: {
    bad: 'Generates the same workout again: "Try harder this time." No strategy change.',
    good: 'Analyzes last 4 sessions. Identifies stall. Switches progression model from Linear to Wave Loading for 2 weeks to break through the sticking point.',
  },
}

export const LogicSimulation: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null)
  const [badText, setBadText] = useState<string>('Select a scenario above to see the response...')
  const [goodText, setGoodText] = useState<string>('Select a scenario above to see the response...')
  const [isTyping, setIsTyping] = useState<boolean>(false)
  const resultsRef = useRef<HTMLDivElement>(null)

  const typeWriter = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    text: string,
    i: number
  ) => {
    if (i < text.length) {
      setter(text.substring(0, i + 1))
      setTimeout(() => typeWriter(setter, text, i + 1), 20)
    }
  }

  // Check if screen is mobile/tablet (where containers stack)
  const isStackedLayout = () => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768 // Match the grid breakpoint
  }

  // Scroll to results on mobile/tablet when scenario is selected
  const scrollToResults = () => {
    if (isStackedLayout() && resultsRef.current) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 100)
    }
  }

  const runSimulation = (type: string) => {
    setSelectedScenario(type)
    setIsTyping(true)
    setBadText('Analyzing...')
    setGoodText('Computing biometric adjustment...')

    // Scroll to results on mobile/tablet
    scrollToResults()

    setTimeout(() => {
      const data = scenarios[type]
      setBadText('')
      setGoodText('')
      typeWriter(setBadText, data.bad, 0)
      setTimeout(() => typeWriter(setGoodText, data.good, 0), 400)
      setTimeout(() => setIsTyping(false), 2000)
    }, 500)
  }

  return (
    <div>
      <div
        className={`${styles.grid} ${styles.gridCols3}`}
        style={{ marginBottom: 'var(--spacing-xl)' }}
      >
        <button
          onClick={() => runSimulation('missed')}
          className={styles.card}
          style={{
            textAlign: 'center',
            cursor: 'pointer',
            background:
              selectedScenario === 'missed' ? 'var(--glass-bg-hover)' : 'var(--glass-bg-base)',
            borderColor:
              selectedScenario === 'missed' ? 'var(--color-accent)' : 'var(--glass-border-base)',
          }}
        >
          Scenario: "I Missed 3 Days"
        </button>
        <button
          onClick={() => runSimulation('pain')}
          className={styles.card}
          style={{
            textAlign: 'center',
            cursor: 'pointer',
            background:
              selectedScenario === 'pain' ? 'var(--glass-bg-hover)' : 'var(--glass-bg-base)',
            borderColor:
              selectedScenario === 'pain' ? 'var(--color-accent)' : 'var(--glass-border-base)',
          }}
        >
          Scenario: "Knee Pain Today"
        </button>
        <button
          onClick={() => runSimulation('plateau')}
          className={styles.card}
          style={{
            textAlign: 'center',
            cursor: 'pointer',
            background:
              selectedScenario === 'plateau' ? 'var(--glass-bg-hover)' : 'var(--glass-bg-base)',
            borderColor:
              selectedScenario === 'plateau' ? 'var(--color-accent)' : 'var(--glass-border-base)',
          }}
        >
          Scenario: "Stalled on Bench Press"
        </button>
      </div>

      <div ref={resultsRef} className={`${styles.grid} ${styles.gridCols2}`}>
        <div
          className={styles.card}
          style={{
            background: 'var(--bg-dark-secondary)',
            borderColor: 'rgba(239, 68, 68, 0.3)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--spacing-lg)',
            }}
          >
            <h3
              style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-error-light)',
              }}
            >
              Standard AI (Tier 1/2)
            </h3>
            <span style={{ fontSize: 'var(--font-size-2xl)' }}>🤖</span>
          </div>
          <div
            style={{
              color: 'var(--text-secondary)',
              minHeight: '120px',
              fontSize: 'var(--font-size-sm)',
              lineHeight: 'var(--line-height-relaxed)',
            }}
          >
            {isTyping && !badText.includes('...') ? (
              <span style={{ animation: 'pulse 1s ease-in-out infinite' }}>{badText}</span>
            ) : (
              badText
            )}
          </div>
        </div>

        <div
          className={styles.card}
          style={{
            background: 'rgba(22, 163, 74, 0.1)',
            borderColor: 'rgba(22, 163, 74, 0.3)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '64px',
              height: '64px',
              background: 'var(--color-primary-600)',
              filter: 'blur(48px)',
              opacity: 0.2,
            }}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--spacing-lg)',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <h3
              style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-bold)',
                color: 'var(--color-primary-400)',
              }}
            >
              System AI (Tier 3)
            </h3>
            <span style={{ fontSize: 'var(--font-size-2xl)' }}>🧠</span>
          </div>
          <div
            style={{
              color: 'rgba(255, 255, 255, 0.9)',
              minHeight: '120px',
              fontSize: 'var(--font-size-sm)',
              lineHeight: 'var(--line-height-relaxed)',
              position: 'relative',
              zIndex: 1,
            }}
          >
            {isTyping && !goodText.includes('...') ? (
              <span style={{ animation: 'pulse 1s ease-in-out infinite' }}>{goodText}</span>
            ) : (
              goodText
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
