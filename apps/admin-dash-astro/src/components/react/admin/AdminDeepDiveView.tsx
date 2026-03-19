/**
 * Admin view: renders the stored deep dive HTML for an exercise with a back button.
 * The iframe shows the deep dive document with the muscle engagement diagram
 * injected inside the page (after the Muscle Map heading).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { getGeneratedExerciseBySlug } from '@/lib/supabase/client/generated-exercises';
import type { GeneratedExercise } from '@/types/generated-exercise';

const AdminDeepDiveView: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [exercise, setExercise] = useState<GeneratedExercise | null>(null);
  const [preparedHtml, setPreparedHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingMuscleImage, setIsGeneratingMuscleImage] = useState(false);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    return headers;
  }, []);

  useEffect(() => {
    if (!slug) {
      setError('Missing exercise slug.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPreparedHtml(null);
    getGeneratedExerciseBySlug(slug)
      .then((data) => {
        if (!cancelled) {
          setExercise(data ?? null);
          if (!data) setError('Exercise not found.');
        }
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

  // Load deep dive HTML with muscle diagram injected (for iframe)
  useEffect(() => {
    if (!exercise?.id || !exercise.deepDiveHtmlContent?.trim()) {
      setPreparedHtml(null);
      return;
    }
    let cancelled = false;
    getAuthHeaders()
      .then((headers) =>
        fetch(`/api/admin/exercises/${exercise.id}/deep-dive-html`, {
          credentials: 'include',
          headers,
        })
      )
      .then((res) => (res.ok ? res.text() : null))
      .then((html) => {
        if (!cancelled && html) setPreparedHtml(html);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [exercise?.id, exercise?.deepDiveHtmlContent, exercise?.muscleDiagramImageUrl, getAuthHeaders]);

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/50" />
      </div>
    );
  }

  if (error || !exercise) {
    return (
      <div className="space-y-4">
        <Link
          to={slug ? `/exercises/${slug}` : '/exercises'}
          className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-[#ffbf00]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to exercise
        </Link>
        <p className="text-red-400">{error ?? 'Exercise not found.'}</p>
      </div>
    );
  }

  if (!exercise.deepDiveHtmlContent || !exercise.deepDiveHtmlContent.trim()) {
    return (
      <div className="space-y-4">
        <Link
          to={`/exercises/${slug}`}
          className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-[#ffbf00]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to exercise
        </Link>
        <p className="text-white/70">No deep dive content for this exercise yet. Generate it from the exercise detail page.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        to={`/exercises/${slug}`}
        className="inline-flex w-fit items-center gap-2 text-sm text-white/70 transition-colors hover:text-[#ffbf00]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to exercise
      </Link>
      {exercise.muscleEngagementMap?.muscles?.length && !exercise.muscleDiagramImageUrl && (
        <div>
          <button
            type="button"
            onClick={async () => {
              if (!exercise?.id || isGeneratingMuscleImage) return;
              setIsGeneratingMuscleImage(true);
              try {
                const headers = await getAuthHeaders();
                const res = await fetch(`/api/admin/exercises/${exercise.id}/generate-muscle-image`, {
                  method: 'POST',
                  credentials: 'include',
                  headers,
                });
                if (!res.ok) throw new Error(await res.text() || 'Failed to generate image');
                const data = await res.json();
                if (data?.imageUrl && slug) {
                  const updated = await getGeneratedExerciseBySlug(slug);
                  if (updated) setExercise(updated);
                }
              } finally {
                setIsGeneratingMuscleImage(false);
              }
            }}
            disabled={isGeneratingMuscleImage}
            className="inline-flex items-center gap-2 rounded bg-[#ffbf00]/20 px-3 py-2 text-sm font-medium text-[#ffbf00] transition-colors hover:bg-[#ffbf00]/30 disabled:opacity-50"
          >
            {isGeneratingMuscleImage ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              'Generate anatomical image'
            )}
          </button>
        </div>
      )}
      <div className="min-h-[400px] overflow-hidden rounded-lg border border-white/10 bg-black/20">
        <iframe
          title={`Deep dive: ${exercise.exerciseName}`}
          srcDoc={preparedHtml ?? exercise.deepDiveHtmlContent ?? ''}
          className="h-[80vh] w-full border-0"
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    </div>
  );
};

export default AdminDeepDiveView;
