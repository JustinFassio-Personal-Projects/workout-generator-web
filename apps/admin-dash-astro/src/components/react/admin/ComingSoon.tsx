/**
 * Placeholder for admin sections not yet migrated from programs.
 */
import React from 'react';
import { useLocation } from 'react-router-dom';

const ComingSoon: React.FC = () => {
  const location = useLocation();
  const path = location.pathname || '/';
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Coming soon</h2>
      <p className="text-white/70">
        This section (<code className="rounded bg-white/10 px-1 py-0.5 text-sm">{path}</code>) will
        be available as features are migrated from <code className="rounded bg-white/10 px-1 py-0.5 text-sm">apps/programs</code>.
      </p>
    </div>
  );
};

export default ComingSoon;
