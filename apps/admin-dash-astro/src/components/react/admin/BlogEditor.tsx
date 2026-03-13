/**
 * Blog post editor (create/edit). Fetches post + categories + authors from API.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  created_at: string;
}

interface Author {
  id: string;
  name: string;
  slug: string;
  bio?: string | null;
  avatar?: string | null;
  created_at: string;
}

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category_id: string | null;
  author_id: string | null;
  tags: string[];
  featured_image: string | null;
  status: 'draft' | 'published';
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
  category?: Category | null;
  author?: Author | null;
}

const BlogEditor: React.FC = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const isEditing = !!slug;

  const [post, setPost] = useState<Post | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [slugVal, setSlugVal] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [authorId, setAuthorId] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        if (isEditing && slug) {
          const res = await fetch(`/api/admin/blog/${slug}`);
          if (!res.ok) {
            if (res.status === 404) {
              toast.error('Post not found');
              navigate('/blog');
              return;
            }
            throw new Error('Failed to fetch post');
          }
          const data = await res.json();
          setPost(data.post);
          setCategories(data.categories || []);
          setAuthors(data.authors || []);
          const p = data.post;
          setTitle(p.title || '');
          setSlugVal(p.slug || '');
          setExcerpt(p.excerpt || '');
          setContent(p.content || '');
          setCategoryId(p.category_id || data.categories?.[0]?.id || '');
          setAuthorId(p.author_id || data.authors?.[0]?.id || '');
          setTags(p.tags || []);
          setFeaturedImage(p.featured_image || '');
          setStatus(p.status || 'draft');
          setSeoTitle(p.seo_title || '');
          setSeoDescription(p.seo_description || '');
        } else {
          const res = await fetch('/api/admin/blog');
          if (!res.ok) throw new Error('Failed to fetch');
          const data = await res.json();
          setCategories(data.categories || []);
          setAuthors(data.authors || []);
          setCategoryId(data.categories?.[0]?.id || '');
          setAuthorId(data.authors?.[0]?.id || '');
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to load');
        navigate('/blog');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isEditing, slug, navigate]);

  useEffect(() => {
    if (!isEditing || !post) return;
    const changed =
      title !== post.title ||
      slugVal !== post.slug ||
      excerpt !== post.excerpt ||
      content !== post.content ||
      categoryId !== (post.category_id || '') ||
      authorId !== (post.author_id || '') ||
      JSON.stringify(tags) !== JSON.stringify(post.tags) ||
      featuredImage !== (post.featured_image || '') ||
      status !== post.status ||
      seoTitle !== (post.seo_title || '') ||
      seoDescription !== (post.seo_description || '');
    setHasChanges(changed);
  }, [
    title,
    slugVal,
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
  ]);

  useEffect(() => {
    if (!isEditing) setHasChanges(title !== '' || content !== '');
  }, [isEditing, title, content]);

  function generateSlug() {
    const newSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setSlugVal(newSlug);
  }

  function addTag(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase();
      if (tag && !tags.includes(tag)) setTags([...tags, tag]);
      setTagInput('');
    }
  }

  function removeTag(tagToRemove: string) {
    setTags(tags.filter((t) => t !== tagToRemove));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }
      const { url } = await res.json();
      setFeaturedImage(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  const handleSave = useCallback(
    async (publishStatus?: 'draft' | 'published') => {
      setSaving(true);
      setError(null);
      const finalStatus = publishStatus || status;
      try {
        const postData = {
          title,
          slug: slugVal,
          excerpt,
          content,
          category_id: categoryId || null,
          author_id: authorId || null,
          tags,
          featured_image: featuredImage || null,
          status: finalStatus,
          seo_title: seoTitle || null,
          seo_description: seoDescription || null,
        };

        const url = isEditing ? `/api/admin/blog/${slug}` : '/api/admin/blog';
        const method = isEditing ? 'PUT' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(postData),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to save');
        }

        const { post: savedPost } = await res.json();
        setLastSaved(new Date());
        setPost(savedPost);

        if (!isEditing || slugVal !== slug) {
          navigate(`/blog/${savedPost.slug}/edit`);
        }
        toast.success('Saved');
        setHasChanges(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save');
        toast.error(err instanceof Error ? err.message : 'Failed to save');
      } finally {
        setSaving(false);
      }
    },
    [
      title,
      slugVal,
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
      slug,
      navigate,
    ]
  );

  useEffect(() => {
    if (hasChanges && status === 'draft' && isEditing) {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => handleSave('draft'), 30000);
    }
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [hasChanges, status, isEditing, handleSave]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        handleSave('published');
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave]);

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (hasChanges) {
        e.preventDefault();
        (e as { returnValue?: string }).returnValue = '';
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasChanges]);

  const wordCount = content.split(/\s+/).filter((w) => w.length > 0).length;
  const readingTime = Math.ceil(wordCount / 200);

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-white/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/blog"
          className="flex items-center gap-2 text-white/70 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </Link>
        <div className="flex items-center gap-3">
          {lastSaved && !hasChanges && (
            <span className="text-sm text-green-400">Saved {lastSaved.toLocaleTimeString()}</span>
          )}
          {hasChanges && <span className="text-sm text-amber-400">Unsaved changes</span>}
          <button
            type="button"
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="rounded border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={() => handleSave('published')}
            disabled={saving}
            className="rounded border border-orange-light/50 bg-orange-light/10 px-4 py-2 text-sm font-medium text-orange-light transition-colors hover:bg-orange-light/20 disabled:opacity-50"
          >
            {saving ? 'Saving...' : status === 'published' ? 'Update' : 'Publish'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-500/30 bg-red-500/10 p-4 text-red-400">{error}</div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-white/80">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-white/20 bg-white/5 px-4 py-2 text-white placeholder-white/40 focus:border-orange-light/50 focus:outline-none focus:ring-1 focus:ring-orange-light/50"
              placeholder="Post title"
            />
          </div>

          <div>
            <label className="mb-1 flex items-center justify-between text-sm font-medium text-white/80">
              <span>Slug</span>
              <button
                type="button"
                onClick={generateSlug}
                className="text-orange-light text-xs hover:underline"
              >
                Generate
              </button>
            </label>
            <input
              type="text"
              value={slugVal}
              onChange={(e) => setSlugVal(e.target.value)}
              className="w-full rounded border border-white/20 bg-white/5 px-4 py-2 text-white placeholder-white/40 focus:border-orange-light/50 focus:outline-none"
              placeholder="post-url-slug"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-white/80">
              Excerpt <span className="text-white/50">({excerpt.length}/160)</span>
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              className="w-full rounded border border-white/20 bg-white/5 px-4 py-2 text-white placeholder-white/40 focus:border-orange-light/50 focus:outline-none"
              placeholder="Brief description for search results..."
              rows={3}
              maxLength={300}
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-sm font-medium text-white/80">Content</label>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-orange-light text-xs hover:underline"
              >
                {showPreview ? 'Edit' : 'Preview'}
              </button>
            </div>
            {showPreview ? (
              <div
                className="prose prose-invert max-w-none rounded border border-white/20 bg-white/5 p-4"
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
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full rounded border border-white/20 bg-white/5 px-4 py-2 font-mono text-sm text-white placeholder-white/40 focus:border-orange-light/50 focus:outline-none"
                placeholder="Write your post content in Markdown..."
                rows={20}
              />
            )}
            <p className="mt-1 text-xs text-white/50">
              {wordCount} words · ~{readingTime} min read
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded border border-white/10 bg-white/5 p-4">
            <h3 className="mb-3 font-medium text-white">Status</h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="status"
                  value="draft"
                  checked={status === 'draft'}
                  onChange={() => setStatus('draft')}
                />
                <span>Draft</span>
              </label>
              <label className="flex items-center gap-2">
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

          <div className="rounded border border-white/10 bg-white/5 p-4">
            <h3 className="mb-2 font-medium text-white">Category</h3>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded border border-white/20 bg-white/5 px-3 py-2 text-white focus:border-orange-light/50 focus:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded border border-white/10 bg-white/5 p-4">
            <h3 className="mb-2 font-medium text-white">Author</h3>
            <select
              value={authorId}
              onChange={(e) => setAuthorId(e.target.value)}
              className="w-full rounded border border-white/20 bg-white/5 px-3 py-2 text-white focus:border-orange-light/50 focus:outline-none"
            >
              {authors.map((author) => (
                <option key={author.id} value={author.id}>
                  {author.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded border border-white/10 bg-white/5 p-4">
            <h3 className="mb-2 font-medium text-white">Tags</h3>
            <div className="mb-2 flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-sm"
                >
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-white/60 hover:text-white">
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={addTag}
              className="w-full rounded border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-orange-light/50 focus:outline-none"
              placeholder="Add tag and press Enter"
            />
          </div>

          <div className="rounded border border-white/10 bg-white/5 p-4">
            <h3 className="mb-2 font-medium text-white">Featured Image</h3>
            {featuredImage ? (
              <div>
                <img
                  src={featuredImage}
                  alt="Featured"
                  className="mb-2 max-h-32 rounded object-cover"
                />
                <button
                  type="button"
                  onClick={() => setFeaturedImage('')}
                  className="text-sm text-red-400 hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="sr-only"
                  disabled={uploading}
                />
                <span className="inline-block rounded border border-white/20 bg-white/5 px-4 py-2 text-sm text-white transition-colors hover:bg-white/10">
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </span>
              </label>
            )}
          </div>

          <div className="rounded border border-white/10 bg-white/5 p-4">
            <h3 className="mb-3 font-medium text-white">SEO Overrides</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-white/60">Meta Title</label>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  className="w-full rounded border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-orange-light/50 focus:outline-none"
                  placeholder="Custom SEO title"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/60">Meta Description</label>
                <textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  className="w-full rounded border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/40 focus:border-orange-light/50 focus:outline-none"
                  placeholder="Custom meta description"
                  rows={2}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogEditor;
