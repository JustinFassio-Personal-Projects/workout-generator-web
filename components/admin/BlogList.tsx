'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Category } from '@/types/blog'
import styles from './BlogList.module.scss'

interface PostListItem {
  id: string
  slug: string
  title: string
  excerpt: string
  status: 'draft' | 'published'
  published_at: string | null
  created_at: string
  updated_at: string
  category: { id: string; name: string; slug: string } | null
  author: { id: string; name: string } | null
}

interface BlogListProps {
  initialPosts: PostListItem[]
  categories: Category[]
}

export function BlogList({ initialPosts, categories }: BlogListProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filteredPosts = useMemo(() => {
    return initialPosts.filter(post => {
      const matchesSearch =
        search === '' ||
        post.title.toLowerCase().includes(search.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(search.toLowerCase())

      const matchesStatus = statusFilter === 'all' || post.status === statusFilter

      const matchesCategory = categoryFilter === 'all' || post.category?.id === categoryFilter

      return matchesSearch && matchesStatus && matchesCategory
    })
  }, [initialPosts, search, statusFilter, categoryFilter])

  async function handleDelete(slug: string) {
    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/blog/${slug}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setDeleteConfirm(null)
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to delete post:', error)
    } finally {
      setDeleting(false)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function getWordCount(content: string) {
    return content.split(/\s+/).filter(w => w.length > 0).length
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Blog Posts</h1>
        <Link href="/admin/blog/new" className={styles.newButton}>
          + New Post
        </Link>
      </div>

      <div className={styles.filters}>
        <input
          type="search"
          placeholder="Search posts..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={styles.searchInput}
        />

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.list}>
        {filteredPosts.length === 0 ? (
          <div className={styles.emptyState}>
            {search || statusFilter !== 'all' || categoryFilter !== 'all' ? (
              <p>No posts match your filters</p>
            ) : (
              <>
                <p>No posts yet</p>
                <Link href="/admin/blog/new" className={styles.createLink}>
                  Create your first post
                </Link>
              </>
            )}
          </div>
        ) : (
          filteredPosts.map(post => (
            <div key={post.id} className={styles.listItem}>
              <div className={styles.itemMain}>
                <div className={styles.itemHeader}>
                  <span
                    className={`${styles.statusBadge} ${post.status === 'published' ? styles.published : styles.draft}`}
                  >
                    {post.status}
                  </span>
                  <h3 className={styles.itemTitle}>{post.title}</h3>
                </div>
                <div className={styles.itemMeta}>
                  <span>{post.category?.name || 'Uncategorized'}</span>
                  <span>·</span>
                  <span>{post.author?.name || 'Unknown'}</span>
                  <span>·</span>
                  <span>
                    {post.status === 'published' && post.published_at
                      ? `Published ${formatDate(post.published_at)}`
                      : `Updated ${formatDate(post.updated_at)}`}
                  </span>
                </div>
              </div>

              <div className={styles.itemActions}>
                <Link href={`/admin/blog/${post.slug}/edit`} className={styles.editButton}>
                  Edit
                </Link>
                {post.status === 'published' && (
                  <Link href={`/blog/${post.slug}`} target="_blank" className={styles.viewButton}>
                    View ↗
                  </Link>
                )}
                <button onClick={() => setDeleteConfirm(post.slug)} className={styles.deleteButton}>
                  Delete
                </button>
              </div>

              {deleteConfirm === post.slug && (
                <div className={styles.deleteConfirm}>
                  <p>Delete &quot;{post.title}&quot;?</p>
                  <div className={styles.confirmActions}>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className={styles.cancelButton}
                      disabled={deleting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(post.slug)}
                      className={styles.confirmDeleteButton}
                      disabled={deleting}
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className={styles.footer}>
        <p>
          Showing {filteredPosts.length} of {initialPosts.length} posts
        </p>
      </div>
    </div>
  )
}
