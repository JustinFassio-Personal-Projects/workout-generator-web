'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { parsePastedHtml } from '@/lib/deep-research/parse-html'
import type { DeepResearch } from '@/types/deep-research'
import {
  equipmentZoneOptions,
  experienceOptions,
  injuryOptions,
  goalOptions,
  dietTypeOptions,
  nutritionGoalOptions,
  dietaryRestrictionOptions,
  macroFocusOptions,
  DAYS_PER_WEEK_MIN,
  DAYS_PER_WEEK_MAX,
} from '@/data/deep-research-profile-options'
import styles from './DeepResearchEditor.module.scss'

interface DeepResearchEditorProps {
  item?: DeepResearch
}

function toggleArray(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]
}

export function DeepResearchEditor({ item }: DeepResearchEditorProps) {
  const router = useRouter()
  const isEditing = !!item

  const [title, setTitle] = useState(item?.title || '')
  const [slug, setSlug] = useState(item?.slug || '')
  const [excerpt, setExcerpt] = useState(item?.excerpt || '')
  const [htmlContent, setHtmlContent] = useState(item?.html_content || '')
  const [seoTitle, setSeoTitle] = useState(item?.seo_title || '')
  const [seoDescription, setSeoDescription] = useState(item?.seo_description || '')
  const [status, setStatus] = useState<'draft' | 'published'>(item?.status || 'draft')
  const [equipmentZones, setEquipmentZones] = useState<string[]>(item?.equipment_zones || [])
  const [experienceLevels, setExperienceLevels] = useState<string[]>(item?.experience_levels || [])
  const [injuriesAddressed, setInjuriesAddressed] = useState<string[]>(
    item?.injuries_addressed || []
  )
  const [goals, setGoals] = useState<string[]>(item?.goals || [])
  const [daysPerWeekMin, setDaysPerWeekMin] = useState<number | null>(
    item?.days_per_week_min ?? null
  )
  const [daysPerWeekMax, setDaysPerWeekMax] = useState<number | null>(
    item?.days_per_week_max ?? null
  )
  const [dietTypes, setDietTypes] = useState<string[]>(item?.diet_types || [])
  const [nutritionGoals, setNutritionGoals] = useState<string[]>(item?.nutrition_goals || [])
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>(
    item?.dietary_restrictions || []
  )
  const [macroFocus, setMacroFocus] = useState<string[]>(item?.macro_focus || [])

  const [showPreview, setShowPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (item) {
      setTitle(item.title)
      setSlug(item.slug)
      setExcerpt(item.excerpt || '')
      setHtmlContent(item.html_content)
      setSeoTitle(item.seo_title || '')
      setSeoDescription(item.seo_description || '')
      setStatus(item.status)
      setEquipmentZones(item.equipment_zones || [])
      setExperienceLevels(item.experience_levels || [])
      setInjuriesAddressed(item.injuries_addressed || [])
      setGoals(item.goals || [])
      setDaysPerWeekMin(item.days_per_week_min ?? null)
      setDaysPerWeekMax(item.days_per_week_max ?? null)
      setDietTypes(item.diet_types || [])
      setNutritionGoals(item.nutrition_goals || [])
      setDietaryRestrictions(item.dietary_restrictions || [])
      setMacroFocus(item.macro_focus || [])
      setError(null)
      setHasChanges(false)
      setLastSaved(null)
    } else {
      setTitle('')
      setSlug('')
      setExcerpt('')
      setHtmlContent('')
      setSeoTitle('')
      setSeoDescription('')
      setStatus('draft')
      setEquipmentZones([])
      setExperienceLevels([])
      setInjuriesAddressed([])
      setGoals([])
      setDaysPerWeekMin(null)
      setDaysPerWeekMax(null)
      setDietTypes([])
      setNutritionGoals([])
      setDietaryRestrictions([])
      setMacroFocus([])
      setError(null)
      setHasChanges(false)
      setLastSaved(null)
    }
  }, [item])

  useEffect(() => {
    if (isEditing && item) {
      const changed =
        title !== item.title ||
        slug !== item.slug ||
        excerpt !== (item.excerpt || '') ||
        htmlContent !== item.html_content ||
        seoTitle !== (item.seo_title || '') ||
        seoDescription !== (item.seo_description || '') ||
        status !== item.status ||
        JSON.stringify(equipmentZones) !== JSON.stringify(item.equipment_zones || []) ||
        JSON.stringify(experienceLevels) !== JSON.stringify(item.experience_levels || []) ||
        JSON.stringify(injuriesAddressed) !== JSON.stringify(item.injuries_addressed || []) ||
        JSON.stringify(goals) !== JSON.stringify(item.goals || []) ||
        daysPerWeekMin !== (item.days_per_week_min ?? null) ||
        daysPerWeekMax !== (item.days_per_week_max ?? null) ||
        JSON.stringify(dietTypes) !== JSON.stringify(item.diet_types || []) ||
        JSON.stringify(nutritionGoals) !== JSON.stringify(item.nutrition_goals || []) ||
        JSON.stringify(dietaryRestrictions) !== JSON.stringify(item.dietary_restrictions || []) ||
        JSON.stringify(macroFocus) !== JSON.stringify(item.macro_focus || [])
      setHasChanges(changed)
    } else {
      setHasChanges(title !== '' || htmlContent !== '')
    }
  }, [
    title,
    slug,
    excerpt,
    htmlContent,
    seoTitle,
    seoDescription,
    status,
    equipmentZones,
    experienceLevels,
    injuriesAddressed,
    goals,
    daysPerWeekMin,
    daysPerWeekMax,
    dietTypes,
    nutritionGoals,
    dietaryRestrictions,
    macroFocus,
    item,
    isEditing,
  ])

  function generateSlug() {
    const newSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    setSlug(newSlug)
  }

  function handleParseFromHtml() {
    if (!htmlContent.trim()) return
    const parsed = parsePastedHtml(htmlContent)
    if (parsed.title) setTitle(parsed.title)
    if (parsed.excerpt) setExcerpt(parsed.excerpt)
    if (parsed.bodyHtml) setHtmlContent(parsed.bodyHtml)
    if (parsed.title && !slug) {
      setSlug(
        parsed.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      )
    }
  }

  const handleSave = useCallback(
    async (publishStatus?: 'draft' | 'published') => {
      setSaving(true)
      setError(null)
      const finalStatus = publishStatus || status

      try {
        const payload = {
          title,
          slug,
          excerpt,
          html_content: htmlContent,
          seo_title: seoTitle || null,
          seo_description: seoDescription || null,
          status: finalStatus,
          equipment_zones: equipmentZones,
          experience_levels: experienceLevels,
          injuries_addressed: injuriesAddressed,
          goals,
          days_per_week_min: daysPerWeekMin,
          days_per_week_max: daysPerWeekMax,
          diet_types: dietTypes,
          nutrition_goals: nutritionGoals,
          dietary_restrictions: dietaryRestrictions,
          macro_focus: macroFocus,
        }

        const url = isEditing
          ? `/api/admin/deep-research/${item?.slug}`
          : '/api/admin/deep-research'
        const method = isEditing ? 'PUT' : 'POST'

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to save')
        }

        const { item: savedItem } = await response.json()
        setLastSaved(new Date())

        if (!isEditing || slug !== item?.slug) {
          router.push(`/admin/deep-research/${savedItem.slug}/edit`)
        }
        router.refresh()
        setHasChanges(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save')
      } finally {
        setSaving(false)
      }
    },
    [
      title,
      slug,
      excerpt,
      htmlContent,
      seoTitle,
      seoDescription,
      status,
      equipmentZones,
      experienceLevels,
      injuriesAddressed,
      goals,
      daysPerWeekMin,
      daysPerWeekMax,
      dietTypes,
      nutritionGoals,
      dietaryRestrictions,
      macroFocus,
      isEditing,
      item?.slug,
      router,
    ]
  )

  useEffect(() => {
    if (hasChanges && status === 'draft' && isEditing) {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = setTimeout(() => handleSave('draft'), 30000)
    }
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [hasChanges, status, isEditing, handleSave])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault()
        handleSave('published')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSave])

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (hasChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasChanges])

  return (
    <div className={styles.editor}>
      <div className={styles.header}>
        <button onClick={() => router.push('/admin/deep-research')} className={styles.backButton}>
          ← Back
        </button>
        <div className={styles.headerActions}>
          {lastSaved && !hasChanges && (
            <span className={styles.savedBadge}>Saved {lastSaved.toLocaleTimeString()}</span>
          )}
          {hasChanges && <span className={styles.unsavedBadge}>Unsaved changes</span>}
          <button
            onClick={() => handleSave('draft')}
            className={styles.saveButton}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={() => handleSave('published')}
            className={styles.publishButton}
            disabled={saving}
          >
            {saving ? 'Saving...' : status === 'published' ? 'Update' : 'Publish'}
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.main}>
        <div className={styles.contentArea}>
          <div className={styles.field}>
            <label className={styles.label}>Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className={styles.titleInput}
              placeholder="Deep research title"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              Slug
              <button type="button" onClick={generateSlug} className={styles.generateButton}>
                Generate ↻
              </button>
            </label>
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              className={styles.input}
              placeholder="url-slug"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              Excerpt
              <span className={styles.charCount}>{excerpt.length}/160</span>
            </label>
            <textarea
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              className={styles.excerptInput}
              placeholder="Brief description for cards and SEO..."
              rows={3}
              maxLength={300}
            />
          </div>

          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label className={styles.label}>HTML Content</label>
              <div className={styles.htmlActions}>
                <button type="button" onClick={handleParseFromHtml} className={styles.parseButton}>
                  Parse from HTML
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className={styles.previewToggle}
                >
                  {showPreview ? 'Edit' : 'Preview'}
                </button>
              </div>
            </div>
            <p className={styles.helperText}>
              Paste full HTML. Use &quot;Parse from HTML&quot; to extract title, excerpt, and body.
              Scripts (e.g. Chart.js) load on the public page.
            </p>
            {showPreview ? (
              <div className={styles.preview} dangerouslySetInnerHTML={{ __html: htmlContent }} />
            ) : (
              <textarea
                value={htmlContent}
                onChange={e => setHtmlContent(e.target.value)}
                className={styles.contentInput}
                placeholder="Paste your HTML here..."
                rows={20}
                spellCheck={false}
              />
            )}
          </div>
        </div>

        <div className={styles.sidebar}>
          <div className={styles.sidebarSection}>
            <h3 className={styles.sidebarTitle}>Status</h3>
            <div className={styles.statusOptions}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="status"
                  value="draft"
                  checked={status === 'draft'}
                  onChange={() => setStatus('draft')}
                />
                <span>Draft</span>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="status"
                  value="published"
                  checked={status === 'published'}
                  onChange={() => setStatus('published')}
                />
                <span>Published</span>
              </label>
            </div>
          </div>

          <div className={styles.sidebarSection}>
            <h3 className={styles.sidebarTitle}>Profile Metadata (for filtering)</h3>
            <div className={styles.metaField}>
              <label className={styles.smallLabel}>Equipment zones</label>
              <div className={styles.chipGroup}>
                {equipmentZoneOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.chip} ${equipmentZones.includes(opt.value) ? styles.chipActive : ''}`}
                    onClick={() => setEquipmentZones(prev => toggleArray(prev, opt.value))}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.metaField}>
              <label className={styles.smallLabel}>Experience levels</label>
              <div className={styles.chipGroup}>
                {experienceOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.chip} ${experienceLevels.includes(opt.value) ? styles.chipActive : ''}`}
                    onClick={() => setExperienceLevels(prev => toggleArray(prev, opt.value))}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.metaField}>
              <label className={styles.smallLabel}>Injuries addressed</label>
              <div className={styles.chipGroup}>
                {injuryOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.chip} ${injuriesAddressed.includes(opt.value) ? styles.chipActive : ''}`}
                    onClick={() => setInjuriesAddressed(prev => toggleArray(prev, opt.value))}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.metaField}>
              <label className={styles.smallLabel}>Goals</label>
              <div className={styles.chipGroup}>
                {goalOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.chip} ${goals.includes(opt.value) ? styles.chipActive : ''}`}
                    onClick={() => setGoals(prev => toggleArray(prev, opt.value))}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.metaField}>
              <label className={styles.smallLabel}>Days per week (min/max)</label>
              <div className={styles.rangeRow}>
                <input
                  type="number"
                  min={DAYS_PER_WEEK_MIN}
                  max={DAYS_PER_WEEK_MAX}
                  value={daysPerWeekMin ?? ''}
                  onChange={e => {
                    const v = e.target.value ? parseInt(e.target.value, 10) : null
                    setDaysPerWeekMin(v && !isNaN(v) ? v : null)
                  }}
                  placeholder="Min"
                  className={styles.rangeInput}
                />
                <span>–</span>
                <input
                  type="number"
                  min={DAYS_PER_WEEK_MIN}
                  max={DAYS_PER_WEEK_MAX}
                  value={daysPerWeekMax ?? ''}
                  onChange={e => {
                    const v = e.target.value ? parseInt(e.target.value, 10) : null
                    setDaysPerWeekMax(v && !isNaN(v) ? v : null)
                  }}
                  placeholder="Max"
                  className={styles.rangeInput}
                />
              </div>
            </div>
            <div className={styles.metaField}>
              <label className={styles.smallLabel}>Diet types</label>
              <div className={styles.chipGroup}>
                {dietTypeOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.chip} ${dietTypes.includes(opt.value) ? styles.chipActive : ''}`}
                    onClick={() => setDietTypes(prev => toggleArray(prev, opt.value))}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.metaField}>
              <label className={styles.smallLabel}>Nutrition goals</label>
              <div className={styles.chipGroup}>
                {nutritionGoalOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.chip} ${nutritionGoals.includes(opt.value) ? styles.chipActive : ''}`}
                    onClick={() => setNutritionGoals(prev => toggleArray(prev, opt.value))}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.metaField}>
              <label className={styles.smallLabel}>Dietary restrictions</label>
              <div className={styles.chipGroup}>
                {dietaryRestrictionOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.chip} ${dietaryRestrictions.includes(opt.value) ? styles.chipActive : ''}`}
                    onClick={() => setDietaryRestrictions(prev => toggleArray(prev, opt.value))}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.metaField}>
              <label className={styles.smallLabel}>Macro focus</label>
              <div className={styles.chipGroup}>
                {macroFocusOptions.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.chip} ${macroFocus.includes(opt.value) ? styles.chipActive : ''}`}
                    onClick={() => setMacroFocus(prev => toggleArray(prev, opt.value))}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.sidebarSection}>
            <h3 className={styles.sidebarTitle}>SEO Overrides</h3>
            <div className={styles.field}>
              <label className={styles.smallLabel}>Meta Title</label>
              <input
                type="text"
                value={seoTitle}
                onChange={e => setSeoTitle(e.target.value)}
                className={styles.input}
                placeholder="Custom SEO title"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.smallLabel}>Meta Description</label>
              <textarea
                value={seoDescription}
                onChange={e => setSeoDescription(e.target.value)}
                className={styles.input}
                placeholder="Custom meta description"
                rows={3}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
