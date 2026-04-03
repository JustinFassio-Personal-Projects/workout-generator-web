/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Modal for personalized exercise image: form + result, uses ContentGenerationLab.
 */

import React, { useRef, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import {
  useContentGenerationLab,
  ContentGenerationLab,
} from '@workout-generator/content-generation-lab';
import { supabase } from '@/lib/supabase/client';
import { uploadPersonalizedExerciseImage } from '@/lib/supabase/client/storage';
import { generateSlug } from '@/lib/parse-biomechanics';
import PersonalizedExerciseImageForm from './PersonalizedExerciseImageForm';
import GeneratedImageDisplay from './GeneratedImageDisplay';

export interface PersonalizedExerciseImageSession {
  id: string;
  exercises: { exerciseName: string }[];
}

export interface PersonalizedExerciseImageModalProps {
  session: PersonalizedExerciseImageSession;
  onClose: () => void;
}

const PersonalizedExerciseImageModal: React.FC<PersonalizedExerciseImageModalProps> = ({
  session,
  onClose,
}) => {
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const formDataRef = useRef<{ exerciseName: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const { generation, reference } = useContentGenerationLab<{ image: string }>({
    apiEndpoint: '/api/personalized-exercise-image',
    useReference: true,
    buildBody: (ref) => {
      const fd = formDataRef.current;
      if (!fd) throw new Error('Form data not set');
      if (!ref?.referenceImageData) throw new Error('Reference image required');
      return {
        sessionId: session.id,
        exerciseName: fd.exerciseName,
        referenceImage: ref.referenceImageData,
      };
    },
    parseResponse: (d) => {
      const data = d as { image?: string | null };
      if (!data.image || typeof data.image !== 'string' || data.image.trim() === '') {
        throw new Error('Image generation failed: missing image in response');
      }
      return { image: data.image };
    },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleFormSubmit = () => {
    if (!selectedExercise || !reference?.referenceImageData) return;
    formDataRef.current = { exerciseName: selectedExercise };
    generation.submit();
  };

  const handleSave = async () => {
    const image = generation.result?.image;
    const exerciseName = formDataRef.current?.exerciseName;
    if (!image || !exerciseName) return;
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');
      await uploadPersonalizedExerciseImage(user.id, generateSlug(exerciseName), image);
      toast.success('Image saved');
      onClose();
    } catch (err) {
      console.error('[PersonalizedExerciseImageModal] Save failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save image');
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border border-white/10 bg-bg-dark shadow-2xl"
        role="dialog"
        aria-labelledby="personalized-exercise-image-modal-title"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-bg-dark px-6 py-4">
          <h2
            id="personalized-exercise-image-modal-title"
            className="font-heading text-lg font-black uppercase text-white"
          >
            Create your exercise moment
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          <ContentGenerationLab<{ image: string }>
            title=""
            formSlot={
              <PersonalizedExerciseImageForm
                exercises={session.exercises}
                selectedExercise={selectedExercise}
                onSelectExercise={(name) => setSelectedExercise(name || null)}
                referenceImageData={reference?.referenceImageData ?? null}
                setReferenceFromDataUrl={reference?.setReferenceFromDataUrl ?? (() => {})}
                consentChecked={consentChecked}
                onConsentChange={setConsentChecked}
                onSubmit={handleFormSubmit}
                loading={generation.loading}
              />
            }
            resultSlot={({ result, onSave, onClear }) => (
              <GeneratedImageDisplay
                image={result.image}
                exerciseName={formDataRef.current?.exerciseName}
                onSave={onSave ?? (() => {})}
                onClear={onClear}
                saving={saving}
              />
            )}
            generation={generation}
            onSave={handleSave}
            saving={saving}
          />
        </div>
      </div>
    </>
  );
};

export default PersonalizedExerciseImageModal;
