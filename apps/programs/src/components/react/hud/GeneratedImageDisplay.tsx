/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Displays generated personalized exercise image with Save and Generate again.
 */

import React from 'react';

export interface GeneratedImageDisplayProps {
  image: string;
  exerciseName?: string;
  onSave: () => void;
  onClear: () => void;
  saving: boolean;
}

const GeneratedImageDisplay: React.FC<GeneratedImageDisplayProps> = ({
  image,
  exerciseName,
  onSave,
  onClear,
  saving,
}) => {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <img
          src={image}
          alt={exerciseName ? `You performing ${exerciseName}` : 'Generated exercise image'}
          className="w-full object-contain"
        />
      </div>
      {exerciseName && (
        <p className="font-mono text-[10px] uppercase text-white/50">{exerciseName}</p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="border-orange-light/50 bg-orange-light/20 hover:bg-orange-light/30 flex flex-1 items-center justify-center rounded-2xl border py-3 font-heading text-sm font-black uppercase text-orange-light transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={saving}
          className="flex flex-1 items-center justify-center rounded-2xl border border-white/20 bg-white/5 py-3 font-mono text-xs font-bold uppercase text-white/70 transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          Generate again
        </button>
      </div>
    </div>
  );
};

export default GeneratedImageDisplay;
