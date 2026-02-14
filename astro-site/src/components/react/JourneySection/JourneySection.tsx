'use client'

import React, { useState } from 'react'
import { UserPlus, Target, Dumbbell } from 'lucide-react'
import { CheckCircle2 } from 'lucide-react'
import styles from './JourneySection.module.scss'

type TabId = 'signup' | 'plan' | 'train'

const tabData: Record<
  TabId,
  { title: string; desc: string; logic: string[]; steps: { name: string; subtitle: string }[] }
> = {
  signup: {
    title: 'Sign Up & Set Goals',
    desc: 'Create your account and tell us about your fitness goals, experience level, and equipment.',
    logic: [
      'Quick 2-minute setup',
      'Goal customization',
      'Fitness level assessment',
      'Equipment preferences',
    ],
    steps: [
      { name: 'Create account', subtitle: 'Email or social' },
      { name: 'Select goals', subtitle: 'Strength, hypertrophy, etc.' },
      { name: 'Set level', subtitle: 'Beginner to advanced' },
    ],
  },
  plan: {
    title: 'Get Your Plan',
    desc: 'Our AI generates a personalized workout plan tailored to your goals and capabilities.',
    logic: [
      'AI-powered generation',
      'Personalized routines',
      'Adaptive difficulty',
      'Equipment-based options',
    ],
    steps: [
      { name: 'AI generates plan', subtitle: 'In seconds' },
      { name: 'Review & tweak', subtitle: 'Optional edits' },
      { name: 'Save or share', subtitle: 'Export or link' },
    ],
  },
  train: {
    title: 'Start Training',
    desc: 'Begin your fitness journey with guided workouts, exercise demos, and progress tracking.',
    logic: [
      'Step-by-step guidance',
      'Video demonstrations',
      'Form corrections',
      'Rest timer included',
    ],
    steps: [
      { name: 'Follow workout', subtitle: 'In app or PDF' },
      { name: 'Log performance', subtitle: 'Sets, reps, weight' },
      { name: 'Track progress', subtitle: 'Charts & history' },
    ],
  },
}

export const JourneySection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('signup')
  const current = tabData[activeTab]

  return (
    <section id="journey" className={styles.journeySection}>
      <div className={styles.backgroundGlow} />
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.heading}>
            Your Fitness <span className={styles.highlight}>Journey</span> Starts Here
          </h2>
          <p className={styles.description}>
            Follow these simple steps to begin your transformation and achieve your fitness goals.
          </p>
        </div>
        <div className={styles.glassContainer} data-aos="fade-up" data-aos-delay="100">
          <div className={styles.selectorTabs}>
            <button
              type="button"
              onClick={() => setActiveTab('signup')}
              className={`${styles.tabButton} ${activeTab === 'signup' ? styles.tabButtonActive : ''}`}
              aria-pressed={activeTab === 'signup'}
            >
              <UserPlus className={styles.buttonIcon} size={18} />
              <span className={styles.buttonText}>Sign Up</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('plan')}
              className={`${styles.tabButton} ${activeTab === 'plan' ? styles.tabButtonActive : ''}`}
              aria-pressed={activeTab === 'plan'}
            >
              <Target className={styles.buttonIcon} size={18} />
              <span className={styles.buttonText}>Get Plan</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('train')}
              className={`${styles.tabButton} ${activeTab === 'train' ? styles.tabButtonActive : ''}`}
              aria-pressed={activeTab === 'train'}
            >
              <Dumbbell className={styles.buttonIcon} size={18} />
              <span className={styles.buttonText}>Train</span>
            </button>
          </div>
          <div className={styles.contentGrid}>
            <div className={styles.logicColumn}>
              <h3 className={styles.logicTitle}>{current.title}</h3>
              <p className={styles.logicDescription}>{current.desc}</p>
              <div className={styles.logicBox}>
                <h4 className={styles.logicBoxTitle}>What you get</h4>
                <ul className={styles.logicList}>
                  {current.logic.map((item, i) => (
                    <li key={i} className={styles.logicItem}>
                      <CheckCircle2 className={styles.checkIcon} size={16} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className={styles.stepsColumn}>
              <h4 className={styles.stepsTitle}>Steps</h4>
              <ul className={styles.stepList}>
                {current.steps.map((step, i) => (
                  <li key={i} className={styles.stepCard}>
                    <div className={styles.stepInfo}>
                      <p className={styles.stepName}>{step.name}</p>
                      <p className={styles.stepSubtitle}>{step.subtitle}</p>
                    </div>
                    <div className={styles.stepNumber}>{i + 1}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
