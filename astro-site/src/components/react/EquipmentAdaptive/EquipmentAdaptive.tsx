'use client'

import React, { useState } from 'react'
import { Dumbbell, Building2, User, CheckCircle2, Shield } from 'lucide-react'
import styles from './EquipmentAdaptive.module.scss'

type EquipmentType = 'gym' | 'dumbbells' | 'bodyweight'

interface EquipmentData {
  title: string
  desc: string
  logic: string[]
  exercises: Array<{
    name: string
    sets: string
    type: string
  }>
}

const equipmentData: Record<EquipmentType, EquipmentData> = {
  gym: {
    title: 'Optimal Hypertrophy',
    desc: 'Full gym access allows for the most stable and loadable exercises, maximizing mechanical tension on the muscle fibers.',
    logic: [
      'Barbell Bench: Highest loading potential for CNS adaptation',
      'Cable Fly: Constant tension profile at full extension',
      'Tricep Pushdown: Isolation for lateral head (impossible with free weights)',
    ],
    exercises: [
      { name: 'Barbell Bench Press', sets: '3-4', type: 'Compound' },
      { name: 'Incline Dumbbell Press', sets: '3', type: 'Compound' },
      { name: 'Cable Chest Fly', sets: '3', type: 'Isolation' },
      { name: 'Rope Tricep Pushdown', sets: '3', type: 'Isolation' },
    ],
  },
  dumbbells: {
    title: 'Home Gym Stability',
    desc: 'Focuses on unilateral movements to fix imbalances since barbell stability is absent. Volume is increased to compensate for lower absolute loads.',
    logic: [
      'DB Press: Increased range of motion vs Barbell',
      'Unilateral work: High core stabilization requirement',
      'Floor Press: Limits ROM to protect shoulders without a spotter',
    ],
    exercises: [
      { name: 'Flat Dumbbell Press', sets: '4', type: 'Compound' },
      { name: 'Incline DB Fly', sets: '3', type: 'Isolation' },
      { name: 'DB Skullcrushers', sets: '3', type: 'Isolation' },
      { name: 'Close Grip DB Press', sets: '3', type: 'Compound' },
    ],
  },
  bodyweight: {
    title: 'Calisthenic Overload',
    desc: 'Uses leverage manipulation and tempo control to create intensity without external load.',
    logic: [
      'Decline Pushups: Shifts weight to upper chest/shoulders',
      'Dips: Highest relative load compound movement',
      'Tempo: 3-1-1 cadence to increase Time Under Tension (TUT)',
    ],
    exercises: [
      { name: 'Weighted/Standard Dips', sets: '4', type: 'Compound' },
      { name: 'Decline Pushups', sets: '3', type: 'Compound' },
      { name: 'Diamond Pushups', sets: '3', type: 'Isolation' },
      { name: 'Bench Dips', sets: '3', type: 'Burnout' },
    ],
  },
}

export const EquipmentAdaptive: React.FC = () => {
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentType>('gym')
  const currentData = equipmentData[selectedEquipment]

  return (
    <section id="adaptive" className={styles.adaptiveSection}>
      <div className={styles.backgroundGlow} />
      <div className={styles.container}>
        <div className={styles.header} data-aos="fade-up">
          <h2 className={styles.heading}>Equipment Adaptive Engine</h2>
          <p className={styles.description}>
            Your environment dictates your training, not the other way around. Select a setup below
            to see how our AI adapts the exercise selection for a{' '}
            <span className={styles.highlight}>Chest & Triceps</span> session.
          </p>
        </div>
        <div className={styles.glassContainer} data-aos="fade-up" data-aos-delay="100">
          <div className={styles.selectorTabs}>
            <button
              type="button"
              onClick={() => setSelectedEquipment('gym')}
              className={`${styles.equipmentButton} ${selectedEquipment === 'gym' ? styles.equipmentButtonActive : ''}`}
              aria-label="Full Gym Equipment"
              aria-pressed={selectedEquipment === 'gym'}
            >
              <Building2 className={styles.buttonIcon} size={18} />
              <span className={styles.buttonText}>Full Gym</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedEquipment('dumbbells')}
              className={`${styles.equipmentButton} ${selectedEquipment === 'dumbbells' ? styles.equipmentButtonActive : ''}`}
              aria-label="Dumbbells Only"
              aria-pressed={selectedEquipment === 'dumbbells'}
            >
              <Dumbbell className={styles.buttonIcon} size={18} />
              <span className={styles.buttonText}>Dumbbells</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedEquipment('bodyweight')}
              className={`${styles.equipmentButton} ${selectedEquipment === 'bodyweight' ? styles.equipmentButtonActive : ''}`}
              aria-label="Bodyweight Only"
              aria-pressed={selectedEquipment === 'bodyweight'}
            >
              <User className={styles.buttonIcon} size={18} />
              <span className={styles.buttonText}>Bodyweight</span>
            </button>
          </div>
          <div className={styles.contentGrid}>
            <div className={styles.logicColumn}>
              <h3 className={styles.logicTitle}>{currentData.title}</h3>
              <p className={styles.logicDescription}>{currentData.desc}</p>
              <div className={styles.logicBox}>
                <h4 className={styles.logicBoxTitle}>AI Logic Check</h4>
                <ul className={styles.logicList}>
                  {currentData.logic.map((item, index) => (
                    <li key={index} className={styles.logicItem}>
                      <CheckCircle2 className={styles.checkIcon} size={16} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className={styles.previewColumn}>
              <div className={styles.previewHeader}>
                <h4 className={styles.previewTitle}>Generated Preview</h4>
                <span className={styles.verifiedBadge}>
                  <Shield className={styles.shieldIcon} size={12} />
                  Trainer Verified
                </span>
              </div>
              <div className={styles.exerciseList}>
                {currentData.exercises.map((exercise, index) => (
                  <div key={index} className={styles.exerciseCard}>
                    <div className={styles.exerciseInfo}>
                      <p className={styles.exerciseName}>{exercise.name}</p>
                      <p className={styles.exerciseMeta}>
                        {exercise.sets} Sets • {exercise.type}
                      </p>
                    </div>
                    <div className={styles.exerciseNumber}>{index + 1}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
