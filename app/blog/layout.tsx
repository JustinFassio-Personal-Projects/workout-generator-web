import type { Metadata } from 'next'
import { AOSInitializer } from './AOSInitializer'

export const metadata: Metadata = {
  title: {
    template: '%s | Blog - Workout Generator',
    default: 'Blog - Workout Generator | Fitness Tips & Workout Strategies',
  },
  description:
    'Discover fitness tips, workout strategies, and expert advice to help you achieve your fitness goals.',
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="blog-layout min-h-screen">
      <AOSInitializer />
      {children}
    </div>
  )
}
