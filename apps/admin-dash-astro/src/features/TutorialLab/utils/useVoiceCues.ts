/**
 * TTS hook for Tutorial Lab voice cues.
 * Uses Web Speech API with debouncing to avoid spam.
 */

import { useCallback, useRef } from 'react';

const WRONG_CUE_DEBOUNCE_MS = 4500;
const PHASE_CUE_DEBOUNCE_MS = 2000;
const CORRECT_CUE_DEBOUNCE_MS = 3000;

function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function speak(text: string, rate = 1, volume = 1): void {
  if (!text.trim() || !isSpeechSupported()) return;
  if (window.speechSynthesis.speaking) return;

  const utterance = new SpeechSynthesisUtterance(text.trim());
  utterance.rate = Math.max(0.5, Math.min(2, rate));
  utterance.volume = Math.max(0, Math.min(1, volume));
  utterance.lang = 'en-US';
  window.speechSynthesis.speak(utterance);
}

export interface UseVoiceCuesOptions {
  rate?: number;
  volume?: number;
}

export function useVoiceCues(enabled: boolean, options: UseVoiceCuesOptions = {}) {
  const { rate = 1, volume = 1 } = options;
  const lastPhaseCueAt = useRef<number>(0);
  const lastWrongCueAt = useRef<number>(0);
  const lastCorrectCueAt = useRef<number>(0);

  const speakPhaseCue = useCallback(
    (text: string) => {
      if (!enabled || !text.trim()) return;
      const now = Date.now();
      if (now - lastPhaseCueAt.current < PHASE_CUE_DEBOUNCE_MS) return;
      lastPhaseCueAt.current = now;
      speak(text, rate, volume);
    },
    [enabled, rate, volume]
  );

  const speakWrongCue = useCallback(
    (text: string) => {
      if (!enabled || !text.trim()) return;
      const now = Date.now();
      if (now - lastWrongCueAt.current < WRONG_CUE_DEBOUNCE_MS) return;
      if (window.speechSynthesis?.speaking) return;
      lastWrongCueAt.current = now;
      speak(text, rate, volume);
    },
    [enabled, rate, volume]
  );

  const speakCorrectCue = useCallback(
    (text: string = 'Good, hold it') => {
      if (!enabled) return;
      const now = Date.now();
      if (now - lastCorrectCueAt.current < CORRECT_CUE_DEBOUNCE_MS) return;
      if (window.speechSynthesis?.speaking) return;
      lastCorrectCueAt.current = now;
      speak(text, rate, volume);
    },
    [enabled, rate, volume]
  );

  return { speakPhaseCue, speakWrongCue, speakCorrectCue, isSupported: isSpeechSupported() };
}
