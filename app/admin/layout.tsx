import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin | Workout Generator',
  description: 'Admin area',
  robots: 'noindex, nofollow',
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  // Simple wrapper - auth is enforced in each admin page and in the login API route
  return <>{children}</>
}
