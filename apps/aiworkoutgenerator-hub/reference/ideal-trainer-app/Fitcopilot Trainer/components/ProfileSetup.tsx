'use client';

import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { User, Activity, AlertCircle, Save, Stethoscope, Settings } from 'lucide-react';

interface Props {
  profile: UserProfile;
  onSave: (p: UserProfile) => void;
}

export const ProfileSetup: React.FC<Props> = ({ profile, onSave }) => {
  const [localProfile, setLocalProfile] = useState<UserProfile>(profile);
  // Maintain raw string state for array inputs
  const [rawGoals, setRawGoals] = useState(profile.goals.join(', '));
  const [rawInjuries, setRawInjuries] = useState(profile.injuries.join(', '));
  const [rawMedical, setRawMedical] = useState(profile.medicalConditions.join(', '));
  const [rawEquipment, setRawEquipment] = useState(profile.equipmentAccess.join(', '));

  const [isOpen, setIsOpen] = useState(false);

  // Sync props to state if props change (e.g. data loaded from DB)
  useEffect(() => {
    setLocalProfile(profile);
    setRawGoals(profile.goals.join(', '));
    setRawInjuries(profile.injuries.join(', '));
    setRawMedical(profile.medicalConditions.join(', '));
    setRawEquipment(profile.equipmentAccess.join(', '));
  }, [profile]);

  const handleChange = (field: keyof UserProfile, value: any) => {
    setLocalProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    // Parse raw strings into arrays upon saving
    const finalProfile: UserProfile = {
      ...localProfile,
      goals: rawGoals
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
      injuries: rawInjuries
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
      medicalConditions: rawMedical
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
      equipmentAccess: rawEquipment
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    };
    onSave(finalProfile);
    setIsOpen(false);
  };

  const toggleUnits = () => {
    const isStandard = localProfile.units === 'standard';
    const newUnit = isStandard ? 'metric' : 'standard';

    let newWeight = localProfile.weight;
    let newHeight = localProfile.height;

    if (isStandard) {
      newWeight = Math.round(newWeight / 2.20462);
      newHeight = Math.round(newHeight * 2.54);
    } else {
      newWeight = Math.round(newWeight * 2.20462);
      newHeight = Math.round(newHeight / 2.54);
    }

    setLocalProfile((prev) => ({
      ...prev,
      units: newUnit,
      weight: newWeight,
      height: newHeight,
    }));
  };

  const getFeet = () => Math.floor(localProfile.height / 12);
  const getInches = () => localProfile.height % 12;

  const handleHeightStandardChange = (type: 'ft' | 'in', val: number) => {
    const currentFeet = getFeet();
    const currentInches = getInches();
    let totalInches = 0;

    if (type === 'ft') {
      totalInches = val * 12 + currentInches;
    } else {
      totalInches = currentFeet * 12 + val;
    }
    handleChange('height', totalInches);
  };

  if (!isOpen) {
    return (
      <div className='bg-slate-800 p-4 rounded-xl shadow-lg border border-slate-700 flex justify-between items-center mb-6'>
        <div className='flex items-center space-x-4'>
          <div className='p-3 bg-lime-500 rounded-full'>
            <User className='text-slate-900 w-6 h-6' />
          </div>
          <div>
            <h3 className='font-bold text-white'>Athlete Profile</h3>
            <p className='text-slate-400 text-sm'>
              {localProfile.age}yo • {localProfile.weight}
              {localProfile.units === 'standard' ? 'lbs' : 'kg'} • {localProfile.fitnessLevel}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className='px-4 py-2 text-sm text-lime-400 hover:text-lime-300 font-medium transition-colors'
        >
          Edit Profile
        </button>
      </div>
    );
  }

  return (
    <div className='bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 mb-6 animate-in fade-in slide-in-from-top-4 duration-300'>
      <div className='flex justify-between items-start mb-6'>
        <h3 className='text-xl font-bold text-white flex items-center gap-2'>
          <User className='w-5 h-5 text-lime-400' /> Edit Profile
        </h3>

        <div className='flex items-center bg-slate-900 rounded-lg p-1 border border-slate-700'>
          <button
            onClick={() => localProfile.units !== 'standard' && toggleUnits()}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
              localProfile.units === 'standard'
                ? 'bg-lime-500 text-slate-900 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Standard
          </button>
          <button
            onClick={() => localProfile.units !== 'metric' && toggleUnits()}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
              localProfile.units === 'metric'
                ? 'bg-lime-500 text-slate-900 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Metric
          </button>
        </div>
      </div>

      {/* Vitals Grid */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
        <div>
          <label className='block text-slate-400 text-xs uppercase mb-1'>Age</label>
          <input
            type='number'
            value={localProfile.age}
            onChange={(e) => handleChange('age', parseInt(e.target.value))}
            className='w-full bg-slate-900 border border-slate-600 text-white rounded p-2 focus:border-lime-500 outline-none'
          />
        </div>

        <div>
          <label className='block text-slate-400 text-xs uppercase mb-1'>Gender</label>
          <select
            value={localProfile.gender}
            onChange={(e) => handleChange('gender', e.target.value)}
            className='w-full bg-slate-900 border border-slate-600 text-white rounded p-2 focus:border-lime-500 outline-none'
          >
            <option>Male</option>
            <option>Female</option>
            <option>Non-Binary</option>
            <option>Prefer not to say</option>
          </select>
        </div>

        <div>
          <label className='block text-slate-400 text-xs uppercase mb-1'>
            Weight ({localProfile.units === 'standard' ? 'lbs' : 'kg'})
          </label>
          <input
            type='number'
            value={localProfile.weight}
            onChange={(e) => handleChange('weight', parseInt(e.target.value))}
            className='w-full bg-slate-900 border border-slate-600 text-white rounded p-2 focus:border-lime-500 outline-none'
          />
        </div>

        <div>
          <label className='block text-slate-400 text-xs uppercase mb-1'>
            Height ({localProfile.units === 'standard' ? 'ft / in' : 'cm'})
          </label>
          {localProfile.units === 'standard' ? (
            <div className='flex gap-2'>
              <input
                type='number'
                placeholder='ft'
                value={getFeet()}
                onChange={(e) => handleHeightStandardChange('ft', parseInt(e.target.value) || 0)}
                className='w-full bg-slate-900 border border-slate-600 text-white rounded p-2 focus:border-lime-500 outline-none text-center'
              />
              <input
                type='number'
                placeholder='in'
                value={getInches()}
                onChange={(e) => handleHeightStandardChange('in', parseInt(e.target.value) || 0)}
                className='w-full bg-slate-900 border border-slate-600 text-white rounded p-2 focus:border-lime-500 outline-none text-center'
              />
            </div>
          ) : (
            <input
              type='number'
              value={localProfile.height}
              onChange={(e) => handleChange('height', parseInt(e.target.value))}
              className='w-full bg-slate-900 border border-slate-600 text-white rounded p-2 focus:border-lime-500 outline-none'
            />
          )}
        </div>
      </div>

      <div className='mb-4'>
        <label className='block text-slate-400 text-xs uppercase mb-1'>Fitness Level</label>
        <select
          value={localProfile.fitnessLevel}
          onChange={(e) => handleChange('fitnessLevel', e.target.value)}
          className='w-full bg-slate-900 border border-slate-600 text-white rounded p-2 focus:border-lime-500 outline-none'
        >
          <option>Beginner</option>
          <option>Intermediate</option>
          <option>Advanced</option>
          <option>Elite</option>
        </select>
      </div>

      {/* Array Inputs */}
      <div className='space-y-4'>
        <div>
          <label className='block text-slate-400 text-xs uppercase mb-1 flex items-center gap-1'>
            <Activity className='w-3 h-3 text-lime-400' /> Goals (comma separated)
          </label>
          <input
            type='text'
            value={rawGoals}
            onChange={(e) => setRawGoals(e.target.value)}
            className='w-full bg-slate-900 border border-slate-600 text-white rounded p-2 focus:border-lime-500 outline-none'
            placeholder='e.g. Muscle Gain, Fat Loss'
          />
        </div>

        <div>
          <label className='block text-slate-400 text-xs uppercase mb-1 flex items-center gap-1'>
            <AlertCircle className='w-3 h-3 text-red-400' /> Injuries (comma separated)
          </label>
          <input
            type='text'
            value={rawInjuries}
            onChange={(e) => setRawInjuries(e.target.value)}
            className='w-full bg-slate-900 border border-red-900/50 text-white rounded p-2 focus:border-red-500 outline-none placeholder-slate-600'
            placeholder='e.g. Lower Back Pain, Right Knee'
          />
        </div>

        <div>
          <label className='block text-slate-400 text-xs uppercase mb-1 flex items-center gap-1'>
            <Stethoscope className='w-3 h-3 text-blue-400' /> Medical Conditions (comma separated)
          </label>
          <input
            type='text'
            value={rawMedical}
            onChange={(e) => setRawMedical(e.target.value)}
            className='w-full bg-slate-900 border border-slate-600 text-white rounded p-2 focus:border-lime-500 outline-none'
            placeholder='e.g. Asthma, High Blood Pressure'
          />
        </div>

        <div>
          <label className='block text-slate-400 text-xs uppercase mb-1 flex items-center gap-1'>
            <Settings className='w-3 h-3 text-orange-400' /> Equipment Access (comma separated)
          </label>
          <input
            type='text'
            value={rawEquipment}
            onChange={(e) => setRawEquipment(e.target.value)}
            className='w-full bg-slate-900 border border-slate-600 text-white rounded p-2 focus:border-lime-500 outline-none'
            placeholder='e.g. Dumbbells, Outdoors, Machines'
          />
        </div>
      </div>

      <div className='flex justify-end gap-3 mt-6 border-t border-slate-700 pt-6'>
        <button
          onClick={() => {
            setIsOpen(false);
            setLocalProfile(profile);
            setRawGoals(profile.goals.join(', '));
            setRawInjuries(profile.injuries.join(', '));
            setRawMedical(profile.medicalConditions.join(', '));
            setRawEquipment(profile.equipmentAccess.join(', '));
          }}
          className='px-4 py-2 text-slate-300 hover:text-white transition-colors'
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className='bg-lime-500 hover:bg-lime-400 text-slate-900 px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors'
        >
          <Save className='w-4 h-4' /> Save Profile
        </button>
      </div>
    </div>
  );
};
