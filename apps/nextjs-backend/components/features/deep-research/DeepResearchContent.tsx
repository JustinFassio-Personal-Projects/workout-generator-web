'use client'

import React, { useRef, useEffect } from 'react'
import Script from 'next/script'
import styles from './DeepResearchContent.module.scss'

interface DeepResearchContentProps {
  htmlContent: string
}

const CHART_JS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js'

/**
 * Renders pasted HTML content. Loads Chart.js and executes inline scripts
 * for admin-trusted content that uses charts/interactivity.
 */
export function DeepResearchContent({ htmlContent }: DeepResearchContentProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const scriptsExecutedRef = useRef(false)

  useEffect(() => {
    if (!wrapperRef.current || scriptsExecutedRef.current) return
    const wrapper = wrapperRef.current

    const runScripts = () => {
      if (scriptsExecutedRef.current) return
      scriptsExecutedRef.current = true

      const scripts = Array.from(wrapper.querySelectorAll('script'))
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script')
        if (oldScript.src) {
          newScript.src = oldScript.src
          newScript.async = false
          document.body.appendChild(newScript)
        } else if (oldScript.textContent) {
          const prevOnload = (window as unknown as { onload?: () => void }).onload
          newScript.textContent = oldScript.textContent
          document.body.appendChild(newScript)
          // Pasted Chart.js scripts often use window.onload = fn; but the doc is already
          // loaded, so the event never fires. Invoke the handler and restore previous.
          const handler = (window as unknown as { onload?: () => void }).onload
          ;(window as unknown as { onload?: () => void }).onload = prevOnload
          if (typeof handler === 'function') handler()
          document.body.removeChild(newScript)
        }
      })
    }

    if (typeof (window as unknown as { Chart?: unknown }).Chart !== 'undefined') {
      runScripts()
    } else {
      const checkChart = setInterval(() => {
        if (typeof (window as unknown as { Chart?: unknown }).Chart !== 'undefined') {
          clearInterval(checkChart)
          runScripts()
        }
      }, 50)
      return () => clearInterval(checkChart)
    }
  }, [htmlContent])

  return (
    <>
      <Script src={CHART_JS_URL} strategy="afterInteractive" />
      <div
        ref={wrapperRef}
        className={styles.wrapper}
        role="article"
        aria-label="Article content"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </>
  )
}
