'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AdminLead } from '@/types/admin'
import styles from './LeadList.module.scss'

interface LeadListProps {
  initialLeads: AdminLead[]
}

export function LeadList({ initialLeads }: LeadListProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [verifiedFilter, setVerifiedFilter] = useState<string>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filteredLeads = useMemo(() => {
    return initialLeads.filter(lead => {
      const matchesSearch =
        search === '' ||
        lead.first_name.toLowerCase().includes(search.toLowerCase()) ||
        lead.email.toLowerCase().includes(search.toLowerCase())

      const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter

      const matchesVerified =
        verifiedFilter === 'all' ||
        (verifiedFilter === 'verified' && lead.verified) ||
        (verifiedFilter === 'unverified' && !lead.verified)

      return matchesSearch && matchesSource && matchesVerified
    })
  }, [initialLeads, search, sourceFilter, verifiedFilter])

  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/leads/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setDeleteConfirm(null)
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to delete lead:', error)
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
        <h1 className={styles.title}>Leads</h1>
      </div>

      <div className={styles.filters}>
        <input
          type="search"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={styles.searchInput}
        />

        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Sources</option>
          <option value="vision_lab">Vision Lab</option>
          <option value="exercise_challenge">Exercise Challenge</option>
        </select>

        <select
          value={verifiedFilter}
          onChange={e => setVerifiedFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Status</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
        </select>
      </div>

      <div className={styles.list}>
        {filteredLeads.length === 0 ? (
          <div className={styles.emptyState}>
            {search || sourceFilter !== 'all' || verifiedFilter !== 'all' ? (
              <p>No leads match your filters</p>
            ) : (
              <p>No leads yet</p>
            )}
          </div>
        ) : (
          filteredLeads.map(lead => (
            <div key={lead.id} className={styles.listItem}>
              <Link href={`/admin/leads/${lead.id}`} className={styles.itemMain}>
                <div className={styles.itemHeader}>
                  <span
                    className={`${styles.sourceBadge} ${
                      lead.source === 'vision_lab' ? styles.visionLab : styles.exerciseChallenge
                    }`}
                  >
                    {lead.source === 'vision_lab' ? 'Vision Lab' : 'Exercise Challenge'}
                  </span>
                  <span
                    className={`${styles.statusBadge} ${lead.verified ? styles.verified : styles.unverified}`}
                  >
                    {lead.verified ? 'Verified' : 'Unverified'}
                  </span>
                  <h3 className={styles.itemTitle}>{lead.first_name}</h3>
                </div>
                <div className={styles.itemMeta}>
                  <span>{lead.email}</span>
                  <span>·</span>
                  <span>Created {formatDate(lead.created_at)}</span>
                </div>
              </Link>

              <div className={styles.itemActions}>
                <Link href={`/admin/leads/${lead.id}`} className={styles.viewButton}>
                  View
                </Link>
                <button onClick={() => setDeleteConfirm(lead.id)} className={styles.deleteButton}>
                  Delete
                </button>
              </div>

              {deleteConfirm === lead.id && (
                <div className={styles.deleteConfirm}>
                  <p>Delete lead &quot;{lead.first_name}&quot;?</p>
                  <div className={styles.confirmActions}>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className={styles.cancelButton}
                      disabled={deleting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(lead.id)}
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
          Showing {filteredLeads.length} of {initialLeads.length} leads
        </p>
      </div>
    </div>
  )
}
