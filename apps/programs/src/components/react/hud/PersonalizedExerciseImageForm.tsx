/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Form for personalized exercise image: exercise picker, photo upload, consent.
 */

import React, { useRef } from 'react';
import { Camera, ImagePlus } from 'lucide-react';

export interface PersonalizedExerciseImageFormProps {
  exercises: { exerciseName: string }[];
  selectedExercise: string | null;
  onSelectExercise: (exerciseName: string) => void;
  referenceImageData: string | null;
  setReferenceFromDataUrl: (dataUrl: string) => void;
  consentChecked: boolean;
  onConsentChange: (checked: boolean) => void;
  onSubmit: () => void;
  loading: boolean;
}

const PersonalizedExerciseImageForm: React.FC<PersonalizedExerciseImageFormProps> = ({
  exercises,
  selectedExercise,
  onSelectExercise,
  referenceImageData,
  setReferenceFromDataUrl,
  consentChecked,
  onConsentChange,
  onSubmit,
  loading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl === 'string') setReferenceFromDataUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const canSubmit =
    selectedExercise && referenceImageData && consentChecked && !loading;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit();
      }}
      className="space-y-4"
    >
      <div>
        <label
          htmlFor="personalized-exercise-select"
          className="mb-1.5 block font-mono text-[10px] font-medium uppercase text-white/70"
        >
          Pick an exercise *
        </label>
        <select
          id="personalized-exercise-select"
          value={selectedExercise ?? ''}
          onChange={(e) => onSelectExercise(e.target.value || '')}
          disabled={loading}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white focus:border-orange-light/50 focus:outline-none focus:ring-1 focus:ring-orange-light/50 disabled:opacity-50"
        >
          <option value="">Select exercise…</option>
          {exercises.map((ex) => (
            <option key={ex.exerciseName} value={ex.exerciseName}>
              {ex.exerciseName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="mb-1.5 font-mono text-[10px] font-medium uppercase text-white/70">
          Your photo (reference) *
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 py-6 transition-colors hover:border-orange-light/50 hover:bg-white/10 disabled:opacity-50"
        >
          {referenceImageData ? (
            <div className="flex items-center gap-3">
              <img
                src={referenceImageData}
                alt="Reference"
                className="h-16 w-16 rounded-lg object-cover"
              />
              <span className="font-mono text-xs text-white/70">
                Photo selected — tap to change
              </span>
            </div>
          ) : (
            <>
              <ImagePlus className="h-5 w-5 text-white/50" />
              <span className="font-mono text-xs text-white/60">
                Tap to upload a photo of yourself
              </span>
            </>
          )}
        </button>
      </div>

      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={consentChecked}
          onChange={(e) => onConsentChange(e.target.checked)}
          disabled={loading}
          className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black/20 text-orange-light focus:ring-orange-light/50"
        />
        <span className="font-mono text-[10px] text-white/70">
          I agree to use my photo for AI image generation
        </span>
      </label>

      <button
        type="submit"
        disabled={!canSubmit}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-light py-3 font-heading text-sm font-black uppercase text-black transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Camera className="h-4 w-4" />
        {loading ? 'Generating…' : 'Create my exercise moment'}
      </button>
    </form>
  );
};

export default PersonalizedExerciseImageForm;
