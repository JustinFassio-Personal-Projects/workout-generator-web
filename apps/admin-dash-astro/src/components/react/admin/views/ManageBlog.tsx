/**
 * Blog list and management UI. Fetches from /api/admin/blog.
 * Passes status, category, search as query params for server-side filtering.
 * Search is debounced (300ms) to avoid API request per keystroke.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';

const DEBOUNCE_MS = 300;

/** Augments fetch init with Bearer token and credentials (mirrors BlogEditor/ManageDeepResearch). */
async function authFetchInit(init: RequestInit = {}): Promise<RequestInit> {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
  return { ...init, headers, credentials: 'include' as RequestCredentials };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  created_at: string;
}

interface PostListItem {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string;
  updated_at: string;
  category: { id: string; name: string; slug: string } | null;
  author: { id: string; name: string } | null;
}

const siteUrl = (import.meta as { env?: Record<string, string> }).env?.PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com';
const blogBase = siteUrl.replace(/\/$/, '');

const ManageBlog: React.FC = () => {
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
      if (categoryFilter && categoryFilter !== 'all') params.set('category', categoryFilter);
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      const queryString = params.toString();
      const url = queryString ? `/api/admin/blog?${queryString}` : '/api/admin/blog';
      const res = await fetch(url, await authFetchInit());
      if (!res.ok) throw new Error('Failed to fetch posts');
      const data = await res.json();
      setPosts(data.posts || []);
      setCategories(data.categories || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, debouncedSearch]);

  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [search]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  async function handleDelete(slug: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/blog/${slug}`, await authFetchInit({ method: 'DELETE' }));
      if (res.ok) {
        setDeleteConfirm(null);
        toast.success('Post deleted');
        fetchPosts();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Delete failed');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-3xl font-bold">Blog Posts</h1>
        <p className="text-white/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-bold">Blog Posts</h1>
        <Link
          to="/blog/new"
          className="flex items-center gap-2 rounded-lg border border-orange-light/50 bg-orange-light/10 px-4 py-2 font-medium text-orange-light transition-colors hover:bg-orange-light/20"
        >
          <Plus className="h-5 w-5" />
          <span>New Post</span>
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search posts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white placeholder-white/40 focus:border-orange-light/50 focus:outline-none focus:ring-1 focus:ring-orange-light/50"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white focus:border-orange-light/50 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-white focus:border-orange-light/50 focus:outline-none"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {posts.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/5 p-12 text-center">
            {debouncedSearch || statusFilter !== 'all' || categoryFilter !== 'all' ? (
              <p className="text-white/70">No posts match your filters</p>
            ) : (
              <>
                <p className="text-white/70">No posts yet</p>
                <Link to="/blog/new" className="mt-2 inline-block text-orange-light hover:underline">
                  Create your first post
                </Link>
              </>
            )}
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                      post.status === 'published'
                        ? 'border-green-500/50 bg-green-500/20 text-green-400'
                        : 'border-amber-500/50 bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {post.status}
                  </span>
                  <h3 className="truncate font-medium text-white">{post.title}</h3>
                </div>
                <p className="mt-1 text-sm text-white/60">
                  {post.category?.name || 'Uncategorized'} · {post.author?.name || 'Unknown'} ·{' '}
                  {post.status === 'published' && post.published_at
                    ? `Published ${formatDate(post.published_at)}`
                    : `Updated ${formatDate(post.updated_at)}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to={`/blog/${post.slug}/edit`}
                  className="rounded border border-white/20 bg-white/5 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  Edit
                </Link>
                {post.status === 'published' && (
                  <a
                    href={`${blogBase}/blog/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-white/20 bg-white/5 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                  >
                    View ↗
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(post.slug)}
                  className="rounded border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
                >
                  Delete
                </button>
              </div>

              {deleteConfirm === post.slug && (
                <div className="w-full rounded border border-amber-500/30 bg-amber-500/10 p-4">
                  <p className="mb-3 text-white">Delete &quot;{post.title}&quot;?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(null)}
                      disabled={deleting}
                      className="rounded border border-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/10 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(post.slug)}
                      disabled={deleting}
                      className="rounded border border-red-500/50 bg-red-500/20 px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/30 disabled:opacity-50"
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

      <p className="text-sm text-white/50">
        Showing {posts.length} posts
      </p>
    </div>
  );
};

export default ManageBlog;
