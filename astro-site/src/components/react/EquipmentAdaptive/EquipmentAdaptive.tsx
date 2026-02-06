import { useState } from 'react'
import { Dumbbell, Building2, User, CheckCircle2, Shield } from 'lucide-react'
import { equipmentData, type EquipmentType } from '@/data/equipment-adaptive'
import styles from './EquipmentAdaptive.module.scss'

export function EquipmentAdaptive() {
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentType>('gym')
  const currentData = equipmentData[selectedEquipment]

  return (
    <section id="adaptive" className={styles.adaptiveSection}>
      <div className={styles.backgroundGlow} aria-hidden="true" />

      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.heading}>Equipment Adaptive Engine</h2>
          <p className={styles.description}>
            Your environment dictates your training, not the other way around. Select a setup below
            to see how our AI adapts the exercise selection for a{' '}
            <span className={styles.highlight}>Chest & Triceps</span> session.
          </p>
        </div>

        <div className={styles.glassContainer}>
          <div className={styles.selectorTabs}>
            <button
              type="button"
              onClick={() => setSelectedEquipment('gym')}
              className={`${styles.equipmentButton} ${
                selectedEquipment === 'gym' ? styles.equipmentButtonActive : ''
              }`}
              aria-label="Full Gym Equipment"
              aria-pressed={selectedEquipment === 'gym'}
            >
              <Building2 className={styles.buttonIcon} size={18} />
              <span className={styles.buttonText}>Full Gym</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedEquipment('dumbbells')}
              className={`${styles.equipmentButton} ${
                selectedEquipment === 'dumbbells' ? styles.equipmentButtonActive : ''
              }`}
              aria-label="Dumbbells Only"
              aria-pressed={selectedEquipment === 'dumbbells'}
            >
              <Dumbbell className={styles.buttonIcon} size={18} />
              <span className={styles.buttonText}>Dumbbells</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedEquipment('bodyweight')}
              className={`${styles.equipmentButton} ${
                selectedEquipment === 'bodyweight' ? styles.equipmentButtonActive : ''
              }`}
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
