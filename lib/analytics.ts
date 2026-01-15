/**
 * Analytics utility functions for Google Analytics 4, Google Tag Manager, and Vercel Analytics
 * Provides type-safe event tracking helpers
 */

import { track } from '@vercel/analytics'

declare global {
  interface Window {
    dataLayer: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

// Google Analytics 4 Event Types
export interface GA4Event {
  event_name: string
  event_params?: Record<string, unknown>
}

// Google Tag Manager Event
export interface GTMEvent {
  event: string
  [key: string]: unknown
}

/**
 * Check if Google Analytics is available
 */
export const isGA4Available = (): boolean => {
  return typeof window !== 'undefined' && typeof window.gtag === 'function'
}

/**
 * Check if Google Tag Manager is available
 */
export const isGTMAvailable = (): boolean => {
  return typeof window !== 'undefined' && Array.isArray(window.dataLayer)
}

/**
 * Track a Google Analytics 4 event
 * @param eventName - The name of the event
 * @param eventParams - Optional event parameters
 */
export const trackGA4Event = (eventName: string, eventParams?: Record<string, unknown>): void => {
  if (!isGA4Available()) {
    console.warn('Google Analytics 4 is not available')
    return
  }

  if (window.gtag) {
    window.gtag('event', eventName, eventParams || {})
  }
}

/**
 * Track a Google Tag Manager event
 * @param eventName - The name of the event
 * @param eventData - Optional event data
 */
export const trackGTMEvent = (eventName: string, eventData?: Record<string, unknown>): void => {
  if (!isGTMAvailable()) {
    console.warn('Google Tag Manager is not available')
    return
  }

  window.dataLayer.push({
    event: eventName,
    ...eventData,
  })
}

/**
 * Track an event to both GA4 and GTM
 * @param eventName - The name of the event
 * @param eventData - Optional event data
 */
export const trackEvent = (eventName: string, eventData?: Record<string, unknown>): void => {
  trackGA4Event(eventName, eventData)
  trackGTMEvent(eventName, eventData)
}

/**
 * Track a page view (useful for client-side navigation)
 * @param path - The page path
 * @param title - Optional page title
 */
export const trackPageView = (path: string, title?: string): void => {
  if (isGA4Available() && window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_ID || '', {
      page_path: path,
      page_title: title,
    })
  }

  if (isGTMAvailable()) {
    window.dataLayer.push({
      event: 'page_view',
      page_path: path,
      page_title: title,
    })
  }
}

/**
 * Track a Vercel Analytics event
 * @param eventName - The name of the event (max 255 characters)
 * @param data - Optional event data (flat object with string, number, boolean, or null values)
 * @param flags - Optional array of flag names to attach to this event
 */
export const trackVercelEvent = (
  eventName: string,
  data?: Record<string, string | number | boolean | null>,
  flags?: string[]
): void => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    // Use track with flags option if flags are provided
    if (flags && flags.length > 0) {
      track(eventName, data, { flags })
    } else {
      track(eventName, data)
    }
  } catch (error) {
    console.warn('Failed to track Vercel Analytics event:', error)
  }
}

/**
 * Track a button click event
 * @param buttonName - The name/identifier of the button
 * @param location - Where the button is located (e.g., 'hero', 'navbar', 'footer')
 * @param metadata - Additional metadata about the button click
 */
export const trackButtonClick = (
  buttonName: string,
  location: string,
  metadata?: Record<string, string | number | boolean | null>
): void => {
  trackVercelEvent('Button Click', {
    button_name: buttonName,
    location,
    ...metadata,
  })
}

/**
 * Track scroll depth milestone
 * @param percentage - The scroll depth percentage (25, 50, 75, or 100)
 * @param pagePath - Optional current page path
 */
export const trackScrollDepth = (percentage: number, pagePath?: string): void => {
  const path = pagePath || (typeof window !== 'undefined' ? window.location.pathname : '')
  trackVercelEvent('Page Scroll', {
    scroll_depth: percentage,
    page_path: path,
  })
}

/**
 * Track a navigation click event
 * @param destination - The destination URL or path
 * @param type - Type of navigation (e.g., 'nav_link', 'footer_link')
 * @param location - Where the navigation link is located
 * @param metadata - Additional metadata
 */
export const trackNavigationClick = (
  destination: string,
  type: string,
  location: string,
  metadata?: Record<string, string | number | boolean | null>
): void => {
  trackVercelEvent('Navigation Click', {
    destination,
    type,
    location,
    ...metadata,
  })
}

/**
 * Track a form submission event
 * @param formName - The name/identifier of the form
 * @param metadata - Additional metadata about the form submission
 */
export const trackFormSubmission = (
  formName: string,
  metadata?: Record<string, string | number | boolean | null>
): void => {
  trackVercelEvent('Form Submission', {
    form_name: formName,
    ...metadata,
  })
}

/**
 * Track when a video starts playing
 * @param videoId - The unique identifier of the video
 * @param videoTitle - The title of the video
 * @param videoCategory - The category of the video
 * @param location - Where the video is located (e.g., 'videos_section')
 */
export const trackVideoStart = (
  videoId: string,
  videoTitle: string,
  videoCategory: string,
  location: string = 'videos_section'
): void => {
  trackVercelEvent('Video Start', {
    video_id: videoId,
    video_title: videoTitle.substring(0, 255), // Ensure within limit
    video_category: videoCategory,
    location,
  })
}

/**
 * Track when a video enters viewport (becomes visible)
 * @param videoId - The unique identifier of the video
 * @param videoTitle - The title of the video
 * @param videoCategory - The category of the video
 * @param location - Where the video is located (e.g., 'videos_section')
 */
export const trackVideoView = (
  videoId: string,
  videoTitle: string,
  videoCategory: string,
  location: string = 'videos_section'
): void => {
  trackVercelEvent('Video View', {
    video_id: videoId,
    video_title: videoTitle.substring(0, 255), // Ensure within limit
    video_category: videoCategory,
    location,
  })
}

/**
 * Track video progress milestones (25%, 50%, 75%, 100%)
 * @param videoId - The unique identifier of the video
 * @param videoTitle - The title of the video
 * @param videoCategory - The category of the video
 * @param progressPercentage - The progress percentage (25, 50, 75, or 100)
 * @param durationWatched - Duration watched in seconds
 * @param totalDuration - Total duration in seconds (optional)
 */
export const trackVideoProgress = (
  videoId: string,
  videoTitle: string,
  videoCategory: string,
  progressPercentage: number,
  durationWatched: number,
  totalDuration?: number
): void => {
  const metadata: Record<string, string | number | boolean | null> = {
    video_id: videoId,
    video_title: videoTitle.substring(0, 255), // Ensure within limit
    video_category: videoCategory,
    progress_percentage: Math.round(progressPercentage),
    duration_watched: Math.round(durationWatched),
  }

  if (totalDuration !== undefined) {
    metadata.total_duration = Math.round(totalDuration)
  }

  trackVercelEvent('Video Progress', metadata)
}

/**
 * Track when a video completes
 * @param videoId - The unique identifier of the video
 * @param videoTitle - The title of the video
 * @param videoCategory - The category of the video
 * @param totalDuration - Total duration in seconds
 */
export const trackVideoComplete = (
  videoId: string,
  videoTitle: string,
  videoCategory: string,
  totalDuration: number
): void => {
  trackVercelEvent('Video Complete', {
    video_id: videoId,
    video_title: videoTitle.substring(0, 255), // Ensure within limit
    video_category: videoCategory,
    total_duration: Math.round(totalDuration),
    completion_percentage: 100,
  })
}

/**
 * Track when a video is paused
 * @param videoId - The unique identifier of the video
 * @param videoTitle - The title of the video
 * @param videoCategory - The category of the video
 * @param pauseTime - Time when paused in seconds
 * @param progressPercentage - Progress percentage when paused
 */
export const trackVideoPause = (
  videoId: string,
  videoTitle: string,
  videoCategory: string,
  pauseTime: number,
  progressPercentage: number
): void => {
  trackVercelEvent('Video Pause', {
    video_id: videoId,
    video_title: videoTitle.substring(0, 255), // Ensure within limit
    video_category: videoCategory,
    pause_time: Math.round(pauseTime),
    progress_percentage: Math.round(progressPercentage),
  })
}

/**
 * Track when a video resumes after pause
 * @param videoId - The unique identifier of the video
 * @param videoTitle - The title of the video
 * @param videoCategory - The category of the video
 * @param resumeTime - Time when resumed in seconds
 * @param progressPercentage - Progress percentage when resumed
 */
export const trackVideoResume = (
  videoId: string,
  videoTitle: string,
  videoCategory: string,
  resumeTime: number,
  progressPercentage: number
): void => {
  trackVercelEvent('Video Resume', {
    video_id: videoId,
    video_title: videoTitle.substring(0, 255), // Ensure within limit
    video_category: videoCategory,
    resume_time: Math.round(resumeTime),
    progress_percentage: Math.round(progressPercentage),
  })
}

/**
 * Common event tracking functions for common use cases
 */
export const analytics = {
  // CTA clicks
  trackCTAClick: (ctaName: string, location: string) => {
    trackEvent('cta_click', {
      cta_name: ctaName,
      location,
    })
    trackButtonClick(ctaName, location)
  },

  // Blog interactions
  trackBlogPostView: (postSlug: string, postTitle: string) => {
    trackEvent('blog_post_view', {
      post_slug: postSlug,
      post_title: postTitle,
    })
  },

  trackBlogPostClick: (postSlug: string, postTitle: string) => {
    trackEvent('blog_post_click', {
      post_slug: postSlug,
      post_title: postTitle,
    })
    trackVercelEvent('Blog Post Click', {
      post_slug: postSlug,
      post_title: postTitle.substring(0, 255), // Ensure within limit
      location: 'blog_card',
    })
  },

  // Feature interactions
  trackFeatureClick: (featureName: string) => {
    trackEvent('feature_click', {
      feature_name: featureName,
    })
  },

  // Pricing interactions
  trackPricingPlanClick: (planName: string, planPrice: number) => {
    trackEvent('pricing_plan_click', {
      plan_name: planName,
      plan_price: planPrice,
    })
    trackVercelEvent('Pricing Plan Click', {
      plan_name: planName,
      plan_price: planPrice,
      location: 'pricing',
    })
  },

  // Chat widget interactions
  trackChatOpen: () => {
    trackEvent('chat_open')
    trackVercelEvent('Chat Widget Interaction', {
      action: 'open',
      location: 'chat_widget',
    })
  },

  trackChatMessage: (messageLength: number) => {
    trackEvent('chat_message', {
      message_length: messageLength,
    })
  },

  // Video interactions
  trackVideoStart: (
    videoId: string,
    videoTitle: string,
    videoCategory: string,
    location?: string
  ) => {
    trackVideoStart(videoId, videoTitle, videoCategory, location)
  },

  trackVideoView: (
    videoId: string,
    videoTitle: string,
    videoCategory: string,
    location?: string
  ) => {
    trackVideoView(videoId, videoTitle, videoCategory, location)
  },

  trackVideoProgress: (
    videoId: string,
    videoTitle: string,
    videoCategory: string,
    progressPercentage: number,
    durationWatched: number,
    totalDuration?: number
  ) => {
    trackVideoProgress(
      videoId,
      videoTitle,
      videoCategory,
      progressPercentage,
      durationWatched,
      totalDuration
    )
  },

  trackVideoComplete: (
    videoId: string,
    videoTitle: string,
    videoCategory: string,
    totalDuration: number
  ) => {
    trackVideoComplete(videoId, videoTitle, videoCategory, totalDuration)
  },

  trackVideoPause: (
    videoId: string,
    videoTitle: string,
    videoCategory: string,
    pauseTime: number,
    progressPercentage: number
  ) => {
    trackVideoPause(videoId, videoTitle, videoCategory, pauseTime, progressPercentage)
  },

  trackVideoResume: (
    videoId: string,
    videoTitle: string,
    videoCategory: string,
    resumeTime: number,
    progressPercentage: number
  ) => {
    trackVideoResume(videoId, videoTitle, videoCategory, resumeTime, progressPercentage)
  },

  // Exercise Challenge interactions
  trackExerciseChallengeView: () => {
    trackVercelEvent('Exercise Challenge View', {
      location: 'exercise_challenge_page',
    })
    trackEvent('exercise_challenge_view', {
      location: 'exercise_challenge_page',
    })
  },

  trackLeadGateOpen: () => {
    trackVercelEvent('Lead Gate Open', {
      location: 'exercise_challenge',
    })
    trackEvent('lead_gate_open', {
      location: 'exercise_challenge',
    })
  },

  trackLeadSubmitted: (leadId: string) => {
    trackVercelEvent('Lead Submitted', {
      location: 'exercise_challenge',
      lead_id: leadId,
    })
    trackEvent('lead_submitted', {
      location: 'exercise_challenge',
      lead_id: leadId,
    })
  },

  trackVisionIframeShown: () => {
    trackVercelEvent('Vision Iframe Shown', {
      location: 'exercise_challenge',
    })
    trackEvent('vision_iframe_shown', {
      location: 'exercise_challenge',
    })
  },

  trackExerciseSubmissionStarted: () => {
    trackVercelEvent('Exercise Submission Started', {
      location: 'exercise_challenge',
    })
    trackEvent('exercise_submission_started', {
      location: 'exercise_challenge',
    })
  },

  trackExerciseSubmissionSubmitted: (submissionId: string) => {
    trackVercelEvent('Exercise Submission Submitted', {
      location: 'exercise_challenge',
      submission_id: submissionId,
    })
    trackEvent('exercise_submission_submitted', {
      location: 'exercise_challenge',
      submission_id: submissionId,
    })
  },

  // Vision Lab interactions
  trackVisionLabViewed: (metadata?: {
    path?: string
    referrer?: string
    utm_source?: string
    utm_campaign?: string
    utm_medium?: string
  }) => {
    trackVercelEvent('Vision Lab Viewed', {
      location: 'vision_lab',
      ...metadata,
    })
    trackEvent('vision_lab_viewed', {
      location: 'vision_lab',
      ...metadata,
    })
  },

  trackVisionLeadGateOpened: (path?: string) => {
    trackVercelEvent('Vision Lead Gate Opened', {
      location: 'vision_lab',
      path: path || (typeof window !== 'undefined' ? window.location.pathname : ''),
    })
    trackEvent('vision_lead_gate_opened', {
      location: 'vision_lab',
      path: path || (typeof window !== 'undefined' ? window.location.pathname : ''),
    })
  },

  trackVisionLeadSubmitted: (leadId: string, emailDomain: string, consentEmailPlan: boolean) => {
    trackVercelEvent('Vision Lead Submitted', {
      location: 'vision_lab',
      lead_id: leadId,
      email_domain: emailDomain,
      consent_email_plan: consentEmailPlan,
    })
    trackEvent('vision_lead_submitted', {
      location: 'vision_lab',
      lead_id: leadId,
      email_domain: emailDomain,
      consent_email_plan: consentEmailPlan,
    })
  },

  trackVisionIframeLoaded: (leadId: string) => {
    trackVercelEvent('Vision Iframe Loaded', {
      location: 'vision_lab',
      lead_id: leadId,
    })
    trackEvent('vision_iframe_loaded', {
      location: 'vision_lab',
      lead_id: leadId,
    })
  },

  trackVisionGenerationStarted: (leadId: string, promptLength?: number) => {
    const metadata: Record<string, string | number | boolean | null> = {
      location: 'vision_lab',
      lead_id: leadId,
    }
    if (promptLength !== undefined) {
      metadata.prompt_length = promptLength
    }
    trackVercelEvent('Vision Generation Started', metadata)
    trackEvent('vision_generation_started', metadata)
  },

  trackVisionGenerationCompleted: (leadId: string) => {
    trackVercelEvent('Vision Generation Completed', {
      location: 'vision_lab',
      lead_id: leadId,
    })
    trackEvent('vision_generation_completed', {
      location: 'vision_lab',
      lead_id: leadId,
    })
  },

  trackVisionMicroqStarted: (leadId: string) => {
    trackVercelEvent('Vision Micro Interview Started', {
      location: 'vision_lab',
      lead_id: leadId,
    })
    trackEvent('vision_microq_started', {
      location: 'vision_lab',
      lead_id: leadId,
    })
  },

  trackVisionMicroqAnswered: (leadId: string, questionKey: string, answerValue: string) => {
    trackVercelEvent('Vision Micro Interview Answered', {
      location: 'vision_lab',
      lead_id: leadId,
      question_key: questionKey,
      answer_value: answerValue,
    })
    trackEvent('vision_microq_answered', {
      location: 'vision_lab',
      lead_id: leadId,
      question_key: questionKey,
      answer_value: answerValue,
    })
  },

  trackVisionMicroqCompleted: (
    leadId: string,
    requiredCompleted: boolean,
    optionalCompleted: boolean
  ) => {
    trackVercelEvent('Vision Micro Interview Completed', {
      location: 'vision_lab',
      lead_id: leadId,
      required_completed: requiredCompleted,
      optional_completed: optionalCompleted,
    })
    trackEvent('vision_microq_completed', {
      location: 'vision_lab',
      lead_id: leadId,
      required_completed: requiredCompleted,
      optional_completed: optionalCompleted,
    })
  },

  trackVisionMicroqFreeTextSaved: (leadId: string, hasText: boolean, textLength: number) => {
    trackVercelEvent('Vision Micro Interview Free Text Saved', {
      location: 'vision_lab',
      lead_id: leadId,
      has_text: hasText,
      text_length: textLength,
    })
    trackEvent('vision_microq_free_text_saved', {
      location: 'vision_lab',
      lead_id: leadId,
      has_text: hasText,
      text_length: textLength,
    })
  },

  trackVisionExerciseSuggested: (
    leadId: string,
    hasSuggestion: boolean,
    suggestionLength: number
  ) => {
    trackVercelEvent('Vision Exercise Suggested', {
      location: 'vision_lab',
      lead_id: leadId,
      has_suggestion: hasSuggestion,
      suggestion_length: suggestionLength,
    })
    trackEvent('vision_exercise_suggested', {
      location: 'vision_lab',
      lead_id: leadId,
      has_suggestion: hasSuggestion,
      suggestion_length: suggestionLength,
    })
  },

  trackVisionCtaGenerateWorkoutClicked: (leadId: string) => {
    trackVercelEvent('Vision CTA Generate Workout Clicked', {
      location: 'vision_lab',
      lead_id: leadId,
    })
    trackEvent('vision_cta_generate_workout_clicked', {
      location: 'vision_lab',
      lead_id: leadId,
    })
  },

  trackVisionCtaViewPricingClicked: (leadId: string) => {
    trackVercelEvent('Vision CTA View Pricing Clicked', {
      location: 'vision_lab',
      lead_id: leadId,
    })
    trackEvent('vision_cta_view_pricing_clicked', {
      location: 'vision_lab',
      lead_id: leadId,
    })
  },

  // Intro page tracking with flags
  trackIntroStartBuilding: () => {
    trackVercelEvent(
      'Intro Start Building Clicked',
      {
        location: 'hero',
        button_name: 'Generate My AI Workout',
      },
      ['intro-start-building-clicked']
    )
    trackEvent('intro_start_building_clicked', {
      location: 'hero',
      button_name: 'Generate My AI Workout',
    })
  },

  trackIntroLearnMore: () => {
    trackVercelEvent(
      'Intro Learn More Clicked',
      {
        location: 'hero',
        button_name: 'See How It Works',
      },
      ['intro-learn-more-clicked']
    )
    trackEvent('intro_learn_more_clicked', {
      location: 'hero',
      button_name: 'See How It Works',
    })
  },

  // Auth event tracking with flags
  trackUserLogin: (metadata?: { source?: string; method?: string; location?: string }) => {
    trackVercelEvent(
      'User Login',
      {
        location: metadata?.location || 'unknown',
        source: metadata?.source || 'unknown',
        method: metadata?.method || 'unknown',
      },
      ['user-logged-in']
    )
    trackEvent('user_logged_in', {
      location: metadata?.location || 'unknown',
      source: metadata?.source || 'unknown',
      method: metadata?.method || 'unknown',
    })
  },

  trackUserAccountCreated: (metadata?: { source?: string; method?: string; location?: string }) => {
    trackVercelEvent(
      'User Account Created',
      {
        location: metadata?.location || 'unknown',
        source: metadata?.source || 'unknown',
        method: metadata?.method || 'unknown',
      },
      ['user-account-created']
    )
    trackEvent('user_account_created', {
      location: metadata?.location || 'unknown',
      source: metadata?.source || 'unknown',
      method: metadata?.method || 'unknown',
    })
  },

  trackLoginIntent: (location: string, destination: string) => {
    trackVercelEvent('Login Intent', {
      location,
      destination,
      action: 'navigate_to_login',
    })
    trackEvent('login_intent', {
      location,
      destination,
      action: 'navigate_to_login',
    })
  },

  trackSignupIntent: (location: string, destination: string) => {
    trackVercelEvent('Signup Intent', {
      location,
      destination,
      action: 'navigate_to_signup',
    })
    trackEvent('signup_intent', {
      location,
      destination,
      action: 'navigate_to_signup',
    })
  },
}
