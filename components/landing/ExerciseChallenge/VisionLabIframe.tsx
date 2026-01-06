'use client'

import React, { useEffect, useRef } from 'react'
import { analytics } from '@/lib/analytics'
import styles from './VisionLabIframe.module.scss'

interface VisionLabIframeProps {
  leadId: string
  onGenerationStarted?: (prompt?: string) => void
  onGenerationCompleted?: () => void
}

export const VisionLabIframe: React.FC<VisionLabIframeProps> = ({
  leadId,
  onGenerationStarted,
  onGenerationCompleted,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    analytics.trackVisionIframeLoaded(leadId)

    // Phase 2: Listen for postMessage events from iframe
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      const allowedOrigin = 'https://fitcopilot-677566904576.us-west1.run.app'
      if (event.origin !== allowedOrigin) {
        return
      }

      // Handle different message types
      if (event.data.type === 'VISION_ANALYSIS_STARTED') {
        const prompt = event.data.prompt || ''
        const promptLength = prompt.length

        analytics.trackVisionGenerationStarted(leadId, promptLength)

        // Trigger micro-interview start
        if (onGenerationStarted) {
          onGenerationStarted(prompt)
        }
      } else if (event.data.type === 'VISION_ANALYSIS_COMPLETED') {
        const prompt = event.data.prompt || ''
        const framework = event.data.framework
        const level = event.data.level

        analytics.trackVisionGenerationCompleted(leadId)

        // Notify parent of completion
        if (onGenerationCompleted) {
          onGenerationCompleted()
        }
      }
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [leadId, onGenerationStarted, onGenerationCompleted])

  return (
    <div className={styles.container}>
      <div className={styles.howItWorks}>
        <h3 className={styles.howItWorksTitle}>How it works</h3>
        <div className={styles.steps}>
          <div className={styles.step}>
            <span className={styles.stepNumber}>1</span>
            <span className={styles.stepText}>Input exercise name</span>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNumber}>2</span>
            <span className={styles.stepText}>Choose experience level</span>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNumber}>3</span>
            <span className={styles.stepText}>Select image style</span>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNumber}>4</span>
            <span className={styles.stepText}>Submit exercise for imogen</span>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNumber}>5</span>
            <span className={styles.stepText}>Review image</span>
          </div>
          <div className={styles.step}>
            <span className={styles.stepNumber}>6</span>
            <span className={styles.stepText}>Enhance or submit</span>
          </div>
        </div>
      </div>

      <div className={styles.iframeWrapper}>
        <iframe
          ref={iframeRef}
          src="https://fitcopilot-677566904576.us-west1.run.app/"
          className={styles.iframe}
          title="Fitcopilot Vision Lab"
          allow="camera; microphone"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
    </div>
  )
}
