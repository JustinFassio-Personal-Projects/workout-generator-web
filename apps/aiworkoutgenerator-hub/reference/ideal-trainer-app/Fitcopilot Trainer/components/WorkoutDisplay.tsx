'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { WorkoutPlan, Exercise, UnitSystem } from '../types';
import { saveWorkoutToDb } from '../services/dbService';
import {
  Clock,
  Flame,
  CheckCircle2,
  Dumbbell,
  Timer,
  AlertTriangle,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Activity,
  Save,
  Plus,
  CloudUpload,
  User,
  Sliders,
  ChevronDown,
  ChevronUp,
  FileText,
} from 'lucide-react';

interface Props {
  plan: WorkoutPlan;
  units: UnitSystem;
  userId: string;
}

interface ExerciseCardProps {
  exercise: Exercise;
  sectionIdx: number;
  exerciseIdx: number;
  units: UnitSystem;
  onClick?: () => void;
  onUpdateSet: (sIdx: number, eIdx: number, setIdx: number, field: string, value: string) => void;
  isHoverable?: boolean;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  sectionIdx,
  exerciseIdx,
  units,
  onClick,
  onUpdateSet,
  isHoverable = false,
}) => {
  const [showInstructions, setShowInstructions] = useState(false);

  const handleToggleInstructions = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowInstructions(!showInstructions);
  };

  // Reset instructions when the exercise name changes (e.g. new plan generated)
  // Do NOT use [exercise] as dependency, or it will collapse on every input edit.
  useEffect(() => {
    setShowInstructions(false);
  }, [exercise.name]);

  return (
    <div
      onClick={onClick}
      className={`bg-slate-800/50 rounded-lg p-4 mb-3 border border-slate-700/50 transition-all relative h-full flex flex-col ${
        isHoverable
          ? 'hover:border-lime-500/50 cursor-pointer hover:scale-[1.01] hover:bg-slate-800 hover:shadow-xl hover:shadow-lime-900/10'
          : ''
      }`}
    >
      {isHoverable && (
        <div className='absolute top-4 right-4 text-slate-600 group-hover:text-lime-400 transition-colors'>
          <Maximize2 className='w-4 h-4' />
        </div>
      )}

      <div className='flex justify-between items-start mb-3 pr-8'>
        <h4 className='font-bold text-white text-lg leading-tight'>{exercise.name}</h4>
      </div>

      <div className='flex flex-wrap gap-2 mb-4'>
        <span className='text-xs bg-lime-900/40 text-lime-300 border border-lime-800/50 px-2 py-1 rounded-full whitespace-nowrap'>
          {exercise.muscleTarget}
        </span>
        <span className='flex items-center gap-1 text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded-full border border-slate-700'>
          <Dumbbell className='w-3 h-3' /> {exercise.setDetails.length} Sets
        </span>
        {exercise.tempo && (
          <span className='flex items-center gap-1 text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded-full border border-slate-700'>
            <Timer className='w-3 h-3' /> {exercise.tempo}
          </span>
        )}
      </div>

      {exercise.cues && exercise.cues.length > 0 && (
        <div className='mb-4 bg-slate-900/50 p-3 rounded border border-slate-700/30 flex-grow'>
          <h5 className='text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider'>
            Technique Cues
          </h5>
          <ul className='text-sm text-slate-300 space-y-1 list-disc list-inside marker:text-lime-500'>
            {exercise.cues.map((cue: string, i: number) => (
              <li key={i} className='leading-relaxed'>
                {cue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {exercise.detailedInstructions && (
        <div className='mb-4'>
          <button
            onClick={handleToggleInstructions}
            className='w-full flex items-center justify-between p-2 bg-slate-900/50 rounded border border-slate-700/30 text-xs font-bold text-slate-400 hover:text-lime-400 hover:border-lime-500/30 transition-all'
          >
            <div className='flex items-center gap-2'>
              <FileText className='w-3 h-3' />
              Detailed Instructions
            </div>
            {showInstructions ? (
              <ChevronUp className='w-3 h-3' />
            ) : (
              <ChevronDown className='w-3 h-3' />
            )}
          </button>

          {showInstructions && (
            <div className='mt-2 p-3 bg-slate-950 rounded border border-slate-800 text-sm text-slate-300 leading-relaxed animate-in slide-in-from-top-2 duration-200'>
              {exercise.detailedInstructions}
            </div>
          )}
        </div>
      )}

      <div className='space-y-1 mt-auto'>
        <div className='grid grid-cols-[20px_0.8fr_1fr_1fr_0.8fr] gap-2 text-[10px] uppercase text-slate-500 font-bold mb-1 px-1'>
          <span>#</span>
          <span className='text-center'>Reps</span>
          <span className='text-center'>Intensity</span>
          <span className='text-center text-lime-400'>Weight</span>
          <span className='text-right'>Rest</span>
        </div>
        {exercise.setDetails.map((set: any, idx: number) => (
          <div
            key={idx}
            className='grid grid-cols-[20px_0.8fr_1fr_1fr_0.8fr] gap-2 items-center bg-slate-900 p-2 rounded text-sm border border-slate-800'
          >
            <span className='text-slate-500 font-mono text-xs text-center'>{idx + 1}</span>
            <span className='text-white font-medium text-center text-xs'>{set.reps || '-'}</span>
            <span
              className='text-white font-medium text-center text-[10px] truncate'
              title={set.weight}
            >
              {set.weight || '-'}
            </span>
            <input
              type='text'
              placeholder={units === 'standard' ? 'lbs' : 'kg'}
              value={set.actualWeight || ''}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) =>
                onUpdateSet(sectionIdx, exerciseIdx, idx, 'actualWeight', e.target.value)
              }
              className='bg-slate-800 border border-slate-700 rounded text-center text-lime-400 text-xs py-1 px-1 w-full focus:border-lime-500 focus:outline-none placeholder-slate-600'
            />
            <span className='text-white font-medium text-right text-xs truncate'>
              {set.duration || set.rest || '-'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const WorkoutDisplay: React.FC<Props> = ({ plan, units, userId }) => {
  // Lift plan to state to support editing
  const [localPlan, setLocalPlan] = useState<WorkoutPlan>(plan);
  const [activeIndices, setActiveIndices] = useState<{ sIdx: number; eIdx: number } | null>(null);
  const [weightSaveMessage, setWeightSaveMessage] = useState<string | null>(null);
  const [showModalDetailedInstructions, setShowModalDetailedInstructions] = useState(false);

  // Full Workout Save State
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(!!plan.id);

  useEffect(() => {
    setLocalPlan(plan);
    setHasSaved(!!plan.id);
  }, [plan]);

  useEffect(() => {
    setWeightSaveMessage(null);
    setShowModalDetailedInstructions(false);
  }, [activeIndices]);

  const handleUpdateSet = useCallback(
    (sIdx: number, eIdx: number, setIdx: number, field: string, value: string) => {
      setLocalPlan((prev) => {
        const newPlan = { ...prev };
        // Create shallow copies down the path to avoid mutation
        newPlan.sections = [...prev.sections];
        newPlan.sections[sIdx] = { ...prev.sections[sIdx] };
        newPlan.sections[sIdx].exercises = [...prev.sections[sIdx].exercises];
        newPlan.sections[sIdx].exercises[eIdx] = { ...prev.sections[sIdx].exercises[eIdx] };
        newPlan.sections[sIdx].exercises[eIdx].setDetails = [
          ...prev.sections[sIdx].exercises[eIdx].setDetails,
        ];

        newPlan.sections[sIdx].exercises[eIdx].setDetails[setIdx] = {
          ...newPlan.sections[sIdx].exercises[eIdx].setDetails[setIdx],
          [field]: value,
        };

        return newPlan;
      });
    },
    [],
  );

  const handleAddSet = useCallback((sIdx: number, eIdx: number) => {
    setLocalPlan((prev) => {
      const newPlan = { ...prev };
      newPlan.sections = [...prev.sections];
      newPlan.sections[sIdx] = { ...prev.sections[sIdx] };
      newPlan.sections[sIdx].exercises = [...prev.sections[sIdx].exercises];
      newPlan.sections[sIdx].exercises[eIdx] = { ...prev.sections[sIdx].exercises[eIdx] };

      const currentSets = newPlan.sections[sIdx].exercises[eIdx].setDetails;
      const lastSet =
        currentSets.length > 0
          ? currentSets[currentSets.length - 1]
          : { reps: '10', weight: 'Medium', rest: '60s' };

      // Create new set populated with data from previous row
      const newSet = {
        ...lastSet,
        isUserAdded: true,
      };

      // Create new array reference
      newPlan.sections[sIdx].exercises[eIdx].setDetails = [...currentSets, newSet];
      // Update the top level set count for consistency
      newPlan.sections[sIdx].exercises[eIdx].sets =
        newPlan.sections[sIdx].exercises[eIdx].setDetails.length;

      return newPlan;
    });
  }, []);

  const handleNext = useCallback(() => {
    if (!activeIndices) return;
    const { sIdx, eIdx } = activeIndices;

    const currentSection = localPlan.sections[sIdx];
    if (eIdx < currentSection.exercises.length - 1) {
      setActiveIndices({ sIdx, eIdx: eIdx + 1 });
    } else if (sIdx < localPlan.sections.length - 1) {
      setActiveIndices({ sIdx: sIdx + 1, eIdx: 0 });
    }
  }, [activeIndices, localPlan.sections]);

  const handlePrev = useCallback(() => {
    if (!activeIndices) return;
    const { sIdx, eIdx } = activeIndices;

    if (eIdx > 0) {
      setActiveIndices({ sIdx, eIdx: eIdx - 1 });
    } else if (sIdx > 0) {
      const prevSection = localPlan.sections[sIdx - 1];
      setActiveIndices({ sIdx: sIdx - 1, eIdx: prevSection.exercises.length - 1 });
    }
  }, [activeIndices, localPlan.sections]);

  const handleSaveWeights = useCallback(() => {
    setWeightSaveMessage('Saving...');
    // Save to DB using the current plan state and userId prop
    saveWorkoutToDb(localPlan, userId).then((id) => {
      if (id) {
        setLocalPlan((prev) => ({ ...prev, id })); // Update local plan with DB ID
        setWeightSaveMessage('Weights saved!');
        setHasSaved(true);
      } else {
        setWeightSaveMessage('Error saving - check connection');
        console.error('❌ Weight save failed for user:', userId);
      }
      setTimeout(() => setWeightSaveMessage(null), 2000);
    });
  }, [localPlan, userId]);

  const handleFullSave = async () => {
    setIsSaving(true);
    const newId = await saveWorkoutToDb(localPlan, userId);
    setIsSaving(false);
    if (newId) {
      setLocalPlan((prev) => ({ ...prev, id: newId }));
      setHasSaved(true);
      alert('Workout saved successfully!');
    } else {
      alert('Failed to save workout. Please check your connection and try again.');
      console.error('❌ Workout save failed for user:', userId);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeIndices) return;
      if (document.activeElement?.tagName === 'INPUT') return;

      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'Escape') setActiveIndices(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndices, handleNext, handlePrev]);

  // Disable body scroll when modal is open
  useEffect(() => {
    if (activeIndices) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [activeIndices]);

  const activeExercise = activeIndices
    ? localPlan.sections[activeIndices.sIdx].exercises[activeIndices.eIdx]
    : null;

  const activeSectionTitle = activeIndices ? localPlan.sections[activeIndices.sIdx].type : '';

  return (
    <div className='animate-in slide-in-from-bottom-8 duration-700 pb-20'>
      {/* Carousel Modal Overlay */}
      {activeIndices && activeExercise && (
        <div className='fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200'>
          {/* Header */}
          <div className='w-full max-w-4xl flex justify-between items-center mb-6 text-white'>
            <div className='flex flex-col'>
              <span className='text-lime-400 text-xs font-bold uppercase tracking-widest'>
                {activeSectionTitle}
              </span>
              <span className='text-slate-400 text-sm'>
                Exercise {activeIndices.eIdx + 1} of{' '}
                {localPlan.sections[activeIndices.sIdx].exercises.length}
              </span>
            </div>
            <button
              onClick={() => setActiveIndices(null)}
              className='p-2 hover:bg-slate-800 rounded-full transition-colors'
            >
              <X className='w-8 h-8 text-slate-400 hover:text-white' />
            </button>
          </div>

          {/* Main Slide Area */}
          <div className='w-full max-w-5xl flex items-center justify-between gap-4'>
            {/* Prev Button */}
            <button
              onClick={handlePrev}
              disabled={activeIndices.sIdx === 0 && activeIndices.eIdx === 0}
              className='p-3 rounded-full hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all hidden md:block'
            >
              <ChevronLeft className='w-10 h-10 text-lime-400' />
            </button>

            {/* Card Container */}
            <div className='w-full max-w-2xl bg-slate-900 rounded-2xl p-1 shadow-2xl border border-slate-700 relative'>
              <div className='absolute -inset-0.5 bg-gradient-to-br from-lime-500 to-green-600 rounded-2xl opacity-20 blur-sm'></div>
              <div className='relative bg-slate-900 rounded-xl overflow-hidden h-full max-h-[80vh] overflow-y-auto'>
                <div className='p-6 md:p-8'>
                  <div className='flex items-center gap-3 mb-6'>
                    <div className='p-3 bg-lime-500/10 rounded-xl'>
                      <Activity className='w-8 h-8 text-lime-400' />
                    </div>
                    <div>
                      <h2 className='text-2xl md:text-3xl font-black text-white'>
                        {activeExercise.name}
                      </h2>
                      <div className='flex gap-2 mt-1'>
                        <span className='text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-md uppercase tracking-wider font-bold'>
                          {activeExercise.muscleTarget}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className='grid grid-cols-2 gap-4 mb-8'>
                    <div className='bg-slate-800 p-4 rounded-xl border border-slate-700/50'>
                      <span className='text-slate-500 text-xs uppercase font-bold block mb-1'>
                        Total Sets
                      </span>
                      <span className='text-2xl font-bold text-white'>
                        {activeExercise.setDetails.length}
                      </span>
                    </div>
                    <div className='bg-slate-800 p-4 rounded-xl border border-slate-700/50'>
                      <span className='text-slate-500 text-xs uppercase font-bold block mb-1'>
                        Tempo
                      </span>
                      <span className='text-2xl font-bold text-white'>
                        {activeExercise.tempo || 'Standard'}
                      </span>
                    </div>
                  </div>

                  {activeExercise.cues && (
                    <div className='mb-8'>
                      <h3 className='text-sm font-bold text-lime-400 uppercase tracking-wider mb-3 flex items-center gap-2'>
                        <CheckCircle2 className='w-4 h-4' /> Form Cues
                      </h3>
                      <ul className='grid gap-3'>
                        {activeExercise.cues.map((cue: string, i: number) => (
                          <li
                            key={i}
                            className='flex gap-3 text-slate-300 bg-slate-800/50 p-3 rounded-lg border border-slate-800'
                          >
                            <span className='text-lime-500 font-bold text-lg'>•</span>
                            <span className='leading-snug'>{cue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {activeExercise.detailedInstructions && (
                    <div className='mb-8'>
                      <button
                        onClick={() =>
                          setShowModalDetailedInstructions(!showModalDetailedInstructions)
                        }
                        className='w-full flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 text-sm font-bold text-slate-300 hover:text-lime-400 hover:border-lime-500/50 transition-all'
                      >
                        <div className='flex items-center gap-3'>
                          <FileText className='w-5 h-5 text-lime-500' />
                          Detailed Instructions
                        </div>
                        {showModalDetailedInstructions ? (
                          <ChevronUp className='w-5 h-5' />
                        ) : (
                          <ChevronDown className='w-5 h-5' />
                        )}
                      </button>

                      {showModalDetailedInstructions && (
                        <div className='mt-4 p-6 bg-slate-950 rounded-xl border border-slate-800 text-base text-slate-300 leading-relaxed animate-in slide-in-from-top-2 duration-200'>
                          {activeExercise.detailedInstructions}
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <h3 className='text-sm font-bold text-lime-400 uppercase tracking-wider mb-3 flex items-center gap-2'>
                      <Timer className='w-4 h-4' /> Set Details
                    </h3>
                    <div className='overflow-hidden rounded-xl border border-slate-700'>
                      <table className='w-full text-sm'>
                        <thead className='bg-slate-800 text-slate-400 text-xs uppercase font-bold'>
                          <tr>
                            <th className='py-3 px-4 text-left'>Set</th>
                            <th className='py-3 px-4 text-center'>Reps</th>
                            <th className='py-3 px-4 text-center'>Intensity</th>
                            <th className='py-3 px-4 text-center text-lime-400'>Weight</th>
                            <th className='py-3 px-4 text-right'>Rest / Time</th>
                          </tr>
                        </thead>
                        <tbody className='divide-y divide-slate-800 bg-slate-900/50'>
                          {activeExercise.setDetails.map((set: any, idx: number) => (
                            <tr key={idx} className='hover:bg-slate-800/50 transition-colors'>
                              <td className='py-4 px-4 font-mono text-slate-500'>{idx + 1}</td>
                              <td className='py-4 px-2 text-center'>
                                {set.isUserAdded ? (
                                  <input
                                    type='text'
                                    value={set.reps || ''}
                                    onChange={(e) =>
                                      handleUpdateSet(
                                        activeIndices.sIdx,
                                        activeIndices.eIdx,
                                        idx,
                                        'reps',
                                        e.target.value,
                                      )
                                    }
                                    className='w-full bg-slate-950 border border-slate-700 text-white text-center rounded p-2 focus:border-lime-500 outline-none'
                                  />
                                ) : (
                                  <span className='font-bold text-white text-lg'>
                                    {set.reps || '-'}
                                  </span>
                                )}
                              </td>
                              <td className='py-4 px-2 text-center'>
                                {set.isUserAdded ? (
                                  <input
                                    type='text'
                                    value={set.weight || ''}
                                    onChange={(e) =>
                                      handleUpdateSet(
                                        activeIndices.sIdx,
                                        activeIndices.eIdx,
                                        idx,
                                        'weight',
                                        e.target.value,
                                      )
                                    }
                                    className='w-full bg-slate-950 border border-slate-700 text-white text-center text-xs rounded p-2 focus:border-lime-500 outline-none'
                                  />
                                ) : (
                                  <span className='text-slate-300'>{set.weight || '-'}</span>
                                )}
                              </td>
                              <td className='py-2 px-2'>
                                <input
                                  type='text'
                                  placeholder={units === 'standard' ? 'lbs' : 'kg'}
                                  value={set.actualWeight || ''}
                                  onChange={(e) =>
                                    handleUpdateSet(
                                      activeIndices.sIdx,
                                      activeIndices.eIdx,
                                      idx,
                                      'actualWeight',
                                      e.target.value,
                                    )
                                  }
                                  className='w-full bg-slate-950 border border-slate-700 text-lime-400 text-center font-bold rounded p-2 focus:border-lime-500 outline-none placeholder-slate-600'
                                />
                              </td>
                              <td className='py-4 px-2 text-right'>
                                {set.isUserAdded ? (
                                  <input
                                    type='text'
                                    value={set.duration || set.rest || ''}
                                    onChange={(e) =>
                                      handleUpdateSet(
                                        activeIndices.sIdx,
                                        activeIndices.eIdx,
                                        idx,
                                        'rest',
                                        e.target.value,
                                      )
                                    }
                                    className='w-full bg-slate-950 border border-slate-700 text-white text-center rounded p-2 focus:border-lime-500 outline-none'
                                  />
                                ) : (
                                  <span className='text-slate-300'>
                                    {set.duration || set.rest || '-'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Add Set Button */}
                      <div className='bg-slate-900/50 p-2'>
                        <button
                          onClick={() => handleAddSet(activeIndices.sIdx, activeIndices.eIdx)}
                          className='w-full py-2 border-2 border-dashed border-slate-700 hover:border-lime-500 text-slate-400 hover:text-lime-400 rounded-lg flex items-center justify-center gap-2 transition-all text-sm font-bold'
                        >
                          <Plus className='w-4 h-4' /> Add Set
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Modal Save Button */}
                  <div className='mt-6 flex justify-end items-center gap-4 border-t border-slate-800 pt-6'>
                    {weightSaveMessage && (
                      <span className='text-lime-400 text-sm font-bold flex items-center gap-2 animate-in fade-in slide-in-from-right-4'>
                        <CheckCircle2 className='w-4 h-4' /> {weightSaveMessage}
                      </span>
                    )}
                    <button
                      onClick={handleSaveWeights}
                      className='bg-lime-500 hover:bg-lime-400 text-slate-900 font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-lime-900/20 active:scale-95'
                    >
                      <Save className='w-5 h-5' /> Save Weights
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Button */}
            <button
              onClick={handleNext}
              disabled={
                activeIndices.sIdx === localPlan.sections.length - 1 &&
                activeIndices.eIdx ===
                  localPlan.sections[localPlan.sections.length - 1].exercises.length - 1
              }
              className='p-3 rounded-full hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all hidden md:block'
            >
              <ChevronRight className='w-10 h-10 text-lime-400' />
            </button>
          </div>

          <div className='flex md:hidden gap-4 mt-6 w-full px-4'>
            <button
              onClick={handlePrev}
              disabled={activeIndices.sIdx === 0 && activeIndices.eIdx === 0}
              className='flex-1 bg-slate-800 py-3 rounded-xl flex justify-center items-center text-lime-400 disabled:opacity-30'
            >
              <ChevronLeft className='w-6 h-6' /> Prev
            </button>
            <button
              onClick={handleNext}
              disabled={
                activeIndices.sIdx === localPlan.sections.length - 1 &&
                activeIndices.eIdx ===
                  localPlan.sections[localPlan.sections.length - 1].exercises.length - 1
              }
              className='flex-1 bg-slate-800 py-3 rounded-xl flex justify-center items-center text-lime-400 disabled:opacity-30'
            >
              Next <ChevronRight className='w-6 h-6' />
            </button>
          </div>
          <div className='mt-6 text-slate-500 text-sm hidden md:block'>
            Use Arrow Keys to Navigate • ESC to Close
          </div>
        </div>
      )}

      {/* Header Card */}
      <div className='bg-gradient-to-r from-lime-900 to-green-900 rounded-2xl p-6 mb-6 shadow-2xl border border-lime-700/30 relative overflow-hidden'>
        <div className='absolute top-0 right-0 p-8 opacity-10 pointer-events-none'>
          <Dumbbell className='w-64 h-64 text-white transform rotate-12' />
        </div>

        <div className='relative z-10'>
          <div className='flex justify-between items-start mb-2'>
            <div className='flex items-center gap-2 text-lime-300 font-bold tracking-wider text-xs uppercase'>
              Fitcopilot Trainer Generated Plan • {localPlan.difficulty}
            </div>

            {/* Top Save Button */}
            <button
              onClick={handleFullSave}
              disabled={isSaving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-lg ${
                hasSaved
                  ? 'bg-slate-900/50 text-lime-400 border border-lime-500/50'
                  : 'bg-lime-500 text-slate-900 hover:bg-lime-400'
              }`}
            >
              {isSaving ? 'Saving...' : hasSaved ? 'Update Saved' : 'Save Workout'}
              {hasSaved ? (
                <CheckCircle2 className='w-4 h-4' />
              ) : (
                <CloudUpload className='w-4 h-4' />
              )}
            </button>
          </div>

          <h1 className='text-3xl md:text-4xl font-black text-white mb-4'>{localPlan.title}</h1>
          <p className='text-lime-100 text-lg mb-6 max-w-2xl'>{localPlan.description}</p>

          <div className='flex flex-wrap gap-4 mb-6'>
            <div className='bg-lime-950/50 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center gap-2 border border-lime-800'>
              <Clock className='w-5 h-5 text-lime-400' />
              <span className='text-white font-bold'>{localPlan.totalDuration} min</span>
            </div>
            <div className='bg-lime-950/50 backdrop-blur-sm px-4 py-2 rounded-lg flex items-center gap-2 border border-lime-800'>
              <Flame className='w-5 h-5 text-orange-400' />
              <span className='text-white font-bold'>{localPlan.estimatedCalories} kcal</span>
            </div>
          </div>

          <div className='bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10'>
            <div className='flex items-start gap-3'>
              <div className='p-2 bg-lime-500 rounded-lg shrink-0'>
                <CheckCircle2 className='w-5 h-5 text-slate-900' />
              </div>
              <div>
                <h4 className='font-bold text-white text-sm uppercase mb-1'>Trainer's Note</h4>
                <p className='text-lime-50 text-sm italic'>"{localPlan.trainerNotes}"</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className='space-y-8'>
        {localPlan.sections.map((section, sIdx) => (
          <div key={sIdx} className='relative'>
            <div className='flex items-center gap-4 mb-4'>
              <div
                className={`h-8 w-1 rounded-full ${
                  section.type === 'Warmup'
                    ? 'bg-yellow-500'
                    : section.type === 'Main Workout'
                      ? 'bg-lime-500'
                      : section.type === 'Finisher'
                        ? 'bg-red-500'
                        : 'bg-green-500'
                }`}
              />
              <h3 className='text-2xl font-bold text-white'>{section.type}</h3>
              <span className='text-slate-500 text-sm font-mono border border-slate-700 px-2 py-0.5 rounded'>
                {section.durationEstimate}
              </span>
            </div>

            <div className='grid grid-cols-1 xl:grid-cols-2 gap-4'>
              {section.exercises.map((ex, eIdx) => (
                <ExerciseCard
                  key={eIdx}
                  exercise={ex}
                  sectionIdx={sIdx}
                  exerciseIdx={eIdx}
                  units={units}
                  onUpdateSet={handleUpdateSet}
                  isHoverable={true}
                  onClick={() => setActiveIndices({ sIdx, eIdx })}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Personalization Card */}
      {localPlan.personalization && localPlan.personalization.length > 0 && (
        <div className='mt-12 mb-8 bg-gradient-to-br from-slate-900 to-slate-900 border border-lime-500/20 rounded-2xl overflow-hidden relative'>
          <div className='absolute top-0 right-0 p-4 opacity-5'>
            <Sliders className='w-32 h-32 text-lime-500' />
          </div>

          <div className='p-6 md:p-8 relative z-10'>
            <div className='flex items-center gap-3 mb-6'>
              <div className='bg-lime-500/10 p-3 rounded-xl'>
                <User className='w-6 h-6 text-lime-400' />
              </div>
              <div>
                <h3 className='text-xl font-bold text-white'>Personalized For You</h3>
                <p className='text-slate-400 text-sm'>
                  How we adapted this workout to your profile
                </p>
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {localPlan.personalization.map((item, idx) => (
                <div
                  key={idx}
                  className='bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl'
                >
                  <div className='text-xs font-bold text-lime-500 uppercase tracking-wider mb-1 flex items-center gap-2'>
                    <div className='w-1.5 h-1.5 rounded-full bg-lime-500'></div>
                    {item.attribute}
                  </div>
                  <p className='text-slate-300 text-sm leading-relaxed'>{item.adjustment}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className='mt-12 p-6 bg-slate-900 rounded-xl border border-slate-800 flex flex-col items-center'>
        <p className='text-slate-500 text-sm mb-4'>
          Don't forget to save your workout to track your history.
        </p>

        <div className='flex flex-col md:flex-row gap-4'>
          <button
            onClick={handleFullSave}
            disabled={isSaving}
            className={`flex items-center justify-center gap-2 px-8 py-3 rounded-lg font-bold transition-all shadow-lg ${
              hasSaved
                ? 'bg-slate-800 text-lime-400 border border-lime-500/50 hover:bg-slate-700'
                : 'bg-lime-500 text-slate-900 hover:bg-lime-400'
            }`}
          >
            {isSaving ? 'Saving...' : hasSaved ? 'Update Saved Workout' : 'Save Full Workout'}
            {hasSaved ? <CheckCircle2 className='w-5 h-5' /> : <CloudUpload className='w-5 h-5' />}
          </button>

          <button className='text-slate-500 hover:text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors'>
            <AlertTriangle className='w-4 h-4' /> Report an issue with this plan
          </button>
        </div>
      </div>
    </div>
  );
};
