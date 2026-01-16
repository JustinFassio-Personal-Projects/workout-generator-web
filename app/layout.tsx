import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import { BotIdClient } from 'botid/client'
import './globals.scss'
import { Navbar } from '@/components/landing/Navbar/Navbar'
import { GroupedFAB } from '@/components/ui/GroupedFAB/GroupedFAB'
import { AOSStyles } from '@/components/ui/AOSStyles/AOSStyles'
import { FlagRestorer } from '@/components/ui/FlagRestorer/FlagRestorer'

const inter = Inter({ subsets: ['latin'] })
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['300', '500', '700'],
  variable: '--font-display',
  preload: false,
})

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com'

const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION

export const metadata: Metadata = {
  title: {
    default: 'Workout Generator - AI-Powered Fitness Plans',
    template: '%s | Workout Generator',
  },
  description:
    'Create personalized AI-powered workout plans tailored to your goals, fitness level, and equipment. Start your fitness journey today!',
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
  authors: [{ name: 'Workout Generator' }],
  applicationName: 'Workout Generator',
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
  openGraph: {
    title: 'Workout Generator - AI-Powered Fitness Plans',
    description:
      'Create personalized AI-powered workout plans tailored to your goals, fitness level, and equipment. Start your fitness journey today!',
    type: 'website',
    url: baseUrl,
    siteName: 'Workout Generator',
    images: [
      {
        url: `${baseUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Workout Generator - AI-Powered Fitness Plans',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Workout Generator - AI-Powered Fitness Plans',
    description:
      'Create personalized AI-powered workout plans tailored to your goals. Start your fitness journey today!',
    images: [`${baseUrl}/og-image.jpg`],
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
      // Add social media profiles here when available
      // 'https://www.facebook.com/workoutgenerator',
      // 'https://twitter.com/workoutgenerator',
      // 'https://www.instagram.com/workoutgenerator',
    ],
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

  // Protected routes that need BotID protection
  const protectedRoutes = [
    {
      path: '/api/chatkit-session',
      method: 'POST',
    },
  ]

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} ${spaceGrotesk.variable}`}>
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
      </body>
    </html>
  )
}
