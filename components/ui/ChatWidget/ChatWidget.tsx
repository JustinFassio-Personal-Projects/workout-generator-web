'use client'

import React, { useState, useEffect } from 'react'
import { ChatKit, useChatKit } from '@openai/chatkit-react'
import { MessageCircle, X, Minimize2 } from 'lucide-react'
import classNames from 'classnames'
import { trackVercelEvent } from '@/lib/analytics'
import styles from './ChatWidget.module.scss'
import type { ChatWidgetProps } from './types'

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  workflowId,
  userId,
  defaultOpen = false,
  showButton = true,
  onClose,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  // Sync with defaultOpen prop changes
  useEffect(() => {
    setIsOpen(defaultOpen)
  }, [defaultOpen])
  const [isMinimized, setIsMinimized] = useState(false)
  const [isChatKitReady, setIsChatKitReady] = useState(false)
  const [isWebComponentLoaded, setIsWebComponentLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get configuration from props or environment variables
  // Note: NEXT_PUBLIC_ vars are embedded at BUILD TIME, not runtime
  // If this is empty in production, the env var was missing during build
  const chatkitWorkflowId = workflowId || process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID || ''

  // Wait for ChatKit web component to be defined
  // The ChatKit React library should automatically load the web component
  useEffect(() => {
    if (typeof window === 'undefined' || !chatkitWorkflowId) return

    const checkWebComponent = async () => {
      // Check if already defined
      if (customElements.get('openai-chatkit')) {
        setIsWebComponentLoaded(true)
        return
      }

      // Wait for it to be defined (ChatKit React should load it automatically)
      try {
        // Wait up to 5 seconds for the web component to be defined
        await Promise.race([
          customElements.whenDefined('openai-chatkit'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
        ])
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
  }, [chatkitWorkflowId])

  // Initialize ChatKit hook with HostedApiConfig
  // Use a dummy config if no workflow ID to satisfy hooks rules
  const chatKit = useChatKit({
    api: {
      getClientSecret: async (currentClientSecret: string | null) => {
        // If we have a current secret and it's still valid, return it
        if (currentClientSecret) {
          return currentClientSecret
        }

        // Create a new session by calling our API endpoint with the workflow ID
        if (!chatkitWorkflowId) {
          throw new Error('Workflow ID is required')
        }

        try {
          const res = await fetch('/api/chatkit-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workflowId: chatkitWorkflowId,
              userId: userId || 'anonymous',
            }),
          })

          if (!res.ok) {
            const errorData = await res.json().catch(() => ({}))
            const errorMessage =
              errorData.message ||
              errorData.error ||
              `Failed to create ChatKit session: ${res.status}`

            // Set error state for display
            setError(errorMessage)
            setIsChatKitReady(false)

            // Log detailed error for debugging
            console.error('ChatKit session creation failed:', {
              status: res.status,
              error: errorData,
              workflowId: chatkitWorkflowId,
            })

            throw new Error(errorMessage)
          }

          const data = await res.json()
          if (!data.client_secret) {
            const errorMsg = 'No client_secret in response'
            setError(errorMsg)
            setIsChatKitReady(false)
            throw new Error(errorMsg)
          }

          // Clear any previous errors on success
          setError(null)
          return data.client_secret
        } catch (error) {
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
      // Handle errors and show them to the user
      const errorMessage = event.error.message || 'ChatKit initialization failed'
      setError(errorMessage)
      setIsChatKitReady(false)
      console.error('ChatKit error:', event.error)

      // Check for domain verification errors specifically
      if (errorMessage.includes('DomainVerificationRequestError') || errorMessage.includes('401')) {
        setError(
          'Domain verification required. Please verify your production domain in OpenAI ChatKit dashboard.'
        )
      }
    },
    onReady: () => {
      // ChatKit is ready
      setIsChatKitReady(true)
    },
    onThreadChange: () => {
      // Thread changed - no action needed
    },
  })

  const toggleChat = () => {
    const newState = !isOpen
    setIsOpen(newState)
    setIsMinimized(false)
    trackVercelEvent('Chat Widget Interaction', {
      action: newState ? 'open' : 'close',
      location: 'chat_widget',
    })
    // Notify parent when chat is closed
    if (!newState && onClose) {
      onClose()
    }
  }

  const minimizeChat = () => {
    setIsMinimized(true)
    trackVercelEvent('Chat Widget Interaction', {
      action: 'minimize',
      location: 'chat_widget',
    })
  }

  const maximizeChat = () => {
    setIsMinimized(false)
    trackVercelEvent('Chat Widget Interaction', {
      action: 'maximize',
      location: 'chat_widget',
    })
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

  // Don't render if no workflow ID is provided (check after all hooks)
  if (!chatkitWorkflowId) {
    // Log in both development and production for troubleshooting
    if (typeof window !== 'undefined') {
      console.warn(
        '[ChatWidget] NEXT_PUBLIC_CHATKIT_WORKFLOW_ID is not set. Chat widget will not be displayed.'
      )
    }
    return null
  }

  return (
    <div className={classNames(styles.chatWidget, className)}>
      {/* Floating Button - only show if showButton prop is true */}
      {showButton && !isOpen && (
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
              {error ? (
                <div className={styles.errorState}>
                  <p className={styles.errorTitle}>Unable to load chat</p>
                  <p className={styles.errorMessage}>{error}</p>
                  <button
                    className={styles.retryButton}
                    onClick={() => {
                      setError(null)
                      setIsChatKitReady(false)
                      // Force re-initialization by closing and reopening the chat
                      // This will trigger a new getClientSecret call
                      setIsOpen(false)
                      setTimeout(() => {
                        setIsOpen(true)
                      }, 100)
                    }}
                    type="button"
                  >
                    Retry
                  </button>
                </div>
              ) : chatKit.control ? (
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
