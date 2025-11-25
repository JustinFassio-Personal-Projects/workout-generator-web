'use client'

import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
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
  const [isSubmitExplainerOpen, setIsSubmitExplainerOpen] = useState(false)
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
            <div className={styles.submitWorkoutWrapper}>
              <button
                className={styles.submitWorkoutButton}
                onClick={() => setIsSubmitExplainerOpen(!isSubmitExplainerOpen)}
                aria-expanded={isSubmitExplainerOpen}
              >
                <span className={styles.buttonText}>Submit Your Workout</span>
                {isSubmitExplainerOpen ? (
                  <ChevronUp size={20} className={styles.chevronIcon} />
                ) : (
                  <ChevronDown size={20} className={styles.chevronIcon} />
                )}
              </button>
              {isSubmitExplainerOpen && (
                <div className={styles.submitExplainer}>
                  <h4 className={styles.explainerTitle}>
                    Welcome to the Future of Fitness Video Content
                  </h4>
                  <p className={styles.explainerIntro}>
                    We&apos;re entering a revolutionary new era in AI-powered fitness. Now you can
                    get personalized, on-demand workout videos that are life-like, feature perfect
                    form, and are 100% AI-generated—all at a fraction of the cost of traditional
                    video production.
                  </p>
                  <div className={styles.explainerList}>
                    <p className={styles.explainerText}>
                      <strong>How It Works:</strong>
                    </p>
                    <ul className={styles.bulletList}>
                      <li>
                        When you save a workout, you&apos;ll have the option to submit it for custom
                        video creation
                      </li>
                      <li>
                        Choose your preferred model characteristics (gender, age, body type) to
                        match your preferences
                      </li>
                      <li>
                        Our AI Workout Generator trainers and video prompt engineers personally
                        review and create each video, ensuring perfect form and clarity
                      </li>
                      <li>
                        Every exercise is demonstrated with precision, helping you understand proper
                        form and intensity
                      </li>
                      <li>
                        If an exercise can&apos;t be perfectly rendered, our team selects an equal
                        alternative that maintains the workout&apos;s integrity
                      </li>
                      <li>
                        Videos are concise (25 seconds) yet comprehensive, covering all exercises in
                        your workout
                      </li>
                    </ul>
                    <p className={styles.explainerText}>
                      <strong>Why This Is Revolutionary:</strong> Get professional-quality workout
                      videos tailored specifically to your routine, delivered instantly, and at a
                      price point that makes personalized fitness content accessible to everyone.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <a href="#pricing" className={styles.ctaLink}>
              <Button variant="secondary" size="lg">
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
