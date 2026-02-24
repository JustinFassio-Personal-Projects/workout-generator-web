import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin | Workout Generator',
  description: 'Admin area',
  robots: 'noindex, nofollow',
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  // Simple wrapper - actual auth is handled by middleware and individual pages
  return <>{children}</>
}
