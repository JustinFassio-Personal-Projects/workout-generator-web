'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { WorkoutPlan } from '../types';
import { getUserWorkouts, deleteWorkout } from '../services/dbService';
import {
  Calendar,
  Clock,
  Flame,
  Dumbbell,
  Trash2,
  ArrowRight,
  AlertCircle,
  Loader2,
  Target,
} from 'lucide-react';

interface Props {
  onLoadWorkout: (plan: WorkoutPlan) => void;
  userId: string;
}

export const WorkoutHistory: React.FC<Props> = ({ onLoadWorkout, userId }) => {
  const [workouts, setWorkouts] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterFocus, setFilterFocus] = useState<string>('All');
  const [filterTrainer, setFilterTrainer] = useState<string>('All');

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await getUserWorkouts(userId);
    setWorkouts(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this workout?')) {
      const success = await deleteWorkout(id);
      if (success) {
        setWorkouts((prev) => prev.filter((w) => w.id !== id));
      }
    }
  };

  // Extract unique filters
  const trainersFound = Array.from(
    new Set((workouts || []).map((w) => w.trainerType || 'Other')),
  ).sort();
  const focusesFound = Array.from(
    new Set((workouts || []).map((w) => w.focus || 'General')),
  ).sort();

  const filteredWorkouts = workouts.filter((w) => {
    const trainerMatch = filterTrainer === 'All' || (w.trainerType || 'Other') === filterTrainer;
    const focusMatch = filterFocus === 'All' || (w.focus || 'General') === filterFocus;
    return trainerMatch && focusMatch;
  });

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center py-20 text-slate-400'>
        <Loader2 className='w-10 h-10 animate-spin text-lime-500 mb-4' />
        <p>Loading your history...</p>
      </div>
    );
  }

  if (workouts.length === 0) {
    return (
      <div className='text-center py-20 bg-slate-900/50 rounded-2xl border border-slate-800'>
        <Dumbbell className='w-16 h-16 text-slate-700 mx-auto mb-4' />
        <h3 className='text-xl font-bold text-white mb-2'>No Workouts Saved</h3>
        <p className='text-slate-400'>Generate and save a workout to see it here.</p>
      </div>
    );
  }

  return (
    <div className='animate-in fade-in slide-in-from-bottom-4 duration-500'>
      <div className='flex flex-col md:flex-row justify-between items-center mb-8 gap-4'>
        <div>
          <h2 className='text-3xl font-bold text-white'>Your Workouts</h2>
          <p className='text-slate-400'>Manage your saved plans and track your journey.</p>
        </div>

        {/* Filters */}
        <div className='flex flex-wrap gap-2'>
          <div className='flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-700'>
            <span className='text-xs font-bold text-slate-500 uppercase px-2'>Trainer:</span>
            <select
              value={filterTrainer}
              onChange={(e) => setFilterTrainer(e.target.value)}
              className='bg-transparent text-white text-sm outline-none cursor-pointer pr-4'
            >
              <option value='All'>All</option>
              {trainersFound.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className='flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-700'>
            <span className='text-xs font-bold text-slate-500 uppercase px-2'>Focus:</span>
            <select
              value={filterFocus}
              onChange={(e) => setFilterFocus(e.target.value)}
              className='bg-transparent text-white text-sm outline-none cursor-pointer pr-4'
            >
              <option value='All'>All</option>
              {focusesFound.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-4'>
        {filteredWorkouts.map((workout) => (
          <div
            key={workout.id}
            onClick={() => onLoadWorkout(workout)}
            className='bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-lime-500/50 rounded-xl p-5 cursor-pointer transition-all hover:shadow-lg hover:shadow-lime-900/10 group relative'
          >
            <div className='flex flex-col md:flex-row justify-between md:items-start gap-4'>
              <div className='flex-1 w-full'>
                <div className='flex flex-wrap items-center gap-2 mb-2'>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-slate-900 text-slate-300 border border-slate-700`}
                  >
                    {workout.trainerType || 'Custom Plan'}
                  </span>
                  {workout.focus && (
                    <span
                      className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-lime-900/30 text-lime-400 border border-lime-800/50`}
                    >
                      <Target className='w-3 h-3' />
                      {workout.focus}
                    </span>
                  )}
                </div>
                <h3 className='text-xl font-bold text-white mb-2 group-hover:text-lime-400 transition-colors'>
                  {workout.title}
                </h3>

                <div className='flex flex-col gap-2 text-sm text-slate-400'>
                  <div className='flex items-center gap-2 mb-1'>
                    <Calendar className='w-3 h-3 text-slate-500' />
                    <span className='text-xs font-mono'>
                      {workout.createdAt
                        ? new Date(workout.createdAt).toLocaleDateString()
                        : 'Unknown Date'}
                    </span>
                  </div>

                  {/* Description: Changed from truncate to normal wrapping text */}
                  <p className='text-slate-400 leading-relaxed pr-8'>{workout.description}</p>
                </div>
              </div>

              <div className='flex flex-col gap-2 shrink-0'>
                <div className='flex items-center gap-6 text-sm bg-slate-900/50 p-3 rounded-lg border border-slate-700/50'>
                  <div className='flex items-center gap-2 text-slate-300'>
                    <Clock className='w-4 h-4 text-lime-500' />
                    <span className='font-bold'>{workout.totalDuration} min</span>
                  </div>
                  <div className='flex items-center gap-2 text-slate-300'>
                    <Flame className='w-4 h-4 text-orange-500' />
                    <span className='font-bold'>{workout.estimatedCalories}</span>
                  </div>
                </div>

                <div className='hidden md:flex items-center justify-center w-full py-2 rounded-lg bg-slate-700/30 group-hover:bg-lime-500 group-hover:text-slate-900 transition-all font-bold text-xs uppercase tracking-wide mt-auto'>
                  View Plan <ArrowRight className='w-4 h-4 ml-1' />
                </div>
              </div>
            </div>

            {/* Delete Button */}
            <button
              onClick={(e) => handleDelete(workout.id!, e)}
              className='absolute top-4 right-4 p-2 text-slate-600 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-colors opacity-0 group-hover:opacity-100 z-10'
              title='Delete Workout'
            >
              <Trash2 className='w-4 h-4' />
            </button>
          </div>
        ))}

        {filteredWorkouts.length === 0 && (
          <div className='text-center py-10 border border-dashed border-slate-700 rounded-xl'>
            <AlertCircle className='w-8 h-8 text-slate-600 mx-auto mb-2' />
            <p className='text-slate-500'>No workouts found matching these filters.</p>
            <button
              onClick={() => {
                setFilterFocus('All');
                setFilterTrainer('All');
              }}
              className='mt-4 text-lime-400 text-sm hover:underline'
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
