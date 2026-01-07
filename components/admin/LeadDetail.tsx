'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AdminLeadWithRelations } from '@/types/admin'
import { Check, X } from 'lucide-react'
import styles from './LeadDetail.module.scss'

interface LeadDetailProps {
  lead: AdminLeadWithRelations
}

export function LeadDetail({ lead }: LeadDetailProps) {
  const router = useRouter()
  const [verified, setVerified] = useState(lead.verified)
  const [updating, setUpdating] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleToggleVerified() {
    setUpdating(true)
    try {
      const response = await fetch(`/api/admin/leads/${lead.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ verified: !verified }),
      })

      if (response.ok) {
        setVerified(!verified)
      }
    } catch (error) {
      console.error('Failed to update verification status:', error)
    } finally {
      setUpdating(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/leads/${lead.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.push('/admin/leads')
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
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <Link href="/admin/leads" className={styles.backLink}>
            ← Back to Leads
          </Link>
          <h1 className={styles.title}>{lead.first_name}</h1>
          <p className={styles.email}>{lead.email}</p>
        </div>
        <div className={styles.headerActions}>
          <button
            onClick={handleToggleVerified}
            disabled={updating}
            className={`${styles.verifyButton} ${verified ? styles.verified : styles.unverified}`}
          >
            {verified ? (
              <>
                <Check size={16} />
                Verified
              </>
            ) : (
              <>
                <X size={16} />
                Unverified
              </>
            )}
          </button>
          <button onClick={() => setDeleteConfirm(true)} className={styles.deleteButton}>
            Delete Lead
          </button>
        </div>
      </div>

      {deleteConfirm && (
        <div className={styles.deleteConfirmOverlay}>
          <div className={styles.deleteConfirm}>
            <p>Are you sure you want to delete this lead?</p>
            <p className={styles.deleteWarning}>
              This will also delete all related vision intel and exercise submissions.
            </p>
            <div className={styles.confirmActions}>
              <button
                onClick={() => setDeleteConfirm(false)}
                className={styles.cancelButton}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className={styles.confirmDeleteButton}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.content}>
        {/* Lead Information Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Lead Information</h2>
          <div className={styles.card}>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Name</span>
                <span className={styles.infoValue}>{lead.first_name}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Email</span>
                <span className={styles.infoValue}>{lead.email}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Source</span>
                <span
                  className={`${styles.badge} ${
                    lead.source === 'vision_lab' ? styles.visionLab : styles.exerciseChallenge
                  }`}
                >
                  {lead.source === 'vision_lab' ? 'Vision Lab' : 'Exercise Challenge'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Verification Status</span>
                <span
                  className={`${styles.badge} ${verified ? styles.verified : styles.unverified}`}
                >
                  {verified ? 'Verified' : 'Unverified'}
                </span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Created</span>
                <span className={styles.infoValue}>{formatDate(lead.created_at)}</span>
              </div>
            </div>

            {(lead.utm_source || lead.utm_campaign || lead.utm_medium || lead.referrer) && (
              <div className={styles.subsection}>
                <h3 className={styles.subsectionTitle}>Tracking Information</h3>
                <div className={styles.infoGrid}>
                  {lead.utm_source && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>UTM Source</span>
                      <span className={styles.infoValue}>{lead.utm_source}</span>
                    </div>
                  )}
                  {lead.utm_campaign && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>UTM Campaign</span>
                      <span className={styles.infoValue}>{lead.utm_campaign}</span>
                    </div>
                  )}
                  {lead.utm_medium && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>UTM Medium</span>
                      <span className={styles.infoValue}>{lead.utm_medium}</span>
                    </div>
                  )}
                  {lead.referrer && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Referrer</span>
                      <span className={styles.infoValue}>{lead.referrer}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Consent & Interests</h3>
              <div className={styles.consentGrid}>
                <div className={styles.consentItem}>
                  <span className={styles.consentLabel}>Follow-up Consent</span>
                  <span className={lead.consent_follow_up ? styles.consentYes : styles.consentNo}>
                    {lead.consent_follow_up ? <Check size={16} /> : <X size={16} />}
                    {lead.consent_follow_up ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className={styles.consentItem}>
                  <span className={styles.consentLabel}>Email Plan Consent</span>
                  <span className={lead.consent_email_plan ? styles.consentYes : styles.consentNo}>
                    {lead.consent_email_plan ? <Check size={16} /> : <X size={16} />}
                    {lead.consent_email_plan ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className={styles.consentItem}>
                  <span className={styles.consentLabel}>Coaching Interest</span>
                  <span className={lead.coaching_interest ? styles.consentYes : styles.consentNo}>
                    {lead.coaching_interest ? <Check size={16} /> : <X size={16} />}
                    {lead.coaching_interest ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Vision Lead Intel Section */}
        {lead.vision_lead_intel && lead.vision_lead_intel.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Vision Lead Intel</h2>
            {lead.vision_lead_intel.map(intel => (
              <div key={intel.id} className={styles.card}>
                {intel.image_url && (
                  <div className={styles.imageContainer}>
                    <img src={intel.image_url} alt="Vision prompt" className={styles.image} />
                  </div>
                )}
                <div className={styles.infoGrid}>
                  {intel.vision_prompt && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Vision Prompt</span>
                      <span className={styles.infoValue}>{intel.vision_prompt}</span>
                    </div>
                  )}
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Primary Goal</span>
                    <span className={styles.infoValue}>{intel.goal_primary}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Primary Frustration</span>
                    <span className={styles.infoValue}>{intel.frustration_primary}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>AI Expectation</span>
                    <span className={styles.infoValue}>{intel.ai_expectation_primary}</span>
                  </div>
                  {intel.payment_trigger_primary && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Payment Trigger</span>
                      <span className={styles.infoValue}>{intel.payment_trigger_primary}</span>
                    </div>
                  )}
                  {intel.expectation_free_text && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Expectation (Free Text)</span>
                      <span className={styles.infoValue}>{intel.expectation_free_text}</span>
                    </div>
                  )}
                  {intel.exercise_suggestion && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Exercise Suggestion</span>
                      <span className={styles.infoValue}>{intel.exercise_suggestion}</span>
                    </div>
                  )}
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Created</span>
                    <span className={styles.infoValue}>{formatDate(intel.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Exercise Submissions Section */}
        {lead.exercise_submissions && lead.exercise_submissions.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Exercise Submissions</h2>
            {lead.exercise_submissions.map(submission => (
              <div key={submission.id} className={styles.card}>
                <div className={styles.submissionHeader}>
                  <h3 className={styles.submissionTitle}>{submission.exercise_name}</h3>
                  <span
                    className={`${styles.statusBadge} ${
                      submission.status === 'accepted'
                        ? styles.accepted
                        : submission.status === 'rejected'
                          ? styles.rejected
                          : submission.status === 'reviewing'
                            ? styles.reviewing
                            : styles.new
                    }`}
                  >
                    {submission.status}
                  </span>
                </div>
                <div className={styles.infoGrid}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Category</span>
                    <span className={styles.infoValue}>{submission.category}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Equipment</span>
                    <span className={styles.infoValue}>{submission.equipment}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Difficulty</span>
                    <span className={styles.infoValue}>{submission.difficulty}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Movement Pattern</span>
                    <span className={styles.infoValue}>{submission.movement_pattern}</span>
                  </div>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Primary Muscles</span>
                    <span className={styles.infoValue}>
                      {submission.primary_muscles.join(', ')}
                    </span>
                  </div>
                  {submission.technique_cues && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Technique Cues</span>
                      <span className={styles.infoValue}>{submission.technique_cues}</span>
                    </div>
                  )}
                  {submission.safety_notes && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Safety Notes</span>
                      <span className={styles.infoValue}>{submission.safety_notes}</span>
                    </div>
                  )}
                  {submission.rationale && (
                    <div className={styles.infoItem}>
                      <span className={styles.infoLabel}>Rationale</span>
                      <span className={styles.infoValue}>{submission.rationale}</span>
                    </div>
                  )}
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Created</span>
                    <span className={styles.infoValue}>{formatDate(submission.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  )
}
