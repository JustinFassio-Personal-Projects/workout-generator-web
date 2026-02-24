import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Login | Workout Generator',
  description: 'Sign in to the admin dashboard',
  robots: 'noindex, nofollow',
}

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  // Simple layout for login page - no auth checks
  return <>{children}</>
}
