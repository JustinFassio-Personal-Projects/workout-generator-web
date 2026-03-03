/**
 * Placeholder dashboard home. Replace or extend as you add features from programs.
 */
import React from 'react';

const DashboardHome: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Dashboard</h2>
      <p className="text-white/70">
        Welcome to the admin dashboard. Copy features one at a time from{' '}
        <code className="rounded bg-white/10 px-1 py-0.5 text-sm">apps/programs</code> into this app.
      </p>
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <h3 className="mb-2 font-semibold text-white">Suggested order</h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-white/70">
          <li>Program Factory (ManagePrograms + ProgramEditor + API routes)</li>
          <li>Workout Factory (ManageWorkouts + WorkoutEditor + API)</li>
          <li>Challenge Factory (ManageChallenges + ChallengeEditor + API)</li>
          <li>Exercises (ManageExercises + detail + API)</li>
          <li>WOD Engine, Warm-Up Engine, Users, Zones</li>
        </ul>
      </div>
    </div>
  );
};

export default DashboardHome;
