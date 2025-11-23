'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Video } from '@/data/videos'
import styles from './VideoCard.module.scss'

interface VideoCardProps {
  video: Video
  index?: number
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, index = 0 }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hasPlayed, setHasPlayed] = useState(false)
  const isBrandVideo = video.category === 'brand'

  useEffect(() => {
    const container = containerRef.current
    const videoElement = videoRef.current

    if (!container || !videoElement || !video.videoUrl) {
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !hasPlayed) {
            // Video is in view and hasn't played yet
            videoElement.play().catch(error => {
              console.warn(`Autoplay prevented for ${video.title}:`, error)
            })
            setHasPlayed(true)
          } else if (!entry.isIntersecting && hasPlayed) {
            // Video is out of view, pause it
            videoElement.pause()
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
  }, [video.videoUrl, video.title, hasPlayed])

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
