import { redirect } from 'next/navigation'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/AdminLayout'
import styles from './admin.module.scss'
import Link from 'next/link'

interface Stats {
  totalPosts: number
  publishedPosts: number
  draftPosts: number
  postsThisWeek: number
  totalCategories: number
  totalAuthors: number
  totalLeads: number
  leadsThisWeek: number
  visionLabLeads: number
  exerciseChallengeLeads: number
  verifiedLeads: number
}

async function getStats(): Promise<Stats> {
  const supabase = await createServerSupabaseClient()
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoIso = weekAgo.toISOString()

  const [
    totalPostsRes,
    publishedPostsRes,
    draftPostsRes,
    postsThisWeekRes,
    totalCategoriesRes,
    totalAuthorsRes,
    totalLeadsRes,
    leadsThisWeekRes,
    visionLabLeadsRes,
    exerciseChallengeLeadsRes,
    verifiedLeadsRes,
  ] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')
      .gte('published_at', weekAgoIso),
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('authors').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgoIso),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('source', 'vision_lab'),
    supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'exercise_challenge'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('verified', true),
  ])

  return {
    totalPosts: totalPostsRes.count ?? 0,
    publishedPosts: publishedPostsRes.count ?? 0,
    draftPosts: draftPostsRes.count ?? 0,
    postsThisWeek: postsThisWeekRes.count ?? 0,
    totalCategories: totalCategoriesRes.count ?? 0,
    totalAuthors: totalAuthorsRes.count ?? 0,
    totalLeads: totalLeadsRes.count ?? 0,
    leadsThisWeek: leadsThisWeekRes.count ?? 0,
    visionLabLeads: visionLabLeadsRes.count ?? 0,
    exerciseChallengeLeads: exerciseChallengeLeadsRes.count ?? 0,
    verifiedLeads: verifiedLeadsRes.count ?? 0,
  }
}

interface RecentPost {
  id: string
  slug: string
  title: string
  status: 'draft' | 'published'
  updated_at: string
  categoryName: string | null
}

async function getRecentPosts(): Promise<RecentPost[]> {
  const supabase = await createServerSupabaseClient()

  const { data: posts } = await supabase
    .from('posts')
    .select(
      `
      id,
      slug,
      title,
      status,
      updated_at,
      category:categories(name)
    `
    )
    .order('updated_at', { ascending: false })
    .limit(5)

  // Transform to handle Supabase's array return for relations
  return (posts || []).map((post: Record<string, unknown>) => {
    const category = post.category as { name: string }[] | { name: string } | null
    const categoryName = Array.isArray(category) ? category[0]?.name : category?.name
    return {
      id: post.id as string,
      slug: post.slug as string,
      title: post.title as string,
      status: post.status as 'draft' | 'published',
      updated_at: post.updated_at as string,
      categoryName: categoryName || null,
    }
  })
}

interface RecentLead {
  id: string
  first_name: string
  email: string
  source: string
  verified: boolean
  created_at: string
}

async function getRecentLeads(): Promise<RecentLead[]> {
  const supabase = await createServerSupabaseClient()

  const { data: leads } = await supabase
    .from('leads')
    .select('id, first_name, email, source, verified, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  return (leads || []) as RecentLead[]
}

export default async function AdminDashboardPage() {
  // Auth check
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

  const [stats, recentPosts, recentLeads] = await Promise.all([
    getStats(),
    getRecentPosts(),
    getRecentLeads(),
  ])

  return (
    <AdminLayout user={user} role={adminUser.role}>
      <div className={styles.dashboard}>
        <div className={styles.header}>
          <h1 className={styles.title}>Dashboard</h1>
          <Link href="/admin/blog/new" className={styles.newPostButton}>
            + New Post
          </Link>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.totalPosts}</div>
            <div className={styles.statLabel}>Total Posts</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.publishedPosts}</div>
            <div className={styles.statLabel}>Published</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.draftPosts}</div>
            <div className={styles.statLabel}>Drafts</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.postsThisWeek}</div>
            <div className={styles.statLabel}>Posts This Week</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.totalLeads}</div>
            <div className={styles.statLabel}>Total Leads</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.leadsThisWeek}</div>
            <div className={styles.statLabel}>Leads This Week</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.visionLabLeads}</div>
            <div className={styles.statLabel}>Vision Lab Leads</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.exerciseChallengeLeads}</div>
            <div className={styles.statLabel}>Exercise Challenge Leads</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.verifiedLeads}</div>
            <div className={styles.statLabel}>Verified Leads</div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent Activity</h2>
            <Link href="/admin/blog" className={styles.viewAllLink}>
              View All Posts →
            </Link>
          </div>

          {recentPosts.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No posts yet. Create your first post!</p>
              <Link href="/admin/blog/new" className={styles.createLink}>
                Create Post
              </Link>
            </div>
          ) : (
            <div className={styles.recentList}>
              {recentPosts.map(post => (
                <Link
                  key={post.id}
                  href={`/admin/blog/${post.slug}/edit`}
                  className={styles.recentItem}
                >
                  <div className={styles.recentInfo}>
                    <span className={styles.recentTitle}>{post.title}</span>
                    <span className={styles.recentMeta}>
                      {post.categoryName || 'Uncategorized'}
                    </span>
                  </div>
                  <span
                    className={`${styles.statusBadge} ${post.status === 'published' ? styles.published : styles.draft}`}
                  >
                    {post.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent Leads</h2>
            <Link href="/admin/leads" className={styles.viewAllLink}>
              View All Leads →
            </Link>
          </div>

          {recentLeads.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No leads yet.</p>
            </div>
          ) : (
            <div className={styles.recentList}>
              {recentLeads.map(lead => (
                <Link key={lead.id} href={`/admin/leads/${lead.id}`} className={styles.recentItem}>
                  <div className={styles.recentInfo}>
                    <span className={styles.recentTitle}>{lead.first_name}</span>
                    <span className={styles.recentMeta}>{lead.email}</span>
                    <span className={styles.recentMeta}>
                      {lead.source === 'vision_lab' ? 'Vision Lab' : 'Exercise Challenge'}
                    </span>
                  </div>
                  <span
                    className={`${styles.statusBadge} ${lead.verified ? styles.published : styles.draft}`}
                  >
                    {lead.verified ? 'Verified' : 'Unverified'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className={styles.quickStats}>
          <div className={styles.quickStat}>
            <span className={styles.quickLabel}>Categories</span>
            <span className={styles.quickValue}>{stats.totalCategories}</span>
          </div>
          <div className={styles.quickStat}>
            <span className={styles.quickLabel}>Authors</span>
            <span className={styles.quickValue}>{stats.totalAuthors}</span>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
