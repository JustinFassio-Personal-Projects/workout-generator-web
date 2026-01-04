'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import styles from './AdminLayout.module.scss'

interface AdminLayoutProps {
  children: React.ReactNode
  user: User
  role: string
}

export function AdminLayout({ children, user, role }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Don't show admin layout on login page
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: '📊' },
    { href: '/admin/blog', label: 'Blog Posts', icon: '📝' },
  ]

  return (
    <div className={styles.layout}>
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : styles.closed}`}>
        <div className={styles.sidebarHeader}>
          <Link href="/admin" className={styles.logo}>
            <span className={styles.logoIcon}>⚡</span>
            {sidebarOpen && <span className={styles.logoText}>Admin</span>}
          </Link>
          <button
            className={styles.toggleButton}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className={styles.nav}>
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {sidebarOpen && <span className={styles.navLabel}>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          {sidebarOpen && (
            <div className={styles.userInfo}>
              <span className={styles.userEmail}>{user.email}</span>
              <span className={styles.userRole}>{role}</span>
            </div>
          )}
          <button onClick={handleLogout} className={styles.logoutButton}>
            {sidebarOpen ? 'Sign Out' : '🚪'}
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <Link href="/" className={styles.viewSiteLink} target="_blank">
            View Site ↗
          </Link>
        </header>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  )
}
