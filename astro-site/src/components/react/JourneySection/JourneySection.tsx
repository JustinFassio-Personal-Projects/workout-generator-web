import { useState } from 'react'
import { UserPlus, Target, Dumbbell, CheckCircle2 } from 'lucide-react'
import { journeyStepData, type JourneyStepId } from '@/data/journey-adaptive'
import styles from './JourneySection.module.scss'

export function JourneySection() {
  const [selectedStep, setSelectedStep] = useState<JourneyStepId>('signup')
  const currentData = journeyStepData[selectedStep]

  return (
    <section id="journey" className={styles.journeySection}>
      <div className={styles.backgroundGlow} aria-hidden="true" />

      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.heading}>
            Your Fitness <span className={styles.highlight}>Journey Starts Here</span>
          </h2>
          <p className={styles.description}>
            Follow these simple steps to begin your transformation and achieve your fitness goals.
          </p>
        </div>

        <div className={styles.glassContainer}>
          <div className={styles.selectorTabs}>
            <button
              type="button"
              onClick={() => setSelectedStep('signup')}
              className={`${styles.tabButton} ${selectedStep === 'signup' ? styles.tabButtonActive : ''}`}
              aria-label="Sign Up & Set Goals"
              aria-pressed={selectedStep === 'signup'}
            >
              <UserPlus className={styles.buttonIcon} size={18} />
              <span className={styles.buttonText}>Sign Up & Set Goals</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedStep('plan')}
              className={`${styles.tabButton} ${selectedStep === 'plan' ? styles.tabButtonActive : ''}`}
              aria-label="Get Your Plan"
              aria-pressed={selectedStep === 'plan'}
            >
              <Target className={styles.buttonIcon} size={18} />
              <span className={styles.buttonText}>Get Your Plan</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedStep('training')}
              className={`${styles.tabButton} ${selectedStep === 'training' ? styles.tabButtonActive : ''}`}
              aria-label="Start Training"
              aria-pressed={selectedStep === 'training'}
            >
              <Dumbbell className={styles.buttonIcon} size={18} />
              <span className={styles.buttonText}>Start Training</span>
            </button>
          </div>

          <div className={styles.contentGrid}>
            <div className={styles.logicColumn}>
              <h3 className={styles.logicTitle}>{currentData.title}</h3>
              <p className={styles.logicDescription}>{currentData.desc}</p>

              <div className={styles.logicBox}>
                <h4 className={styles.logicBoxTitle}>What you get</h4>
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

            <div className={styles.stepsColumn}>
              <h4 className={styles.stepsTitle}>Detailed steps</h4>
              <div className={styles.stepList}>
                {currentData.steps.map((step, index) => (
                  <div key={index} className={styles.stepCard}>
                    <div className={styles.stepInfo}>
                      <p className={styles.stepName}>{step.title}</p>
                      <p className={styles.stepSubtitle}>{step.subtitle}</p>
                    </div>
                    <div className={styles.stepNumber}>{index + 1}</div>
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
