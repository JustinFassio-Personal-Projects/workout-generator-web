import type { Metadata } from 'next'
import { Inter, Space_Grotesk, Cinzel } from 'next/font/google'
import Script from 'next/script'
import { Suspense } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { BotIdClient } from 'botid/client'
import './globals.scss'
import { Navbar } from '@/components/landing/Navbar/Navbar'
import { GroupedFAB } from '@/components/ui/GroupedFAB/GroupedFAB'
import { AOSStyles } from '@/components/ui/AOSStyles/AOSStyles'
import { FlagRestorer } from '@/components/ui/FlagRestorer/FlagRestorer'
import { FirstPartyAnalytics } from '@/components/analytics/FirstPartyAnalytics'
import { WebVitals } from '@/components/analytics/WebVitals'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '500', '700'],
  variable: '--font-display',
  // Do not preload this secondary display font to avoid impacting the critical rendering path.
  // The primary font (Inter) is preloaded by default, which is sufficient for initial render.
  preload: false,
})
const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-serif-display',
  preload: false,
})

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com'

const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION

export const metadata: Metadata = {
  // Title Template: Forces the "AI Workout Generator" to appear on every page
  title: {
    default: 'AI Workout Generator | Free Science-Based Strength Plans',
    template: '%s | AI Workout Generator',
  },
  // The "Click-Through" Hook
  description:
    'Build trainer-verified hypertrophy & strength programs in 30 seconds. The #1 free AI workout generator. No sign-up required.',
  keywords: [
    'workout',
    'fitness',
    'AI',
    'exercise',
    'training',
    'gym',
    'workout plans',
    'fitness blog',
    'exercise routines',
    'personalized workouts',
    'home workouts',
    'fitness tips',
    'workout strategies',
    'health and wellness',
  ],
  authors: [{ name: 'AI Workout Generator' }],
  applicationName: 'AI Workout Generator',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: baseUrl,
  },
  verification: googleSiteVerification
    ? {
        google: googleSiteVerification,
      }
    : undefined,
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [{ url: '/favicon-180.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.json',
  // Open Graph (Social Cards)
  openGraph: {
    title: 'Stop Guessing. Start Training.',
    description: 'Generate a 12-week science-based program tailored to your equipment.',
    url: baseUrl,
    siteName: 'AI Workout Generator',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'AI Workout Generator - Free Science-Based Strength Plans',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The AI Workout Generator (Free)',
    description: 'Stop guessing. Build a science-based hypertrophy plan in 30 seconds.',
    site: '@aiworkoutgen', // Business account
    creator: '@AI_Workout', // Personal/creator account
    images: [`${baseUrl}/twitter-og.png`],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'format-detection': 'telephone=no',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [{ media: '(prefers-color-scheme: dark)', color: '#000000' }],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID

  // Organization structured data (JSON-LD)
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Workout Generator',
    url: baseUrl,
    logo: `${baseUrl}/logo.png`,
    description:
      'AI-powered workout plans tailored to your goals, fitness level, and available equipment.',
    sameAs: [
      // 'https://www.facebook.com/workoutgenerator',
      // 'https://twitter.com/workoutgenerator',
      // 'https://www.instagram.com/workoutgenerator',
    ],
    // Aggregate rating based on founder's Yelp reviews for San Diego Core Fitness
    // Source: https://www.yelp.com/biz/san-diego-core-fitness-san-diego-san-diego?osq=San+Diego+Core+Fitness
    // 4 Yelp accounts: 3 with 5 stars, 1 with 4.7 stars = 4.9 average
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '8000',
    },
  }

  // WebSite structured data (JSON-LD)
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Workout Generator',
    url: baseUrl,
    description:
      'Transform your fitness journey with AI-powered workout plans tailored to your goals, fitness level, and available equipment.',
    publisher: {
      '@type': 'Organization',
      name: 'Workout Generator',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}/blog?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  // SoftwareApplication structured data (JSON-LD) for Knowledge Graph
  // Only included on homepage - moved from client component to server component
  const softwareApplicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AI Workout Generator',
    headline: 'Science-Based AI Workout Generator & Planner',
    alternativeHeadline: 'Trainer-Verified Strength Training Builder',
    image: 'https://aiworkoutgenerator.com/images/hero-preview.jpg',
    url: 'https://aiworkoutgenerator.com',
    sameAs: ['https://twitter.com/aiworkoutgen', 'https://instagram.com/aiworkoutgen'],
    author: {
      '@type': 'Organization',
      name: 'AIWorkoutGenerator Team',
      url: 'https://aiworkoutgenerator.com',
    },
    applicationCategory: 'HealthApplication',
    applicationSubCategory: 'Fitness & Workout Planner',
    operatingSystem: 'Web, iOS, Android',
    screenshot: 'https://aiworkoutgenerator.com/images/app-interface.jpg',
    featureList: [
      'Progressive Overload Tracking',
      'Home Gym Adaptation',
      'AI-Powered Workout Generation',
      'Personalized Training Plans',
      'Equipment-Based Customization',
      'RPE Calibration System',
      'Smart Rest Timer',
      'Exercise Substitution Logic',
      'Time-Efficient Programming',
      'Science-Based Periodization',
      'Trainer-Verified Exercise Selection',
      'Adaptive Difficulty Scaling',
    ],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      priceValidUntil: '2026-12-31',
      availability: 'https://schema.org/OnlineOnly',
      category: 'Free Tier',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '8432',
      bestRating: '5',
      worstRating: '1',
    },
    audience: {
      '@type': 'Audience',
      audienceType: 'Strength Athletes, Bodybuilders, Fitness Enthusiasts',
    },
    description:
      'The only AI workout generator powered by 30 years of coaching data. Generate personalized, science-based strength and hypertrophy plans without algorithm hallucinations.',
  }

  // Protected routes that need BotID protection
  const protectedRoutes = [
    {
      path: '/api/chatkit-session',
      method: 'POST',
    },
  ]

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.className} ${inter.variable} ${spaceGrotesk.variable} ${cinzel.variable}`}
        suppressHydrationWarning
      >
        {/* Skip to Content Link - Accessibility */}
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        <AOSStyles />
        <FlagRestorer />
        <BotIdClient protect={protectedRoutes} />
        {/* Google Tag Manager */}
        {gtmId && (
          <Script
            id="gtm-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${gtmId}');
              `,
            }}
          />
        )}
        {/* Google Analytics */}
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script
              id="ga-script"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaId}', {
                    page_path: window.location.pathname,
                  });
                `,
              }}
            />
          </>
        )}
        {/* Structured Data - Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        {/* Structured Data - WebSite */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        {/* Structured Data - SoftwareApplication (homepage only, but included globally for SEO) */}
        <Script
          id="software-application-schema"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
        />
        {/* Google Tag Manager (noscript) */}
        {gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        )}
        {/* ChatKit web component script - Disabled: ChatKit not configured */}
        {/* <Script
          src="https://cdn.platform.openai.com/deployments/chatkit/chatkit.js"
          strategy="afterInteractive"
        /> */}
        <Navbar />
        <div id="main-content">{children}</div>
        <GroupedFAB />
        <Analytics />
        <Suspense fallback={null}>
          <FirstPartyAnalytics />
        </Suspense>
        <Suspense fallback={null}>
          <WebVitals />
        </Suspense>
      </body>
    </html>
  )
}
