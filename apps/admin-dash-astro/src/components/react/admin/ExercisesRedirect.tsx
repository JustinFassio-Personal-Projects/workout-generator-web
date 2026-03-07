/**
 * Redirects to the programs app's admin Exercises section when PUBLIC_SITE_URL is set.
 * Keeps the Exercises nav from showing "Coming soon" and sends users to the full manager.
 */
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const PROGRAMS_ADMIN_EXERCISES = '/admin/exercises';

const ExercisesRedirect: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const [redirecting, setRedirecting] = useState(true);
  const siteUrl =
    typeof import.meta !== 'undefined' &&
    (import.meta as { env?: Record<string, string> }).env?.PUBLIC_SITE_URL;
  const base = typeof siteUrl === 'string' && siteUrl.trim() ? siteUrl.trim().replace(/\/$/, '') : '';

  useEffect(() => {
    if (!base) {
      setRedirecting(false);
      return;
    }
    const path = slug ? `${PROGRAMS_ADMIN_EXERCISES}/${slug}` : PROGRAMS_ADMIN_EXERCISES;
    window.location.href = `${base}${path}`;
  }, [base, slug]);

  if (base && redirecting) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-white/80">
        <p>Redirecting to Exercises…</p>
        <a href={`${base}${slug ? `${PROGRAMS_ADMIN_EXERCISES}/${slug}` : PROGRAMS_ADMIN_EXERCISES}`} className="text-[#ffbf00] hover:underline">
          Click here if you are not redirected
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">Exercises</h2>
      <p className="text-white/70">
        The full Exercise Library and management live in the <strong>programs</strong> app. Set{' '}
        <code className="rounded bg-white/10 px-1 py-0.5 text-sm">PUBLIC_SITE_URL</code> in your{' '}
        <code className="rounded bg-white/10 px-1 py-0.5 text-sm">.env</code> to the programs app
        URL (e.g. <code className="rounded bg-white/10 px-1 py-0.5 text-sm">http://localhost:4321</code>)
        to open Exercises from this dashboard.
      </p>
    </div>
  );
};

export default ExercisesRedirect;
