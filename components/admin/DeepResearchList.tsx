'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { DeepResearch } from '@/types/deep-research'
import styles from './DeepResearchList.module.scss'

interface DeepResearchListProps {
  initialItems: DeepResearch[]
}

export function DeepResearchList({ initialItems }: DeepResearchListProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filteredItems = useMemo(() => {
    return initialItems.filter(item => {
      const matchesSearch =
        search === '' ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        (item.excerpt?.toLowerCase().includes(search.toLowerCase()) ?? false)
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [initialItems, search, statusFilter])

  async function handleDelete(slug: string) {
    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/deep-research/${slug}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setDeleteConfirm(null)
        router.refresh()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to delete deep research:', message)
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Deep Research</h1>
        <a href="/admin/deep-research/new" className={styles.newButton}>
          + New Deep Research
        </a>
      </div>

      <div className={styles.filters}>
        <input
          type="search"
          placeholder="Search by title or excerpt..."
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
      </div>

      <div className={styles.list}>
        {filteredItems.length === 0 ? (
          <div className={styles.emptyState}>
            {search || statusFilter !== 'all' ? (
              <p>No deep research matches your filters</p>
            ) : (
              <>
                <p>No deep research yet</p>
                <a href="/admin/deep-research/new" className={styles.createLink}>
                  Create your first deep research
                </a>
              </>
            )}
          </div>
        ) : (
          filteredItems.map(item => (
            <div key={item.id} className={styles.listItem}>
              <div className={styles.itemMain}>
                <div className={styles.itemHeader}>
                  <span
                    className={`${styles.statusBadge} ${item.status === 'published' ? styles.published : styles.draft}`}
                  >
                    {item.status}
                  </span>
                  <h3 className={styles.itemTitle}>{item.title}</h3>
                </div>
                <div className={styles.itemMeta}>
                  <span>
                    {item.status === 'published' && item.published_at
                      ? `Published ${formatDate(item.published_at)}`
                      : `Updated ${formatDate(item.updated_at)}`}
                  </span>
                </div>
              </div>

              <div className={styles.itemActions}>
                <Link href={`/admin/deep-research/${item.slug}/edit`} className={styles.editButton}>
                  Edit
                </Link>
                {item.status === 'published' && (
                  <Link
                    href={`/deep-research/${item.slug}`}
                    target="_blank"
                    className={styles.viewButton}
                  >
                    View ↗
                  </Link>
                )}
                <button onClick={() => setDeleteConfirm(item.slug)} className={styles.deleteButton}>
                  Delete
                </button>
              </div>

              {deleteConfirm === item.slug && (
                <div className={styles.deleteConfirm}>
                  <p>Delete &quot;{item.title}&quot;?</p>
                  <div className={styles.confirmActions}>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className={styles.cancelButton}
                      disabled={deleting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(item.slug)}
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
          Showing {filteredItems.length} of {initialItems.length} items
        </p>
      </div>
    </div>
  )
}
