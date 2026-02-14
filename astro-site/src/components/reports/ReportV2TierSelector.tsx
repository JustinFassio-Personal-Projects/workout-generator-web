'use client'

import React, { useState } from 'react'
import styles from './ReportV2TierSelector.module.scss'

interface TierData {
  title: string
  icon: string
  desc: string
  pros: string[]
  cons: string[]
  verdict: string
}

const tierData: Record<number, TierData> = {
  1: {
    title: 'Tier 1: The Randomizer',
    icon: '🎲',
    desc: "These apps use simple randomization logic. Like shuffling a deck of cards, they pick 5 exercises for legs. It's fun for a week, but useless for training.",
    pros: ['High variety (never bored)', 'Zero setup time'],
    cons: ['No progressive overload', 'High injury risk (random volume)', 'No adaptation'],
    verdict: 'Avoid if you want results.',
  },
  2: {
    title: 'Tier 2: The LLM Wrapper',
    icon: '💬',
    desc: 'These connect directly to ChatGPT/Claude APIs. They can write a plan, but they don\'t "remember" your last workout stats to calculate the next one mathematically. They hallucinate weights.',
    pros: ['Natural language conversation', 'Good for general advice'],
    cons: ['Cannot track math/volume over time', 'Inconsistent suggestions', 'Generic advice'],
    verdict: 'Okay for beginners, bad for athletes.',
  },
  3: {
    title: 'Tier 3: True Adaptive System',
    icon: '🧠',
    desc: 'The gold standard. Uses AI to analyze your past performance (reps, RPE, fatigue) to calculate the exact weight and reps for today. It acts like a human coach, not a chatbot.',
    pros: [
      'Guaranteed Progressive Overload',
      'Auto-regulation (adjusts to bad days)',
      'Long-term periodization',
    ],
    cons: ['Higher learning curve', 'Requires data input'],
    verdict: 'The only choice for 2026.',
  },
}

export const ReportV2TierSelector: React.FC = () => {
  const [selectedTier, setSelectedTier] = useState<number>(3)

  const handleTierSelect = (tierId: number) => {
    setSelectedTier(tierId)
  }

  const data = tierData[selectedTier]

  return (
    <>
      <div className={styles.grid}>
        {[1, 2, 3].map(tierId => {
          const isActive = selectedTier === tierId
          return (
            <button
              key={tierId}
              onClick={() => handleTierSelect(tierId)}
              className={`${styles.tierButton} ${isActive ? styles.tierButtonActive : ''}`}
            >
              <div className={`${styles.tierLabel} ${isActive ? styles.tierLabelActive : ''}`}>
                Tier {tierId}
              </div>
              <h3 className={`${styles.tierTitle} ${isActive ? styles.tierTitleActive : ''}`}>
                {tierData[tierId].title.split(':')[1]?.trim() || tierData[tierId].title}
              </h3>
              <p className={`${styles.tierDesc} ${isActive ? styles.tierDescActive : ''}`}>
                {tierId === 1
                  ? '"Workout of the Day" Generators'
                  : tierId === 2
                    ? 'Chatbots & Text Prompts'
                    : 'Dynamic Algorithmic Systems'}
              </p>
            </button>
          )
        })}
      </div>

      <div className={styles.detailCard}>
        <div className={styles.detailHeader}>
          <div className={styles.iconContainer}>{data.icon}</div>
          <div>
            <h3 className={styles.detailTitle}>{data.title}</h3>
            <div className={styles.divider}></div>
          </div>
        </div>
        <p className={styles.detailDesc}>{data.desc}</p>
        <div className={styles.prosConsGrid}>
          <div>
            <h4 className={styles.prosTitle}>
              <span className={styles.checkmark}>✓</span> The Upside
            </h4>
            <ul className={styles.prosList}>
              {data.pros.map((pro, index) => (
                <li key={index} className={styles.prosItem}>
                  {pro}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className={styles.consTitle}>
              <span className={styles.crossmark}>✗</span> The Downside
            </h4>
            <ul className={styles.consList}>
              {data.cons.map((con, index) => (
                <li key={index} className={styles.consItem}>
                  {con}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className={styles.verdict}>
          <span className={styles.verdictLabel}>Expert Verdict:</span>
          <span className={styles.verdictBadge}>{data.verdict}</span>
        </div>
      </div>
    </>
  )
}
