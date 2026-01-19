'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  Check,
  Linkedin,
  Youtube,
  Instagram,
  Facebook,
  Twitter,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/Button/Button'
import { LogoWatermark } from '@/components/ui/LogoWatermark/LogoWatermark'
import { trackButtonClick } from '@/lib/analytics'
import styles from './Bio.module.scss'

export const Bio: React.FC = () => {
  const handleFounderStoryClick = () => {
    trackButtonClick('Read the Founder Story', 'bio')
  }

  const handleGenerateWorkoutClick = () => {
    trackButtonClick('Generate My First Workout', 'bio')
    const workoutBuilderSection = document.getElementById('workout-builder')
    if (workoutBuilderSection) {
      workoutBuilderSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleLinkedInClick = () => {
    trackButtonClick('Connect on LinkedIn', 'bio')
  }

  const handleYoutubeClick = () => {
    trackButtonClick('YouTube', 'bio')
  }

  const handleInstagramClick = () => {
    trackButtonClick('Instagram', 'bio')
  }

  const handleLinkedInCompanyClick = () => {
    trackButtonClick('LinkedIn Company', 'bio')
  }

  const handleFacebookClick = () => {
    trackButtonClick('Facebook', 'bio')
  }

  const handleTwitterClick = () => {
    trackButtonClick('Twitter', 'bio')
  }

  const handleYelpClick = () => {
    trackButtonClick('Yelp Reviews', 'bio')
  }

  const socialLinks = [
    {
      icon: Youtube,
      href: 'https://www.youtube.com/@aiworkoutgen',
      label: 'YouTube',
      onClick: handleYoutubeClick,
    },
    {
      icon: Instagram,
      href: 'https://www.instagram.com/aiworkoutgenerator/',
      label: 'Instagram',
      onClick: handleInstagramClick,
    },
    {
      icon: Linkedin,
      href: 'https://www.linkedin.com/in/justinfassio/',
      label: 'LinkedIn Personal',
      onClick: handleLinkedInClick,
    },
    {
      icon: Linkedin,
      href: 'https://www.linkedin.com/company/ai-workout-generator/',
      label: 'LinkedIn Company',
      onClick: handleLinkedInCompanyClick,
    },
    {
      icon: Facebook,
      href: 'https://www.facebook.com/aiworkoutgenerator',
      label: 'Facebook',
      onClick: handleFacebookClick,
    },
    {
      icon: Twitter,
      href: 'https://x.com/AI_Workout',
      label: 'Twitter',
      onClick: handleTwitterClick,
    },
    {
      icon: Star,
      href: 'https://www.yelp.com/biz/san-diego-core-fitness-san-diego-san-diego?osq=San+Diego+Core+Fitness',
      label: 'Yelp Reviews',
      onClick: handleYelpClick,
    },
  ]

  const credentials = [
    'Certified trainer since 1996 (ACSM CPT)',
    'U.S. Air Force TACP veteran; served as MFT/UFPM for a 3rd ASOG unit at Fort Hood',
    'Founder: San Diego Core Fitness',
    'Builder/designer: GymGo, FitNimbus, and now AIWorkoutGenerator / Fitcopilot',
  ]

  return (
    <section id="bio" className={styles.bio}>
      <LogoWatermark position="center" opacity={0.03} size={400} rotation={0} />
      <div className={styles.container}>
        <div className={styles.layout}>
          {/* Image Section - Main profile image with gallery */}
          <div className={styles.imageSection} data-aos="fade-right">
            <div className={styles.mainImageWrapper}>
              <Image
                src="/justin-fassio-ai-workout-generator-founder-san-diego-trainer.jpg"
                alt="Justin Fassio - Certified Personal Trainer and Founder of AIWorkoutGenerator in San Diego, CA"
                fill
                priority
                quality={90}
                className={styles.mainImage}
                sizes="(max-width: 1024px) 100vw, 45vw"
                style={{ objectFit: 'cover', objectPosition: 'center' }}
              />
            </div>
            <div className={styles.imageGallery}>
              <div className={styles.galleryImage}>
                <Image
                  src="/justin Profile Section 2.png"
                  alt="Justin Fassio training clients in San Diego"
                  fill
                  quality={85}
                  className={styles.galleryImg}
                  sizes="(max-width: 640px) 100px, (max-width: 1024px) 120px, 150px"
                  style={{ objectFit: 'cover', objectPosition: 'center' }}
                />
              </div>
              <div className={styles.galleryImage}>
                <Image
                  src="/Justin Profile Section 3.png"
                  alt="Justin Fassio - Personal Trainer and Fitness Coach"
                  fill
                  quality={85}
                  className={styles.galleryImg}
                  sizes="(max-width: 640px) 100px, (max-width: 1024px) 120px, 150px"
                  style={{ objectFit: 'cover', objectPosition: 'center' }}
                />
              </div>
              <div className={styles.galleryImage}>
                <Image
                  src="/Justin Profile Section 4.png"
                  alt="Justin Fassio - Military Fitness Trainer and Coach"
                  fill
                  quality={85}
                  className={styles.galleryImg}
                  sizes="(max-width: 640px) 100px, (max-width: 1024px) 120px, 150px"
                  style={{ objectFit: 'cover', objectPosition: 'center' }}
                />
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className={styles.content} data-aos="fade-left">
            <div className={styles.header}>
              <h2 className={styles.title}>
                <span className={styles.gradientText}>Built by a coach, not a prompt.</span>
              </h2>
              <div className={styles.bioText}>
                <p>
                  Hi — I&apos;m <strong>Justin Fassio</strong>. I&apos;ve been a certified trainer
                  since <strong>1996</strong>, ran military fitness programming for an Air Support
                  Operations unit, built real-world training businesses, and later designed fitness
                  software platforms before stepping into AI.
                </p>
                <p>
                  AIWorkoutGenerator exists for one reason:{' '}
                  <strong>
                    to give people structured training that&apos;s safe, personalized, and
                    consistent — not random workouts.
                  </strong>
                </p>
              </div>
            </div>

            <div className={styles.credentials} data-aos="fade-up" data-aos-delay="100">
              <h3 className={styles.credentialsTitle}>
                Expertise and Experience Behind Every Workout:
              </h3>
              <ul className={styles.credentialsList}>
                {credentials.map((credential, index) => (
                  <li key={index} className={styles.credentialItem}>
                    <Check className={styles.checkIcon} size={20} />
                    <span>{credential}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* CTAs - Outside card, bottom right of section */}
        <div className={styles.ctaSection} data-aos="fade-up" data-aos-delay="200">
          <div className={styles.actions}>
            <Link href="/founder-story" onClick={handleFounderStoryClick}>
              <Button variant="primary" size="md" icon={ArrowRight} iconPosition="right">
                Read the Founder Story
              </Button>
            </Link>
            <Button variant="secondary" size="md" onClick={handleGenerateWorkoutClick}>
              Generate My First Workout
            </Button>
            <a
              href="https://www.linkedin.com/in/justinfassio/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleLinkedInClick}
              style={{ textDecoration: 'none' }}
            >
              <Button variant="secondary" size="md" icon={Linkedin} iconPosition="left">
                Connect on LinkedIn
              </Button>
            </a>
          </div>
          <div className={styles.socialLinks}>
            {socialLinks.map((social, index) => {
              const Icon = social.icon
              return (
                <a
                  key={index}
                  href={social.href}
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={social.onClick}
                  className={styles.socialLink}
                >
                  <Icon size={20} />
                </a>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
