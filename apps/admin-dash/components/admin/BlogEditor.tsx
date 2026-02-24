'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Category, Author, Post } from '@/types/blog'
import styles from './BlogEditor.module.scss'

interface BlogEditorProps {
  post?: Post
  categories: Category[]
  authors: Author[]
}

export function BlogEditor({ post, categories, authors }: BlogEditorProps) {
  const router = useRouter()
  const isEditing = !!post

  const [title, setTitle] = useState(post?.title || '')
  const [slug, setSlug] = useState(post?.slug || '')
  const [excerpt, setExcerpt] = useState(post?.excerpt || '')
  const [content, setContent] = useState(post?.content || '')
  const [categoryId, setCategoryId] = useState(post?.category_id || categories[0]?.id || '')
  const [authorId, setAuthorId] = useState(post?.author_id || authors[0]?.id || '')
  const [tags, setTags] = useState<string[]>(post?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [featuredImage, setFeaturedImage] = useState(post?.featured_image || '')
  const [status, setStatus] = useState<'draft' | 'published'>(post?.status || 'draft')
  const [seoTitle, setSeoTitle] = useState(post?.seo_title || '')
  const [seoDescription, setSeoDescription] = useState(post?.seo_description || '')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Reinitialize state when post prop changes (e.g., navigating between posts)
  useEffect(() => {
    if (post) {
      setTitle(post.title || '')
      setSlug(post.slug || '')
      setExcerpt(post.excerpt || '')
      setContent(post.content || '')
      setCategoryId(post.category_id || categories[0]?.id || '')
      setAuthorId(post.author_id || authors[0]?.id || '')
      setTags(post.tags || [])
      setFeaturedImage(post.featured_image || '')
      setStatus(post.status || 'draft')
      setSeoTitle(post.seo_title || '')
      setSeoDescription(post.seo_description || '')
      setTagInput('')
      setError(null)
      setHasChanges(false)
      setLastSaved(null)
    } else {
      // Reset to empty state for new post
      setTitle('')
      setSlug('')
      setExcerpt('')
      setContent('')
      setCategoryId(categories[0]?.id || '')
      setAuthorId(authors[0]?.id || '')
      setTags([])
      setTagInput('')
      setFeaturedImage('')
      setStatus('draft')
      setSeoTitle('')
      setSeoDescription('')
      setError(null)
      setHasChanges(false)
      setLastSaved(null)
    }
  }, [post, categories, authors])

  // Track changes
  useEffect(() => {
    if (isEditing) {
      const changed =
        title !== post.title ||
        slug !== post.slug ||
        excerpt !== post.excerpt ||
        content !== post.content ||
        categoryId !== post.category_id ||
        authorId !== post.author_id ||
        JSON.stringify(tags) !== JSON.stringify(post.tags) ||
        featuredImage !== (post.featured_image || '') ||
        status !== post.status ||
        seoTitle !== (post.seo_title || '') ||
        seoDescription !== (post.seo_description || '')
      setHasChanges(changed)
    } else {
      setHasChanges(title !== '' || content !== '')
    }
  }, [
    title,
    slug,
    excerpt,
    content,
    categoryId,
    authorId,
    tags,
    featuredImage,
    status,
    seoTitle,
    seoDescription,
    post,
    isEditing,
  ])

  // Generate slug from title
  function generateSlug() {
    const newSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    setSlug(newSlug)
  }

  // Handle tag input
  function addTag(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const tag = tagInput.trim().toLowerCase()
      if (tag && !tags.includes(tag)) {
        setTags([...tags, tag])
      }
      setTagInput('')
    }
  }

  function removeTag(tagToRemove: string) {
    setTags(tags.filter(t => t !== tagToRemove))
  }

  // Handle image upload
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      const { url } = await response.json()
      setFeaturedImage(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  // Save post - wrapped in useCallback
  const handleSave = useCallback(
    async (publishStatus?: 'draft' | 'published') => {
      setSaving(true)
      setError(null)

      const finalStatus = publishStatus || status

      try {
        const postData = {
          title,
          slug,
          excerpt,
          content,
          category_id: categoryId,
          author_id: authorId,
          tags,
          featured_image: featuredImage || null,
          status: finalStatus,
          seo_title: seoTitle || null,
          seo_description: seoDescription || null,
        }

        const url = isEditing ? `/api/admin/blog/${post?.slug}` : '/api/admin/blog'
        const method = isEditing ? 'PUT' : 'POST'

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postData),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to save')
        }

        const { post: savedPost } = await response.json()

        setLastSaved(new Date())

        if (!isEditing || slug !== post?.slug) {
          router.push(`/admin/blog/${savedPost.slug}/edit`)
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
      content,
      categoryId,
      authorId,
      tags,
      featuredImage,
      status,
      seoTitle,
      seoDescription,
      isEditing,
      post?.slug,
      router,
    ]
  )

  // Auto-save drafts every 30 seconds when there are changes
  useEffect(() => {
    if (hasChanges && status === 'draft' && isEditing) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }

      autoSaveTimerRef.current = setTimeout(() => {
        handleSave('draft')
      }, 30000) // 30 seconds
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [hasChanges, status, isEditing, handleSave])

  // Keyboard shortcuts
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

  // Warn on unsaved changes
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

  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length
  const readingTime = Math.ceil(wordCount / 200)

  return (
    <div className={styles.editor}>
      <div className={styles.header}>
        <button onClick={() => router.push('/admin/blog')} className={styles.backButton}>
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
              placeholder="Post title"
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
              placeholder="post-url-slug"
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
              placeholder="Brief description for search results and previews..."
              rows={3}
              maxLength={300}
            />
          </div>

          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label className={styles.label}>Content</label>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className={styles.previewToggle}
              >
                {showPreview ? 'Edit' : 'Preview'}
              </button>
            </div>
            {showPreview ? (
              <div className={styles.preview}>
                <div
                  className={styles.previewContent}
                  dangerouslySetInnerHTML={{
                    __html: content
                      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
                      .replace(/\*(.*)\*/gim, '<em>$1</em>')
                      .replace(/\n/gim, '<br>'),
                  }}
                />
              </div>
            ) : (
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                className={styles.contentInput}
                placeholder="Write your post content in Markdown..."
                rows={20}
              />
            )}
            <div className={styles.contentMeta}>
              {wordCount} words · ~{readingTime} min read
            </div>
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
            <h3 className={styles.sidebarTitle}>Category</h3>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className={styles.select}
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.sidebarSection}>
            <h3 className={styles.sidebarTitle}>Author</h3>
            <select
              value={authorId}
              onChange={e => setAuthorId(e.target.value)}
              className={styles.select}
            >
              {authors.map(author => (
                <option key={author.id} value={author.id}>
                  {author.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.sidebarSection}>
            <h3 className={styles.sidebarTitle}>Tags</h3>
            <div className={styles.tagsContainer}>
              {tags.map(tag => (
                <span key={tag} className={styles.tag}>
                  {tag}
                  <button onClick={() => removeTag(tag)} className={styles.tagRemove}>
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={addTag}
              className={styles.tagInput}
              placeholder="Add tag and press Enter"
            />
          </div>

          <div className={styles.sidebarSection}>
            <h3 className={styles.sidebarTitle}>Featured Image</h3>
            {featuredImage ? (
              <div className={styles.imagePreview}>
                <Image
                  src={featuredImage}
                  alt="Featured"
                  className={styles.previewImage}
                  width={280}
                  height={120}
                  unoptimized={featuredImage.startsWith('http')}
                />
                <button onClick={() => setFeaturedImage('')} className={styles.removeImage}>
                  Remove
                </button>
              </div>
            ) : (
              <label className={styles.uploadLabel}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className={styles.fileInput}
                  disabled={uploading}
                />
                <span className={styles.uploadButton}>
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </span>
              </label>
            )}
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
                rows={2}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
