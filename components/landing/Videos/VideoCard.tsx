'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Video } from '@/data/videos'
import {
  trackVideoStart,
  trackVideoView,
  trackVideoProgress,
  trackVideoComplete,
  trackVideoPause,
  trackVideoResume,
} from '@/lib/analytics'
import styles from './VideoCard.module.scss'

interface VideoCardProps {
  video: Video
  index?: number
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, index = 0 }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hasPlayed, setHasPlayed] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [hasViewed, setHasViewed] = useState(false)
  const trackedMilestonesRef = useRef<Set<number>>(new Set())
  const hasViewedRef = useRef<boolean>(false)
  const hasPlayedRef = useRef<boolean>(false)
  const isBrandVideo = video.category === 'brand'
  const location = 'videos_section'

  // Reset tracking state when video changes
  useEffect(() => {
    trackedMilestonesRef.current.clear()
    hasViewedRef.current = false
    hasPlayedRef.current = false
    setHasPlayed(false)
    setHasStarted(false)
    setIsPaused(false)
    setHasViewed(false)
  }, [video.id, video.videoUrl])

  // IntersectionObserver for viewport tracking and autoplay
  useEffect(() => {
    const container = containerRef.current
    const videoElement = videoRef.current

    if (!container || !videoElement || !video.videoUrl) {
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          try {
            if (entry.isIntersecting) {
              // Track video view when it enters viewport
              if (!hasViewedRef.current) {
                try {
                  trackVideoView(video.id, video.title, video.category, location)
                } catch (error) {
                  console.warn('Error tracking video view:', error)
                }
                hasViewedRef.current = true
                setHasViewed(true)
              }

              // Autoplay when in view
              if (!hasPlayedRef.current) {
                videoElement.play().catch(error => {
                  console.warn(`Autoplay prevented for ${video.title}:`, error)
                })
                hasPlayedRef.current = true
                setHasPlayed(true)
              }
            } else if (!entry.isIntersecting && hasPlayedRef.current) {
              // Video is out of view, pause it
              videoElement.pause()
            }
          } catch (error) {
            console.warn('Error in IntersectionObserver callback:', error)
          }
        })
      },
      {
        threshold: 0.5, // Trigger when 50% of video is visible
      }
    )

    observer.observe(container)

    return () => {
      observer.disconnect()
    }
  }, [video.videoUrl, video.title, video.id, video.category, location])

  // Video event listeners for tracking
  useEffect(() => {
    const videoElement = videoRef.current

    if (!videoElement || !video.videoUrl) {
      return
    }

    // Helper function to calculate progress percentage
    const getProgressPercentage = (): number => {
      if (!videoElement.duration || videoElement.duration === 0) {
        return 0
      }
      return Math.round((videoElement.currentTime / videoElement.duration) * 100)
    }

    // Helper function to check and track milestones
    const checkMilestones = () => {
      try {
        const progress = getProgressPercentage()
        const milestones = [25, 50, 75, 100]

        milestones.forEach(milestone => {
          if (progress >= milestone && !trackedMilestonesRef.current.has(milestone)) {
            trackedMilestonesRef.current.add(milestone)

            trackVideoProgress(
              video.id,
              video.title,
              video.category,
              milestone,
              videoElement.currentTime,
              videoElement.duration || undefined
            )
          }
        })
      } catch (error) {
        console.warn('Error in checkMilestones:', error)
      }
    }

    // Track video start
    const handlePlay = () => {
      try {
        if (!hasStarted) {
          // First time playing
          trackVideoStart(video.id, video.title, video.category, location)
          setHasStarted(true)
          setIsPaused(false)
        } else if (isPaused) {
          // Resuming after pause
          const progress = getProgressPercentage()
          trackVideoResume(
            video.id,
            video.title,
            video.category,
            videoElement.currentTime,
            progress
          )
          setIsPaused(false)
        }
      } catch (error) {
        console.warn('Error in handlePlay:', error)
      }
    }

    // Track video pause (but not when paused due to leaving viewport)
    const handlePause = () => {
      try {
        // Only track if video was actually playing (not just autoplay prevented)
        if (hasStarted && !isPaused) {
          const progress = getProgressPercentage()
          trackVideoPause(video.id, video.title, video.category, videoElement.currentTime, progress)
          setIsPaused(true)
        }
      } catch (error) {
        console.warn('Error in handlePause:', error)
      }
    }

    // Track progress milestones
    const handleTimeUpdate = () => {
      try {
        if (hasStarted && !videoElement.paused) {
          checkMilestones()
        }
      } catch (error) {
        console.warn('Error in handleTimeUpdate:', error)
      }
    }

    // Track video completion
    const handleEnded = () => {
      try {
        if (videoElement.duration) {
          trackVideoComplete(video.id, video.title, video.category, videoElement.duration)
        }
      } catch (error) {
        console.warn('Error in handleEnded:', error)
      }
    }

    // Add event listeners
    videoElement.addEventListener('play', handlePlay)
    videoElement.addEventListener('pause', handlePause)
    videoElement.addEventListener('timeupdate', handleTimeUpdate)
    videoElement.addEventListener('ended', handleEnded)

    // Cleanup
    return () => {
      if (videoElement) {
        videoElement.removeEventListener('play', handlePlay)
        videoElement.removeEventListener('pause', handlePause)
        videoElement.removeEventListener('timeupdate', handleTimeUpdate)
        videoElement.removeEventListener('ended', handleEnded)
      }
    }
  }, [video.id, video.title, video.category, video.videoUrl, hasStarted, isPaused, location])

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error(`Error loading video: ${video.videoUrl}`, e)
  }

  // Early return before any JSX to prevent hydration mismatch
  if (!video.videoUrl) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.videoCard} ${isBrandVideo ? styles.brandVideo : ''}`}
      data-aos="fade-up"
      data-aos-delay={index * 100}
    >
      <div className={styles.videoWrapper}>
        <video
          ref={videoRef}
          className={styles.video}
          src={video.videoUrl}
          controls
          loop
          muted
          playsInline
          onError={handleVideoError}
          suppressHydrationWarning
        >
          Your browser does not support the video tag.
        </video>
      </div>
      {!isBrandVideo && (
        <div className={styles.content}>
          <h3 className={styles.title}>{video.title}</h3>
          {video.description && <p className={styles.description}>{video.description}</p>}
        </div>
      )}
    </div>
  )
}
