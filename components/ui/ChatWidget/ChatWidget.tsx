'use client'

import React, { useState, useEffect } from 'react'
import { ChatKit, useChatKit } from '@openai/chatkit-react'
import { MessageCircle, X, Minimize2 } from 'lucide-react'
import classNames from 'classnames'
import styles from './ChatWidget.module.scss'
import type { ChatWidgetProps } from './types'

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  workflowId,
  userId,
  defaultOpen = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isChatKitReady, setIsChatKitReady] = useState(false)
  const [isWebComponentLoaded, setIsWebComponentLoaded] = useState(false)

  // Get configuration from props or environment variables
  const chatkitWorkflowId = workflowId || process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID || ''

  // Wait for ChatKit web component to be defined
  // The ChatKit React library should automatically load the web component
  useEffect(() => {
    if (typeof window === 'undefined') return

    const checkWebComponent = async () => {
      // Check if already defined
      if (customElements.get('openai-chatkit')) {
        console.log('ChatKit web component already defined')
        setIsWebComponentLoaded(true)
        return
      }

      // Wait for it to be defined (ChatKit React should load it automatically)
      console.log('Waiting for ChatKit web component to be defined...')
      try {
        // Wait up to 5 seconds for the web component to be defined
        await Promise.race([
          customElements.whenDefined('openai-chatkit'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
        ])
        console.log('ChatKit web component defined!')
        setIsWebComponentLoaded(true)
      } catch (err) {
        console.warn('ChatKit web component not defined after waiting:', err)
        // Set to true anyway - ChatKit React component should handle loading it
        setIsWebComponentLoaded(true)
      }
    }

    // Check immediately and also after a short delay
    checkWebComponent()
    const timeout = setTimeout(checkWebComponent, 500)

    return () => clearTimeout(timeout)
  }, [])

  // Initialize ChatKit hook with HostedApiConfig
  const chatKit = useChatKit({
    api: {
      getClientSecret: async (currentClientSecret: string | null) => {
        console.log('ChatKit getClientSecret called', {
          currentClientSecret: currentClientSecret ? 'exists' : 'null',
        })

        // If we have a current secret and it's still valid, return it
        if (currentClientSecret) {
          console.log('Using existing client secret')
          return currentClientSecret
        }

        // Create a new session by calling our API endpoint with the workflow ID
        if (!chatkitWorkflowId) {
          console.error('Workflow ID is missing!')
          throw new Error('Workflow ID is required')
        }

        console.log('Fetching new client secret for workflow:', chatkitWorkflowId)
        try {
          const res = await fetch('/api/chatkit-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workflowId: chatkitWorkflowId,
              userId: userId || 'anonymous',
            }),
          })

          console.log('ChatKit session API response status:', res.status)

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}))
            console.error('ChatKit session API error:', errorData)
            throw new Error(errorData.error || `Failed to create ChatKit session: ${res.status}`)
          }

          const data = await res.json()
          console.log(
            'ChatKit client secret received:',
            data.client_secret ? 'Secret received (hidden)' : 'No secret in response'
          )
          if (!data.client_secret) {
            throw new Error('No client_secret in response')
          }
          return data.client_secret
        } catch (error) {
          console.error('Error fetching ChatKit client secret:', error)
          setIsChatKitReady(false)
          throw error
        }
      },
    },
    // Set theme to dark to match the site design
    theme: {
      colorScheme: 'dark',
    },
    // Configure composer to ensure input field is visible
    composer: {
      placeholder: 'Type your message...',
    },
    // Keep ChatKit's header enabled - it's needed for proper rendering
    // We'll style it to match our design
    header: {
      enabled: true,
      title: {
        enabled: false, // Hide ChatKit's title since we have our own
      },
    },
    onError: (event: { error: Error }) => {
      // Handle errors
      console.error('ChatKit error:', event.error)
      console.error('ChatKit error details:', JSON.stringify(event, null, 2))
    },
    onReady: () => {
      // ChatKit is ready
      console.log('ChatKit ready', chatkitWorkflowId ? `(Workflow: ${chatkitWorkflowId})` : '')
      setIsChatKitReady(true)
    },
    onThreadChange: (event: { threadId: string | null }) => {
      console.log('ChatKit thread changed:', event.threadId)
    },
  })

  const toggleChat = () => {
    setIsOpen(!isOpen)
    setIsMinimized(false)
  }

  const minimizeChat = () => {
    setIsMinimized(true)
  }

  const maximizeChat = () => {
    setIsMinimized(false)
  }

  // Prevent body scroll when chat is open (on mobile)
  useEffect(() => {
    if (isOpen && !isMinimized && typeof window !== 'undefined') {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'

      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen, isMinimized])

  // Debug: Log when chat opens and check if web component is mounted
  useEffect(() => {
    if (isOpen && !isMinimized && chatKit.control) {
      console.log('Chat widget opened, workflow ID:', chatkitWorkflowId)
      console.log('ChatKit control:', chatKit.control)
      console.log('Web component defined?', customElements.get('openai-chatkit') ? 'YES' : 'NO')

      // Check if the web component is in the DOM and properly initialized
      const checkInitialization = () => {
        const webComponent = document.querySelector('openai-chatkit')
        if (webComponent) {
          const hasShadowRoot = !!webComponent.shadowRoot
          const hasContent =
            webComponent.children.length > 0 || (webComponent.shadowRoot?.children.length ?? 0) > 0

          console.log('Web component status:', {
            found: true,
            hasShadowRoot,
            hasContent,
            children: webComponent.children.length,
            shadowChildren: webComponent.shadowRoot?.children.length ?? 0,
          })

          // If web component exists but isn't initialized, the ChatKit React component should handle it
          // But we can log for debugging
          if (!hasShadowRoot && !hasContent) {
            console.warn(
              'Web component found but not initialized - ChatKit React should handle this'
            )
          }
        } else {
          console.warn('openai-chatkit element not found in DOM')
        }
      }

      // Check after a short delay to allow ChatKit to initialize
      setTimeout(checkInitialization, 500)
      setTimeout(checkInitialization, 2000)
    }
  }, [isOpen, isMinimized, chatkitWorkflowId, chatKit.control])

  // Don't render if no workflow ID is provided
  if (!chatkitWorkflowId) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        'ChatWidget: NEXT_PUBLIC_CHATKIT_WORKFLOW_ID is not set. Chat widget will not be displayed.'
      )
    }
    return null
  }

  return (
    <div className={classNames(styles.chatWidget, className)}>
      {/* Floating Button */}
      {!isOpen && (
        <button
          className={styles.chatButton}
          onClick={toggleChat}
          aria-label="Open chat"
          type="button"
          data-aos="fade-up"
          data-aos-delay="300"
        >
          <MessageCircle className={styles.chatButtonIcon} />
          <span className={styles.chatButtonBadge} aria-hidden="true" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={classNames(styles.chatWindow, {
            [styles['chatWindow--minimized']]: isMinimized,
          })}
          role="dialog"
          aria-modal="true"
          aria-label="Chat assistant"
        >
          {/* Header */}
          <div className={styles.chatHeader}>
            <div className={styles.chatHeaderContent}>
              <h3 className={styles.chatTitle}>Chat with us</h3>
              <p className={styles.chatSubtitle}>We&apos;re here to help</p>
            </div>
            <div className={styles.chatHeaderActions}>
              {!isMinimized && (
                <button
                  className={styles.chatHeaderButton}
                  onClick={minimizeChat}
                  aria-label="Minimize chat"
                  type="button"
                >
                  <Minimize2 size={18} />
                </button>
              )}
              <button
                className={styles.chatHeaderButton}
                onClick={toggleChat}
                aria-label="Close chat"
                type="button"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Chat Content */}
          {!isMinimized && (
            <div className={styles.chatContent}>
              {chatKit.control ? (
                <ChatKit
                  key={`chatkit-${isOpen}-${chatkitWorkflowId}`}
                  control={chatKit.control}
                  className={styles.chatKit}
                />
              ) : (
                <div className={styles.loadingState}>
                  <p>Initializing chat...</p>
                </div>
              )}
            </div>
          )}

          {/* Minimized State - Show button to maximize */}
          {isMinimized && (
            <button
              className={styles.maximizeButton}
              onClick={maximizeChat}
              aria-label="Maximize chat"
              type="button"
            >
              <MessageCircle size={20} />
              <span>Chat</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
