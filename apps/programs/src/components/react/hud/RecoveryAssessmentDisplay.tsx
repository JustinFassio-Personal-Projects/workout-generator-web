/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Displays AI recovery assessment with Save and Generate again actions.
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';

export interface RecoveryAssessmentDisplayProps {
  insight: string;
  onSave: () => void;
  onClear: () => void;
  saving: boolean;
}

const RecoveryAssessmentDisplay: React.FC<RecoveryAssessmentDisplayProps> = ({
  insight,
  onSave,
  onClear,
  saving,
}) => {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="mb-2 font-mono text-[10px] font-medium uppercase text-white/50">
          Recovery assessment
        </p>
        <div className="prose prose-invert prose-sm max-w-none [&>li]:my-0.5 [&>p:last-child]:mb-0 [&>p]:mb-2 [&>ul]:my-2">
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="text-white/90">{children}</p>,
              ul: ({ children }) => (
                <ul className="list-inside list-disc space-y-1 text-white/90">{children}</ul>
              ),
              li: ({ children }) => <li>{children}</li>,
            }}
          >
            {insight}
          </ReactMarkdown>
        </div>
      </div>
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

export default RecoveryAssessmentDisplay;
