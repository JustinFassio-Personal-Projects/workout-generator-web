'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Zap,
  LayoutDashboard,
  BarChart3,
  FileText,
  FileSearch,
  Users,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import styles from './AdminLayout.module.scss'

interface AdminLayoutProps {
  children: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Don't show admin layout on login page
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  async function handleLogout() {
    await fetch('/api/admin/auth/logout', { method: 'POST', credentials: 'include' })
    window.location.href = '/admin/login'
  }

  const navItems: Array<{
    href: string
    label: string
    icon: typeof LayoutDashboard
  }> = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/admin/blog', label: 'Blog Posts', icon: FileText },
    { href: '/admin/deep-research', label: 'Deep Research', icon: FileSearch },
    { href: '/admin/leads', label: 'Leads', icon: Users },
  ]

  return (
    <div className={styles.layout}>
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : styles.closed}`}>
        <div className={styles.sidebarHeader}>
          <Link href="/admin" className={styles.logo}>
            <span className={styles.logoIcon}>
              <Zap size={20} />
            </span>
            {sidebarOpen && <span className={styles.logoText}>Admin</span>}
          </Link>
          <button
            className={styles.toggleButton}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        <nav className={styles.nav}>
          {navItems.map(item => {
            const IconComponent = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
              >
                <span className={styles.navIcon}>
                  <IconComponent size={20} />
                </span>
                {sidebarOpen && <span className={styles.navLabel}>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          {sidebarOpen && <div className={styles.userInfo}>Admin</div>}
          <button onClick={handleLogout} className={styles.logoutButton}>
            {sidebarOpen ? 'Sign Out' : <LogOut size={18} />}
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
