import { redirect } from 'next/navigation'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import styles from './analytics.module.scss'

type SummaryRow = {
  unique_visitors: number
  sessions: number
  page_views: number
  returning_visitors: number
}

type TopPageRow = {
  path: string
  page_views: number
  unique_visitors: number
}

type TopClickRow = {
  click_name: string
  clicks: number
  unique_visitors: number
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function subtractDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000)
}

async function getSummary(periodStart: Date, periodEnd: Date): Promise<SummaryRow> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.rpc('analytics_get_summary', {
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
  })

  if (error || !data || data.length === 0) {
    return { unique_visitors: 0, sessions: 0, page_views: 0, returning_visitors: 0 }
  }

  return data[0] as SummaryRow
}

async function getTopPages(
  periodStart: Date,
  periodEnd: Date,
  limit: number
): Promise<TopPageRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.rpc('analytics_get_top_pages', {
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    limit_count: limit,
  })
  return (data || []) as TopPageRow[]
}

async function getTopClicks(
  periodStart: Date,
  periodEnd: Date,
  limit: number
): Promise<TopClickRow[]> {
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase.rpc('analytics_get_top_clicks', {
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    limit_count: limit,
  })
  return (data || []) as TopClickRow[]
}

export default async function AdminAnalyticsPage() {
  const user = await getServerUser()
  if (!user) {
    redirect('/admin/login')
  }

  const supabase = await createServerSupabaseClient()
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!adminUser) {
    redirect('/admin/login?error=unauthorized')
  }

  const now = new Date()
  const todayStart = startOfUtcDay(now)
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)

  const last7Start = subtractDays(now, 7)
  const last30Start = subtractDays(now, 30)

  const [todaySummary, last7Summary, last30Summary, topPages7d, topClicks7d] = await Promise.all([
    getSummary(todayStart, tomorrowStart),
    getSummary(last7Start, now),
    getSummary(last30Start, now),
    getTopPages(last7Start, now, 15),
    getTopClicks(last7Start, now, 15),
  ])

  return (
    <AdminLayout user={user} role={adminUser.role}>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Analytics</h1>
          <p className={styles.subtitle}>
            First-party analytics (annotated clicks only). Admin routes and bots are excluded.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Today (UTC)</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{todaySummary.unique_visitors}</div>
              <div className={styles.statLabel}>Unique Visitors</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{todaySummary.returning_visitors}</div>
              <div className={styles.statLabel}>Returning Visitors</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{todaySummary.sessions}</div>
              <div className={styles.statLabel}>Sessions</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{todaySummary.page_views}</div>
              <div className={styles.statLabel}>Page Views</div>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Last 7 Days</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{last7Summary.unique_visitors}</div>
              <div className={styles.statLabel}>Unique Visitors</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{last7Summary.returning_visitors}</div>
              <div className={styles.statLabel}>Returning Visitors</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{last7Summary.sessions}</div>
              <div className={styles.statLabel}>Sessions</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{last7Summary.page_views}</div>
              <div className={styles.statLabel}>Page Views</div>
            </div>
          </div>

          <div className={styles.splitGrid}>
            <div className={styles.panel}>
              <h3 className={styles.panelTitle}>Top Pages (by views)</h3>
              {topPages7d.length === 0 ? (
                <p className={styles.empty}>No page view data yet.</p>
              ) : (
                <div className={styles.table}>
                  <div className={styles.tableHeader}>
                    <span>Path</span>
                    <span>Views</span>
                    <span>Uniques</span>
                  </div>
                  {topPages7d.map(row => (
                    <div className={styles.tableRow} key={row.path}>
                      <span className={styles.mono}>{row.path}</span>
                      <span>{row.page_views}</span>
                      <span>{row.unique_visitors}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.panel}>
              <h3 className={styles.panelTitle}>Top Clicks (annotated)</h3>
              {topClicks7d.length === 0 ? (
                <p className={styles.empty}>No click data yet.</p>
              ) : (
                <div className={styles.table}>
                  <div className={styles.tableHeader}>
                    <span>Click</span>
                    <span>Clicks</span>
                    <span>Uniques</span>
                  </div>
                  {topClicks7d.map(row => (
                    <div className={styles.tableRow} key={row.click_name}>
                      <span className={styles.mono}>{row.click_name}</span>
                      <span>{row.clicks}</span>
                      <span>{row.unique_visitors}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Last 30 Days</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{last30Summary.unique_visitors}</div>
              <div className={styles.statLabel}>Unique Visitors</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{last30Summary.returning_visitors}</div>
              <div className={styles.statLabel}>Returning Visitors</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{last30Summary.sessions}</div>
              <div className={styles.statLabel}>Sessions</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{last30Summary.page_views}</div>
              <div className={styles.statLabel}>Page Views</div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
