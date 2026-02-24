'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import styles from './login.module.scss'

function AdminLoginForm() {
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const errorParam = searchParams.get('error')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'include',
      })
      const data = (await res.json().catch(() => ({
        error: 'Invalid response from server',
      }))) as { error?: string; success?: boolean }

      if (!res.ok) {
        setError(data.error ?? 'Login failed')
        setLoading(false)
        return
      }
      if (!data.success) {
        setError(data.error ?? 'Login failed')
        setLoading(false)
        return
      }
      // Full replace so the next request includes the Set-Cookie from this response
      window.location.replace('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.loginCard}>
        <div className={styles.header}>
          <h1 className={styles.title}>Admin Login</h1>
          <p className={styles.subtitle}>Sign in to manage blog content</p>
        </div>

        {(error || errorParam === 'unauthorized') && (
          <div className={styles.error}>
            {error || 'You do not have permission to access the admin area'}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={styles.input}
              placeholder="Admin password"
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className={styles.container}>Loading...</div>}>
      <AdminLoginForm />
    </Suspense>
  )
}
