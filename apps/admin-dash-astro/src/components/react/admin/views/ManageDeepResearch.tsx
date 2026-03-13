/**
 * Deep Research list and management UI. Fetches from /api/admin/deep-research.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { DeepResearch } from '@/types/deep-research';

const siteUrl =
  (import.meta as { env?: Record<string, string> }).env?.PUBLIC_SITE_URL ||
  'https://aiworkoutgenerator.com';
const siteBase = siteUrl.replace(/\/$/, '');

const ManageDeepResearch: React.FC = () => {
  const [items, setItems] = useState<DeepResearch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      const qs = params.toString();
      const res = await fetch(`/api/admin/deep-research${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load deep research');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [statusFilter, search]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const s = search.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(s) ||
        (item.excerpt?.toLowerCase().includes(s) ?? false)
    );
  }, [items, search]);

  async function handleDelete(slug: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/deep-research/${slug}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteConfirm(null);
        toast.success('Deleted');
        fetchItems();
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
        <h1 className="font-heading text-3xl font-bold">Deep Research</h1>
        <p className="text-white/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-bold">Deep Research</h1>
        <Link
          to="/deep-research/new"
          className="flex items-center gap-2 rounded-lg border border-orange-light/50 bg-orange-light/10 px-4 py-2 font-medium text-orange-light transition-colors hover:bg-orange-light/20"
        >
          <Plus className="h-5 w-5" />
          <span>New Deep Research</span>
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          placeholder="Search by title or excerpt..."
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
      </div>

      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="rounded-lg border border-white/10 bg-white/5 p-12 text-center">
            {search || statusFilter !== 'all' ? (
              <p className="text-white/70">No items match your filters</p>
            ) : (
              <>
                <p className="text-white/70">No deep research yet</p>
                <Link
                  to="/deep-research/new"
                  className="mt-2 inline-block text-orange-light hover:underline"
                >
                  Create your first deep research
                </Link>
              </>
            )}
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-white/10 bg-white/5 p-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
                      item.status === 'published'
                        ? 'border-green-500/50 bg-green-500/20 text-green-400'
                        : 'border-amber-500/50 bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {item.status}
                  </span>
                  <h3 className="truncate font-medium text-white">{item.title}</h3>
                </div>
                <p className="mt-1 text-sm text-white/60">
                  {item.status === 'published' && item.published_at
                    ? `Published ${formatDate(item.published_at)}`
                    : `Updated ${formatDate(item.updated_at)}`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to={`/deep-research/${item.slug}/edit`}
                  className="rounded border border-white/20 bg-white/5 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  Edit
                </Link>
                {item.status === 'published' && (
                  <a
                    href={`${siteBase}/deep-research/${item.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-white/20 bg-white/5 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                  >
                    View ↗
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(item.slug)}
                  className="rounded border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
                >
                  Delete
                </button>
              </div>

              {deleteConfirm === item.slug && (
                <div className="w-full rounded border border-amber-500/30 bg-amber-500/10 p-4">
                  <p className="mb-3 text-white">Delete &quot;{item.title}&quot;?</p>
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
                      onClick={() => handleDelete(item.slug)}
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
        Showing {filteredItems.length} of {items.length} items
      </p>
    </div>
  );
};

export default ManageDeepResearch;
