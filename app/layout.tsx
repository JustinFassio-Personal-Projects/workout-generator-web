import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import 'aos/dist/aos.css'
import './globals.scss'

const inter = Inter({ subsets: ['latin'] })

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://workoutgenerator.com'

export const metadata: Metadata = {
  title: 'Workout Generator - AI-Powered Fitness Plans',
  description:
    'Transform your fitness journey with AI-powered workout plans tailored to your goals, fitness level, and available equipment.',
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
  openGraph: {
    title: 'Workout Generator - AI-Powered Fitness Plans',
    description:
      'Transform your fitness journey with AI-powered workout plans tailored to your goals.',
    type: 'website',
    url: baseUrl,
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
    description: 'Transform your fitness journey with AI-powered workout plans.',
    images: [`${baseUrl}/og-image.jpg`],
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
