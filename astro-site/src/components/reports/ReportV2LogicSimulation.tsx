import React, { useState, useRef } from 'react'
import styles from './ReportV2LogicSimulation.module.scss'

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

export const ReportV2LogicSimulation: React.FC = () => {
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

  const isStackedLayout = () => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768
  }

  const scrollToResults = () => {
    if (isStackedLayout() && resultsRef.current) {
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
      <div className={styles.buttonGrid}>
        <button
          onClick={() => runSimulation('missed')}
          className={`${styles.scenarioButton} ${
            selectedScenario === 'missed' ? styles.scenarioButtonActive : ''
          }`}
        >
          Scenario: "I Missed 3 Days"
        </button>
        <button
          onClick={() => runSimulation('pain')}
          className={`${styles.scenarioButton} ${
            selectedScenario === 'pain' ? styles.scenarioButtonActive : ''
          }`}
        >
          Scenario: "Knee Pain Today"
        </button>
        <button
          onClick={() => runSimulation('plateau')}
          className={`${styles.scenarioButton} ${
            selectedScenario === 'plateau' ? styles.scenarioButtonActive : ''
          }`}
        >
          Scenario: "Stalled on Bench Press"
        </button>
      </div>

      <div ref={resultsRef} className={styles.resultsGrid}>
        <div className={styles.resultCardBad}>
          <div className={styles.resultHeader}>
            <h3 className={styles.resultTitleBad}>Standard AI (Tier 1/2)</h3>
            <span className={styles.resultIcon}>🤖</span>
          </div>
          <div className={styles.resultContent}>
            {isTyping && !badText.includes('...') ? (
              <span className={styles.typing}>{badText}</span>
            ) : (
              badText
            )}
          </div>
        </div>

        <div className={styles.resultCardGood}>
          <div className={styles.resultHeader}>
            <h3 className={styles.resultTitleGood}>System AI (Tier 3)</h3>
            <span className={styles.resultIcon}>🧠</span>
          </div>
          <div className={styles.resultContentGood}>
            {isTyping && !goodText.includes('...') ? (
              <span className={styles.typing}>{goodText}</span>
            ) : (
              goodText
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
