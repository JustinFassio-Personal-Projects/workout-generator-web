import { redirect } from 'next/navigation'
import { createServerSupabaseClient, getServerUser } from '@/lib/supabase/server'
import { AdminLayout } from '@/components/admin/AdminLayout'
import { BlogStats } from '@/types/blog'
import styles from './admin.module.scss'
import Link from 'next/link'

async function getStats(): Promise<BlogStats> {
  const supabase = await createServerSupabaseClient()

  // Get post counts
  const { count: totalPosts } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })

  const { count: publishedPosts } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published')

  const { count: draftPosts } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'draft')

  // Get posts published this week
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const { count: postsThisWeek } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published')
    .gte('published_at', weekAgo.toISOString())

  // Get category and author counts
  const { count: totalCategories } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true })

  const { count: totalAuthors } = await supabase
    .from('authors')
    .select('*', { count: 'exact', head: true })

  return {
    totalPosts: totalPosts || 0,
    publishedPosts: publishedPosts || 0,
    draftPosts: draftPosts || 0,
    postsThisWeek: postsThisWeek || 0,
    totalCategories: totalCategories || 0,
    totalAuthors: totalAuthors || 0,
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

  const stats = await getStats()
  const recentPosts = await getRecentPosts()

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
            <div className={styles.statLabel}>This Week</div>
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
