/**
 * Admin exercise detail view: review, approve/reject, edit in Visualization Lab.
 * Displays full stored data: image, biomechanics (cues, mistakes, chain, pivot, stabilization), sources.
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
  Zap,
  AlertTriangle,
  Shield,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import {
  getGeneratedExerciseBySlug,
  updateGeneratedExerciseStatus,
} from '@/lib/supabase/client/generated-exercises';
import { normalizeListItems, filterRealSources } from '@/lib/parse-biomechanics';
import type { GeneratedExercise, GeneratedExerciseStatus } from '@/types/generated-exercise';
import { EXERCISE_LABELS } from '@/lib/labels/exercises';
import { toast } from 'sonner';

/** Strip HTML tags for safe plain-text display of biomechanics content. */
function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDate(timestamp: { toDate?: () => Date } | Date | null): string {
  if (!timestamp) return 'Unknown';
  let date: Date | null = null;
  if (typeof (timestamp as { toDate?: () => Date }).toDate === 'function') {
    date = (timestamp as { toDate: () => Date }).toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  }
  if (!date || Number.isNaN(date.getTime())) return 'Invalid Date';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const AdminExerciseDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [exercise, setExercise] = useState<GeneratedExercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [generationDetailsOpen, setGenerationDetailsOpen] = useState(false);
  const [isGeneratingInstructions, setIsGeneratingInstructions] = useState(false);
  const [userInstructionsOpen, setUserInstructionsOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ? { id: session.user.id } : null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? { id: session.user.id } : null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setError('Missing exercise slug.');
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getGeneratedExerciseBySlug(slug)
      .then((data) => {
        if (cancelled) return;
        setExercise(data ?? null);
        if (!data) setError('Exercise not found.');
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load exercise.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleRefresh = () => {
    if (!slug) return;
    setLoading(true);
    getGeneratedExerciseBySlug(slug)
      .then((data) => {
        setExercise(data ?? null);
      })
      .finally(() => setLoading(false));
  };

  const handleStatusUpdate = async (status: GeneratedExerciseStatus, reason?: string) => {
    if (!exercise || !user) return;
    setPublishingId(exercise.id);
    try {
      await updateGeneratedExerciseStatus(
        exercise.id,
        status,
        status === 'rejected' ? { rejectedBy: user.id, rejectionReason: reason ?? '' } : undefined
      );
      toast.success(status === 'approved' ? 'Exercise approved (published).' : 'Exercise rejected.');
      const updated = await getGeneratedExerciseBySlug(slug!);
      if (updated) setExercise(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status.');
    } finally {
      setPublishingId(null);
    }
  };

  const handleApprove = () => handleStatusUpdate('approved');
  const handleReject = () => {
    const reason = window.prompt('Rejection reason (optional):') ?? '';
    handleStatusUpdate('rejected', reason);
  };

  const handleGenerateInstructions = async () => {
    if (!exercise || isGeneratingInstructions) return;
    setIsGeneratingInstructions(true);
    try {
      const res = await fetch(`/api/admin/exercises/${exercise.id}/generate-instructions`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to generate instructions');
        return;
      }
      toast.success('User instructions generated.');
      const updated = await getGeneratedExerciseBySlug(slug!);
      if (updated) setExercise(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate instructions');
    } finally {
      setIsGeneratingInstructions(false);
    }
  };

  if (loading && !exercise) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-white/80">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>Loading exercise...</p>
      </div>
    );
  }

  if (error && !exercise) {
    return (
      <div className="space-y-4">
        <Link
          to="/exercises"
          className="inline-flex items-center gap-2 text-sm text-[#ffbf00] transition-colors hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {EXERCISE_LABELS.backLink}
        </Link>
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-300">
          {error}
        </div>
      </div>
    );
  }

  if (!exercise) return null;

  const statusConfig: Record<
    GeneratedExerciseStatus,
    { label: string; icon: typeof CheckCircle; bg: string; text: string }
  > = {
    pending: {
      label: 'Pending Review',
      icon: Loader2,
      bg: 'bg-amber-500/20',
      text: 'text-amber-400',
    },
    approved: {
      label: 'Published',
      icon: CheckCircle,
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-400',
    },
    rejected: {
      label: 'Rejected',
      icon: XCircle,
      bg: 'bg-red-500/20',
      text: 'text-red-400',
    },
  };
  const statusInfo = statusConfig[exercise.status];
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <Link
          to="/exercises"
          className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-[#ffbf00]"
        >
          <ArrowLeft className="h-4 w-4" />
          {EXERCISE_LABELS.backLink}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={`/exercise-image-gen?slug=${exercise.slug}`}
            className="inline-flex items-center gap-2 rounded-lg border border-[#ffbf00]/40 bg-[#ffbf00]/10 px-3 py-2 text-sm font-medium text-[#ffbf00] transition-colors hover:bg-[#ffbf00]/20"
            title="Edit in Visualization Lab"
          >
            <Sparkles className="h-4 w-4" />
            Edit in Visualization Lab
          </Link>
          <button
            type="button"
            onClick={handleGenerateInstructions}
            disabled={isGeneratingInstructions || loading}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-sm font-medium text-blue-300 transition-colors hover:bg-blue-500/20 disabled:opacity-50"
            title="Generate plain-language instructions for the public page"
          >
            {isGeneratingInstructions ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            {exercise.userFriendlyInstructions ? 'Regenerate' : 'Generate'} User Instructions
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 disabled:opacity-50"
            title="Refresh"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* Status + actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}
          >
            <StatusIcon
              className={`h-3.5 w-3.5 ${exercise.status === 'pending' ? 'animate-spin' : ''}`}
            />
            {statusInfo.label}
          </span>
          {exercise.status === 'pending' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApprove}
                disabled={!!publishingId}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
              >
                {publishingId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Approve (Publish)
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={!!publishingId}
                className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50"
              >
                {publishingId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Reject
              </button>
            </div>
          )}
        </div>
        <p className="text-xs text-white/50">
          Generated {formatDate(exercise.generatedAt)}
        </p>
      </div>

      {/* Exercise name */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">{exercise.exerciseName}</h1>
        {exercise.kineticChainType && (
          <span className="mt-2 inline-block rounded bg-white/10 px-2 py-0.5 font-mono text-xs text-white/70">
            {exercise.kineticChainType}
          </span>
        )}
      </div>

      {/* Primary image */}
      <div className="rounded-lg border border-white/10 bg-black/20 overflow-hidden">
        {exercise.imageUrl ? (
          <img
            src={exercise.imageUrl}
            alt={exercise.exerciseName}
            className="w-full max-w-2xl object-contain"
          />
        ) : (
          <div className="flex aspect-video max-w-2xl items-center justify-center bg-black/40">
            <ImageIcon className="h-16 w-16 text-white/20" />
          </div>
        )}
      </div>

      {/* User Instructions (generated for public page) */}
      {(exercise.userFriendlyInstructions || isGeneratingInstructions) && (
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 overflow-hidden">
          <button
            type="button"
            onClick={() => setUserInstructionsOpen((prev) => !prev)}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-white/5"
          >
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-300">
              <FileText className="h-4 w-4" />
              User instructions (public page)
              {exercise.userFriendlyInstructions && (
                <span className="rounded bg-emerald-500/30 px-1.5 py-0.5 text-[10px] font-normal normal-case text-emerald-300">
                  Generated
                </span>
              )}
            </span>
            {userInstructionsOpen ? (
              <ChevronDown className="h-4 w-4 text-white/50" />
            ) : (
              <ChevronRight className="h-4 w-4 text-white/50" />
            )}
          </button>
          {userInstructionsOpen && exercise.userFriendlyInstructions && (
            <div className="border-t border-white/10 px-4 pb-4 pt-2">
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-black/20 p-3 text-sm text-white/90">
                {exercise.userFriendlyInstructions}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Generation meta (collapsible, closed by default) */}
      {(exercise.imagePrompt || exercise.complexityLevel || exercise.visualStyle) && (
        <div className="rounded-lg border border-white/10 bg-black/20 overflow-hidden">
          <button
            type="button"
            onClick={() => setGenerationDetailsOpen((prev) => !prev)}
            className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-white/5"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
              Generation details
            </span>
            {generationDetailsOpen ? (
              <ChevronDown className="h-4 w-4 text-white/50" />
            ) : (
              <ChevronRight className="h-4 w-4 text-white/50" />
            )}
          </button>
          {generationDetailsOpen && (
            <dl className="space-y-2 border-t border-white/10 px-4 pb-4 pt-2 text-sm">
              {exercise.visualStyle && (
                <div>
                  <dt className="text-white/50">Visual style</dt>
                  <dd className="text-white/90">{exercise.visualStyle}</dd>
                </div>
              )}
              {exercise.complexityLevel && (
                <div>
                  <dt className="text-white/50">Complexity</dt>
                  <dd className="text-white/90">{exercise.complexityLevel}</dd>
                </div>
              )}
              {exercise.imagePrompt && (
                <div>
                  <dt className="text-white/50">Image prompt</dt>
                  <dd className="max-w-2xl whitespace-pre-wrap text-white/80">{exercise.imagePrompt}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      )}

      {/* Performance Cues */}
      {(exercise.biomechanics?.performanceCues?.length ?? 0) > 0 && (
        <div className="rounded-lg border-l-4 border-[#ffbf00]/50 bg-white/5 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
            <Zap className="h-5 w-5 text-[#ffbf00]" />
            Performance Cues
          </h3>
          <ul className="space-y-2">
            {normalizeListItems(exercise.biomechanics!.performanceCues!).map((cue, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-white/90">
                <span className="font-mono text-[#ffbf00]/80">{String(idx + 1).padStart(2, '0')}</span>
                <span>{cue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Common Mistakes */}
      {(exercise.biomechanics?.commonMistakes?.length ?? 0) > 0 && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Common Mistakes
          </h3>
          <ul className="space-y-2">
            {normalizeListItems(exercise.biomechanics!.commonMistakes!).map((mistake, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-white/90">
                <span className="font-mono text-red-400/80">{String(idx + 1).padStart(2, '0')}</span>
                <span>{mistake}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Biomechanical Analysis */}
      {(exercise.biomechanics?.biomechanicalChain ||
        exercise.biomechanics?.pivotPoints ||
        exercise.biomechanics?.stabilizationNeeds) && (
        <div className="rounded-lg border border-white/10 bg-black/20 overflow-hidden">
          <div className="border-b border-white/10 bg-white/5 px-4 py-3">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <Shield className="h-5 w-5 text-blue-400" />
              Biomechanical Analysis
            </h3>
          </div>
          <div className="space-y-4 p-4">
            {exercise.biomechanics?.biomechanicalChain && (
              <div>
                <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-white/50">
                  The Chain
                </h4>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                  {stripHtml(exercise.biomechanics.biomechanicalChain)}
                </p>
              </div>
            )}
            {exercise.biomechanics?.pivotPoints && (
              <div>
                <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-white/50">
                  Pivot Points
                </h4>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                  {stripHtml(exercise.biomechanics.pivotPoints)}
                </p>
              </div>
            )}
            {exercise.biomechanics?.stabilizationNeeds && (
              <div>
                <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-white/50">
                  Stabilization
                </h4>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">
                  {stripHtml(exercise.biomechanics.stabilizationNeeds)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sources */}
      {filterRealSources(exercise.sources ?? []).length > 0 && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/50">
            <BookOpen className="h-4 w-4" />
            Sources
          </h3>
          <div className="flex flex-wrap gap-2">
            {filterRealSources(exercise.sources!).map((source, idx) => (
              <a
                key={idx}
                href={`https://google.com/search?q=${encodeURIComponent(source.searchQuery)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded bg-white/10 px-3 py-1.5 text-sm text-[#ffbf00] transition-colors hover:bg-white/20"
              >
                {source.title} ({source.domain})
              </a>
            ))}
          </div>
        </div>
      )}

      {exercise.rejectionReason && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <strong>Rejection reason:</strong> {exercise.rejectionReason}
        </div>
      )}
    </div>
  );
};

export default AdminExerciseDetail;
