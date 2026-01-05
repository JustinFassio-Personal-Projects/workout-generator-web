import type { Metadata } from 'next'
import Image from 'next/image'
import { StoryHero } from '@/components/features/story/StoryHero'
import { StoryChapterCard } from '@/components/features/story/StoryChapterCard'
import { StoryCTASection } from '@/components/features/story/StoryCTASection'
import { StoryPageClient } from '@/components/features/story/StoryPageClient'
import { getChaptersByOrder } from '@/data/story/chapters'
import styles from './page.module.scss'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com'

export const metadata: Metadata = {
  title: 'Founder Story | AIWorkoutGenerator',
  description:
    'I built AIWorkoutGenerator because most "AI workouts" are just randomness with confidence. Learn the story of how coaching expertise and software development came together.',
  keywords: [
    'founder story',
    'AI workout generator',
    'fitness coach',
    'personal trainer',
    'TACP',
    'military fitness',
    'fitness software',
  ],
  authors: [{ name: 'Justin Fassio' }],
  openGraph: {
    title: 'Founder Story | AIWorkoutGenerator',
    description:
      'The story of how coaching expertise and software development came together to create AIWorkoutGenerator.',
    type: 'website',
    url: `${baseUrl}/founder-story`,
    siteName: 'AIWorkoutGenerator',
    images: [
      {
        url: `${baseUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Founder Story | AIWorkoutGenerator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Founder Story | AIWorkoutGenerator',
    description:
      'The story of how coaching expertise and software development came together to create AIWorkoutGenerator.',
    images: [`${baseUrl}/og-image.jpg`],
  },
  alternates: {
    canonical: `${baseUrl}/founder-story`,
  },
}

export default function FounderStoryPage() {
  const chapters = getChaptersByOrder()

  // WebPage structured data (JSON-LD)
  const webpageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${baseUrl}/founder-story`,
    name: 'Founder Story | AIWorkoutGenerator',
    description:
      'The story of how coaching expertise and software development came together to create AIWorkoutGenerator.',
    url: `${baseUrl}/founder-story`,
    inLanguage: 'en-US',
    isPartOf: {
      '@type': 'WebSite',
      name: 'AIWorkoutGenerator',
      url: baseUrl,
    },
    about: {
      '@type': 'Person',
      name: 'Justin Fassio',
      jobTitle: 'Founder',
      description:
        'Certified trainer since 1996, TACP veteran, founder of San Diego Core Fitness, and builder of fitness software platforms.',
    },
  }

  // BreadcrumbList structured data (JSON-LD)
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Founder Story',
        item: `${baseUrl}/founder-story`,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <main className={styles.main}>
        <StoryPageClient />
        <StoryHero
          title="Founder Story"
          tagline="I built AIWorkoutGenerator because most 'AI workouts' are just randomness with confidence. I've coached long enough to know what works — and I've built enough software to know what scales. This is the story of how those two worlds collided."
        />

        <section className={styles.profileImageSection}>
          <div className={styles.container}>
            <div className={styles.profileImageContent} data-aos="fade-up">
              <p className={styles.profileImageCaption}>
                Training Boot Camp Instructors in San Diego, CA
              </p>
              <div className={styles.profileImageWrapper}>
                <Image
                  src="/Justin Profile Section 5.png"
                  alt="Justin Fassio - Founder of AIWorkoutGenerator"
                  width={500}
                  height={375}
                  className={styles.profileImage}
                  priority
                  quality={90}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 500px"
                />
              </div>
            </div>
          </div>
        </section>

        <section className={styles.narrativeSection}>
          <div className={styles.container}>
            <div className={styles.narrativeContent} data-aos="fade-up">
              <div className={styles.narrativeText}>
                <p>
                  I grew up in the coastal community of <strong>Santa Cruz, California</strong>,
                  where fitness wasn&apos;t a &quot;program&quot; — it was surfing, moving, getting
                  outside, and building capability without overthinking it. That early relationship
                  with training stuck: performance matters, but it has to feel real.
                </p>

                <p>
                  Later, I joined the <strong>U.S. Air Force</strong> and served as a{' '}
                  <strong>Tactical Air Control Party (TACP)</strong> member. That environment
                  doesn&apos;t reward hype — it rewards readiness. You learn fast that physical
                  training is not about looking fit; it&apos;s about being fit when it counts.
                </p>

                <p>
                  At <strong>Fort Hood</strong>, I was given a waiver as an{' '}
                  <strong>Airman First Class</strong> to run unit fitness programming as{' '}
                  <strong>Master Fitness Trainer / Unit Fitness Program Manager</strong> for a{' '}
                  <strong>3rd Air Support Operations Group</strong> unit (11th ASOS). That role
                  taught me how to build training for a population — how to reduce injuries, manage
                  compliance, and create consistency across different fitness levels.
                </p>

                <p>
                  After the military, I earned a degree in{' '}
                  <strong>Literature from UC Santa Cruz</strong> and completed graduate coursework
                  in <strong>Critical Theory and Semiotics</strong>. That might sound unrelated —
                  but it trained me to think about systems, meaning, and human behavior. In fitness,
                  the best plan is the one people actually follow.
                </p>

                <p>
                  I went on to build <strong>San Diego Core Fitness</strong>, then moved deeper into
                  technology — designing products like <strong>GymGo</strong> and{' '}
                  <strong>FitNimbus</strong> — because I kept seeing the same issue: coaching is
                  powerful, but it doesn&apos;t scale without good infrastructure.
                </p>

                <p>
                  AIWorkoutGenerator is the result of that whole path: coaching + systems + software
                  + AI, built with one non-negotiable rule:{' '}
                  <strong>the workout must make sense for the person doing it.</strong>
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.chaptersSection}>
          <div className={styles.container}>
            <div className={styles.chaptersHeader} data-aos="fade-up">
              <h2 className={styles.chaptersTitle}>Explore the chapters</h2>
              <p className={styles.chaptersSubtitle}>
                Each chapter tells a different part of the story — from Santa Cruz to the Air Force
                to building fitness software.
              </p>
            </div>
            <div className={styles.chaptersGrid}>
              {chapters.map((chapter, index) => (
                <StoryChapterCard key={chapter.slug} chapter={chapter} index={index} />
              ))}
            </div>
          </div>
        </section>

        <section className={styles.principlesSection}>
          <div className={styles.container}>
            <div className={styles.principlesContent} data-aos="fade-up">
              <h2 className={styles.principlesTitle}>Principles that power the product</h2>
              <div className={styles.principlesGrid}>
                <div className={styles.principleCard}>
                  <h3 className={styles.principleTitle}>Safety</h3>
                  <p className={styles.principleDescription}>
                    Every workout is constrained by safety principles. No random exercises that
                    could cause injury.
                  </p>
                </div>
                <div className={styles.principleCard}>
                  <h3 className={styles.principleTitle}>Progression</h3>
                  <p className={styles.principleDescription}>
                    Workouts adapt and progress over time, following real training principles, not
                    arbitrary complexity.
                  </p>
                </div>
                <div className={styles.principleCard}>
                  <h3 className={styles.principleTitle}>Adaptability</h3>
                  <p className={styles.principleDescription}>
                    Programs adjust to equipment, time, goals, and fitness level — because the best
                    plan is the one you can actually do.
                  </p>
                </div>
                <div className={styles.principleCard}>
                  <h3 className={styles.principleTitle}>Scale</h3>
                  <p className={styles.principleDescription}>
                    Good coaching principles, automated intelligently, so quality doesn&apos;t
                    degrade with volume.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.ctaSection}>
          <div className={styles.container}>
            <div className={styles.ctaContent} data-aos="fade-up">
              <h2 className={styles.ctaTitle}>Want the system I wish I had back then?</h2>
              <p className={styles.ctaDescription}>
                Generate your first workout and experience how real coaching principles meet
                intelligent automation.
              </p>
              <div className={styles.ctaActions}>
                <StoryCTASection />
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
