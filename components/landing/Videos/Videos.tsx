'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronUp, ArrowRight, DollarSign } from 'lucide-react'
import {
  videos,
  getFeaturedVideo,
  getFeaturedExerciseVideos,
  getFeaturedWorkoutVideos,
  getVideosByCategory,
  VideoCategory,
} from '@/data/videos'
import { VideoCard } from './VideoCard'
import { Button } from '@/components/ui/Button/Button'
import { LogoWatermark } from '@/components/ui/LogoWatermark/LogoWatermark'
import styles from './Videos.module.scss'

export const Videos: React.FC = () => {
  const [expandedCategories, setExpandedCategories] = useState<Set<VideoCategory>>(new Set())
  const featuredVideo = getFeaturedVideo()
  const featuredExerciseVideos = getFeaturedExerciseVideos()
  const featuredWorkoutVideos = getFeaturedWorkoutVideos()

  // Combine featured exercise and workout videos for the grid
  const featuredVideos = [
    ...featuredExerciseVideos.slice(0, 2), // Get first 2 featured exercise videos
    ...featuredWorkoutVideos.slice(0, 2), // Get first 2 featured workout videos
  ].slice(0, 4) // Ensure we only have 4 videos

  const categories: { key: VideoCategory; label: string }[] = [
    { key: 'exercise-of-the-week', label: 'Exercise of the Week' },
    { key: 'workout-of-the-week', label: 'Workout of the Week' },
    { key: 'promotional', label: 'Promotional Videos' },
  ]

  const toggleCategory = (category: VideoCategory) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  return (
    <section id="videos" className={styles.videos}>
      <LogoWatermark position="top-right" opacity={0.05} size={350} rotation={-10} />
      <div className={styles.container}>
        <div className={styles.header} data-aos="fade-up">
          <h2 className={styles.title}>
            Get Your Custom
            <span className={styles.gradientText}> Workout Videos</span>
          </h2>
          <p className={styles.subtitle}>
            Submit your favorite workouts and our team will create custom videos for you. Pay a
            one-time fee for a single video or subscribe for multiple videos per month.
          </p>
          <div className={styles.ctaButtons} data-aos="fade-up" data-aos-delay="100">
            <a href="#submit-workout" className={styles.ctaLink}>
              <Button variant="primary" size="lg" icon={ArrowRight} iconPosition="right">
                Submit Your Workout
              </Button>
            </a>
            <a href="#pricing" className={styles.ctaLink}>
              <Button variant="secondary" size="lg" icon={DollarSign} iconPosition="left">
                View Pricing
              </Button>
            </a>
          </div>
        </div>

        {/* Featured Brand Video */}
        {featuredVideo && (
          <div className={styles.featuredSection} data-aos="fade-up" data-aos-delay="100">
            <div className={styles.featuredVideoWrapper}>
              <VideoCard video={featuredVideo} index={0} />
            </div>
          </div>
        )}

        {/* Featured Videos Grid - 4 Columns */}
        {featuredVideos.length > 0 && (
          <div className={styles.featuredGridSection} data-aos="fade-up" data-aos-delay="200">
            <div className={styles.featuredGrid}>
              {featuredVideos.map((video, index) => (
                <VideoCard key={video.id} video={video} index={index} />
              ))}
            </div>
          </div>
        )}

        {/* Expandable Video Categories */}
        {categories.map((category, index) => {
          const categoryVideos = getVideosByCategory(category.key)
          const isExpanded = expandedCategories.has(category.key)
          const hasVideos = categoryVideos.length > 0

          if (!hasVideos) {
            return null
          }

          return (
            <div
              key={category.key}
              className={styles.categorySection}
              data-aos="fade-up"
              data-aos-delay={(index + 2) * 100}
            >
              <button
                className={styles.categoryHeader}
                onClick={() => toggleCategory(category.key)}
                aria-expanded={isExpanded}
                aria-controls={`category-${category.key}`}
              >
                <h3 className={styles.categoryTitle}>{category.label}</h3>
                {isExpanded ? (
                  <ChevronUp size={24} className={styles.chevron} />
                ) : (
                  <ChevronDown size={24} className={styles.chevron} />
                )}
              </button>
              {isExpanded && (
                <div id={`category-${category.key}`} className={styles.categoryContent}>
                  <div className={styles.videoGrid}>
                    {categoryVideos.map((video, videoIndex) => (
                      <VideoCard key={video.id} video={video} index={videoIndex} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
