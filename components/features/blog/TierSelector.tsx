'use client'

import React, { useState } from 'react'
import styles from './BlogPostContentInteractive.module.scss'

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

export const TierSelector: React.FC = () => {
  const [selectedTier, setSelectedTier] = useState<number>(3)

  const handleTierSelect = (tierId: number) => {
    setSelectedTier(tierId)
  }

  const data = tierData[selectedTier]

  return (
    <>
      <div className={`${styles.grid} ${styles.gridCols3}`}>
        {[1, 2, 3].map(tierId => {
          const isActive = selectedTier === tierId
          return (
            <button
              key={tierId}
              onClick={() => handleTierSelect(tierId)}
              className={styles.card}
              style={{
                border: isActive
                  ? '2px solid var(--color-orange)'
                  : '2px solid var(--glass-border-base)',
                background: isActive ? 'rgba(255, 165, 0, 0.1)' : 'var(--glass-bg-base)',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: isActive ? 'var(--color-orange)' : 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 'var(--spacing-sm)',
                }}
              >
                Tier {tierId}
              </div>
              <h3
                style={{
                  fontSize: 'var(--font-size-xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: isActive ? 'var(--color-orange)' : 'var(--text-primary)',
                  marginBottom: 'var(--spacing-sm)',
                }}
              >
                {tierData[tierId].title.split(':')[1]?.trim() || tierData[tierId].title}
              </h3>
              <p
                style={{
                  color: isActive ? 'var(--color-orange-medium)' : 'var(--text-tertiary)',
                  fontSize: 'var(--font-size-sm)',
                }}
              >
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

      <div
        className={styles.card}
        style={{
          marginTop: 'var(--spacing-xl)',
          background: 'var(--glass-bg-hover)',
        }}
      >
        <div style={{ padding: 'var(--spacing-xl)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-lg)',
              marginBottom: 'var(--spacing-xl)',
            }}
          >
            <div
              style={{
                fontSize: 'var(--font-size-4xl)',
                background: 'var(--glass-bg-base)',
                padding: 'var(--spacing-md)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              {data.icon}
            </div>
            <div>
              <h3
                style={{
                  fontSize: 'var(--font-size-2xl)',
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--text-primary)',
                  marginBottom: 'var(--spacing-sm)',
                }}
              >
                {data.title}
              </h3>
              <div
                style={{
                  height: '4px',
                  width: '80px',
                  background: 'var(--color-orange)',
                  borderRadius: 'var(--radius-full)',
                }}
              />
            </div>
          </div>
          <p
            style={{
              fontSize: 'var(--font-size-lg)',
              color: 'var(--text-secondary)',
              marginBottom: 'var(--spacing-xl)',
              lineHeight: 'var(--line-height-relaxed)',
            }}
          >
            {data.desc}
          </p>
          <div className={`${styles.grid} ${styles.gridCols2}`}>
            <div>
              <h4
                style={{
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-orange)',
                  marginBottom: 'var(--spacing-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-sm)',
                }}
              >
                <span>✓</span> The Upside
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {data.pros.map((pro, idx) => (
                  <li
                    key={idx}
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: 'var(--font-size-sm)',
                      borderLeft: '2px solid rgba(22, 163, 74, 0.3)',
                      paddingLeft: 'var(--spacing-md)',
                      marginBottom: 'var(--spacing-sm)',
                    }}
                  >
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4
                style={{
                  fontWeight: 'var(--font-weight-bold)',
                  color: 'var(--color-error)',
                  marginBottom: 'var(--spacing-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-sm)',
                }}
              >
                <span>✗</span> The Downside
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {data.cons.map((con, idx) => (
                  <li
                    key={idx}
                    style={{
                      color: 'var(--text-secondary)',
                      fontSize: 'var(--font-size-sm)',
                      borderLeft: '2px solid rgba(239, 68, 68, 0.3)',
                      paddingLeft: 'var(--spacing-md)',
                      marginBottom: 'var(--spacing-sm)',
                    }}
                  >
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div
            style={{
              marginTop: 'var(--spacing-xl)',
              paddingTop: 'var(--spacing-xl)',
              borderTop: '1px solid var(--glass-border-base)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontWeight: 'var(--font-weight-bold)', color: 'var(--text-primary)' }}>
              Expert Verdict:
            </span>
            <span
              style={{
                padding: 'var(--spacing-sm) var(--spacing-lg)',
                background: 'var(--bg-dark-secondary)',
                color: 'var(--text-primary)',
                fontSize: 'var(--font-size-sm)',
                borderRadius: 'var(--radius-lg)',
                fontWeight: 'var(--font-weight-medium)',
              }}
            >
              {data.verdict}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
