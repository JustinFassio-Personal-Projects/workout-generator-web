/**
 * Modal for tutorial intro and phase feedback.
 * NOTE: focus-trap-react was removed due to build/parse issues; Escape still closes via useEffect.
 */

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface InstructionModalProps {
  title: string;
  children: React.ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onClose?: () => void;
  showClose?: boolean;
}

export default function InstructionModal({
  title,
  children,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onClose,
  showClose = true,
}: InstructionModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="instruction-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-lg border border-white/10 bg-[#0d0500] p-6 shadow-xl">
        {showClose && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
        )}
        <h2
            id="instruction-modal-title"
            className="pr-8 text-xl font-bold text-white"
          >
            {title}
        </h2>
        <div className="mt-4 text-white/80">{children}</div>
        <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onPrimary}
              className="rounded-lg bg-[#ffbf00] px-4 py-2 font-medium text-black transition-colors hover:bg-[#ffbf00]/90"
            >
              {primaryLabel}
            </button>
            {secondaryLabel && onSecondary && (
              <button
                type="button"
                onClick={onSecondary}
                className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 font-medium text-white transition-colors hover:bg-white/10"
              >
                {secondaryLabel}
              </button>
          )}
        </div>
      </div>
    </div>
  );
}
