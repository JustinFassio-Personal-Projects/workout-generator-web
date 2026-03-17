'use client';

import React, { useState, useEffect } from 'react';
import { DailyContext, TrainerType, TRAINER_FOCUS_OPTIONS } from '../types';
import { Battery, Clock, Zap, PlayCircle, Loader2, Target } from 'lucide-react';

interface Props {
  onSubmit: (data: DailyContext, trainer: TrainerType) => void;
  isLoading: boolean;
}

const TRAINER_DETAILS: Record<
  TrainerType,
  { description: string; activeClass: string; borderClass: string }
> = {
  [TrainerType.FUNCTIONAL]: {
    description: 'Movement-based training for real-world strength',
    activeClass: 'bg-green-500/20 border-green-500',
    borderClass: 'border-l-4 border-l-green-500',
  },
  [TrainerType.HYPERTROPHY]: {
    description: 'Build muscle mass and definition',
    activeClass: 'bg-red-500/20 border-red-500',
    borderClass: 'border-l-4 border-l-red-500',
  },
  [TrainerType.POWERLIFTING]: {
    description: 'Maximize strength and power',
    activeClass: 'bg-blue-500/20 border-blue-500',
    borderClass: 'border-l-4 border-l-blue-500',
  },
  [TrainerType.YOGA]: {
    description: 'Flexibility, balance, and mindfulness',
    activeClass: 'bg-purple-500/20 border-purple-500',
    borderClass: 'border-l-4 border-l-purple-500',
  },
  [TrainerType.HIIT]: {
    description: 'Maximum intensity, maximum results',
    activeClass: 'bg-orange-500/20 border-orange-500',
    borderClass: 'border-l-4 border-l-orange-500',
  },
  [TrainerType.REHAB]: {
    description: 'Recover and prevent injury',
    activeClass: 'bg-cyan-500/20 border-cyan-500',
    borderClass: 'border-l-4 border-l-cyan-500',
  },
};

export const DailyCheckIn: React.FC<Props> = ({ onSubmit, isLoading }) => {
  const [trainer, setTrainer] = useState<TrainerType>(TrainerType.FUNCTIONAL);
  const [selectedFocus, setSelectedFocus] = useState<string>(
    TRAINER_FOCUS_OPTIONS[TrainerType.FUNCTIONAL][0],
  );

  const [duration, setDuration] = useState(60);
  const [sleep, setSleep] = useState(7);
  const [energy, setEnergy] = useState(7);
  const [targetMuscles, setTargetMuscles] = useState('');
  const [equipment, setEquipment] = useState('');

  // Dynamic loading state
  const [loadingMessage, setLoadingMessage] = useState('Preparing your session...');

  // Update focus options when trainer changes
  useEffect(() => {
    // Reset focus to the first option of the new trainer
    if (TRAINER_FOCUS_OPTIONS[trainer]) {
      setSelectedFocus(TRAINER_FOCUS_OPTIONS[trainer][0]);
    }
  }, [trainer]);

  useEffect(() => {
    if (!isLoading) return;

    const messages = [
      'Reviewing your profile for injuries...',
      'Checking your goals...',
      `Aligning with ${trainer} principles...`,
      `Focusing on ${selectedFocus}...`,
      'Analyzing your daily bio-feedback...',
      'Setting the intensity...',
      'Selecting the best exercises...',
      'Optimizing rest periods...',
      'Finalizing your custom plan...',
    ];

    let currentIndex = 0;
    setLoadingMessage(messages[0]);

    const intervalId = setInterval(() => {
      currentIndex = (currentIndex + 1) % messages.length;
      setLoadingMessage(messages[currentIndex]);
    }, 3500);

    return () => clearInterval(intervalId);
  }, [isLoading, trainer, selectedFocus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const context: DailyContext = {
      duration,
      sleepQuality: sleep,
      energyLevel: energy,
      soreness: [], // Simplified for this UI
      targetMuscleGroups: targetMuscles
        ? targetMuscles.split(',').map((s) => s.trim())
        : ['Full Body'],
      equipmentAvailable: equipment ? equipment.split(',').map((s) => s.trim()) : ['Gym Access'],
      workoutType: 'Mixed',
      selectedFocus: selectedFocus,
    };
    onSubmit(context, trainer);
  };

  return (
    <div className='bg-slate-800 rounded-xl shadow-lg border border-slate-700 overflow-hidden'>
      <div className='p-6 border-b border-slate-700 bg-slate-900/50'>
        <h2 className='text-xl font-bold text-white flex items-center gap-2'>
          <Zap className='w-5 h-5 text-lime-400' /> Daily Check-In
        </h2>
        <p className='text-slate-400 text-sm mt-1'>Tell us about today so we can adapt the plan.</p>
      </div>

      <form onSubmit={handleSubmit} className='p-6 space-y-8'>
        {/* Trainer Selector */}
        <div>
          <label className='block text-slate-300 font-medium mb-3'>Choose Your Trainer</label>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
            {Object.values(TrainerType).map((t) => {
              const details = TRAINER_DETAILS[t];
              const isSelected = trainer === t;

              return (
                <button
                  key={t}
                  type='button'
                  onClick={() => setTrainer(t)}
                  className={`p-4 rounded-lg text-left transition-all border relative overflow-hidden group ${
                    isSelected
                      ? `${details.activeClass} border text-white shadow-lg`
                      : `bg-slate-900 border-slate-700 hover:border-slate-600 ${details.borderClass}`
                  }`}
                >
                  <div className='relative z-10'>
                    <div className='font-bold text-sm mb-1 text-white'>{t}</div>
                    <div className={`text-xs ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>
                      {details.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Focus Selector */}
        <div className='bg-slate-900/50 p-6 rounded-xl border border-slate-700'>
          <label className='block text-lime-400 font-bold mb-3 flex items-center gap-2'>
            <Target className='w-5 h-5' />
            Select Your Focus
          </label>
          <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2'>
            {TRAINER_FOCUS_OPTIONS[trainer]?.map((option) => (
              <button
                key={option}
                type='button'
                onClick={() => setSelectedFocus(option)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                  selectedFocus === option
                    ? 'bg-lime-500 text-slate-900 shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Sliders Grid */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          <div className='bg-slate-900 p-4 rounded-lg border border-slate-700'>
            <label className='flex items-center justify-between text-slate-300 mb-2'>
              <span className='flex items-center gap-2'>
                <Clock className='w-4 h-4' /> Duration
              </span>
              <span className='text-lime-400 font-bold'>{duration}m</span>
            </label>
            <input
              type='range'
              min='15'
              max='120'
              step='5'
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className='w-full accent-lime-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer'
            />
          </div>

          <div className='bg-slate-900 p-4 rounded-lg border border-slate-700'>
            <label className='flex items-center justify-between text-slate-300 mb-2'>
              <span className='flex items-center gap-2'>
                <Battery className='w-4 h-4' /> Sleep Quality
              </span>
              <span className={`font-bold ${sleep < 5 ? 'text-red-400' : 'text-green-400'}`}>
                {sleep}/10
              </span>
            </label>
            <input
              type='range'
              min='1'
              max='10'
              value={sleep}
              onChange={(e) => setSleep(Number(e.target.value))}
              className='w-full accent-green-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer'
            />
          </div>

          <div className='bg-slate-900 p-4 rounded-lg border border-slate-700'>
            <label className='flex items-center justify-between text-slate-300 mb-2'>
              <span className='flex items-center gap-2'>
                <Zap className='w-4 h-4' /> Energy Level
              </span>
              <span className={`font-bold ${energy < 5 ? 'text-red-400' : 'text-yellow-400'}`}>
                {energy}/10
              </span>
            </label>
            <input
              type='range'
              min='1'
              max='10'
              value={energy}
              onChange={(e) => setEnergy(Number(e.target.value))}
              className='w-full accent-yellow-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer'
            />
          </div>
        </div>

        {/* Text Inputs */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <label className='block text-slate-400 text-xs uppercase mb-1'>
              Specific Target Muscles (Optional)
            </label>
            <input
              type='text'
              value={targetMuscles}
              onChange={(e) => setTargetMuscles(e.target.value)}
              placeholder='e.g. Chest, Lower Back, Glutes'
              className='w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-3 focus:border-lime-500 outline-none'
            />
          </div>
          <div>
            <label className='block text-slate-400 text-xs uppercase mb-1'>
              Equipment Available
            </label>
            <input
              type='text'
              value={equipment}
              onChange={(e) => setEquipment(e.target.value)}
              placeholder='e.g. Dumbbells, Barbell, None'
              className='w-full bg-slate-900 border border-slate-700 text-white rounded-lg p-3 focus:border-lime-500 outline-none'
            />
          </div>
        </div>

        <button
          disabled={isLoading}
          type='submit'
          className='w-full bg-gradient-to-r from-lime-500 to-green-600 hover:from-lime-400 hover:to-green-500 text-slate-900 font-bold py-4 rounded-xl shadow-lg transform transition-all hover:scale-[1.01] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed'
        >
          {isLoading ? (
            <>
              <Loader2 className='w-6 h-6 animate-spin shrink-0' />
              <span className='animate-pulse'>{loadingMessage}</span>
            </>
          ) : (
            <>
              <PlayCircle className='w-6 h-6' /> Generate Workout
            </>
          )}
        </button>
      </form>
    </div>
  );
};
