import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import 'aos/dist/aos.css'
import './globals.scss'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Workout Generator - AI-Powered Fitness Plans',
  description:
    'Transform your fitness journey with AI-powered workout plans tailored to your goals, fitness level, and available equipment.',
  keywords: ['workout', 'fitness', 'AI', 'exercise', 'training', 'gym'],
  authors: [{ name: 'Workout Generator' }],
  openGraph: {
    title: 'Workout Generator - AI-Powered Fitness Plans',
    description:
      'Transform your fitness journey with AI-powered workout plans tailored to your goals.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Workout Generator - AI-Powered Fitness Plans',
    description: 'Transform your fitness journey with AI-powered workout plans.',
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
