/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { fetchChallengeMetadata } from '@/lib/supabase/client/challenge-persistence';
import type { ChallengeTemplate, ChallengeConfig } from '@/types/ai-challenge';
import type { PromptChainMetadata } from '@/types/ai-program';
import ChallengeLibraryTable from '../ChallengeLibraryTable';
import ChallengeGeneratorModal from '../ChallengeGeneratorModal';

const ManageChallenges: React.FC = () => {
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<ChallengeTemplate | null>(null);
  const [editingChallengeId, setEditingChallengeId] = useState<string | null>(null);
  const [editingChallengeConfig, setEditingChallengeConfig] = useState<ChallengeConfig | null>(
    null
  );
  const [editingChainMetadata, setEditingChainMetadata] = useState<PromptChainMetadata | null>(
    null
  );
  const [editingHeroImageUrl, setEditingHeroImageUrl] = useState<string | undefined>();
  const [editingSectionImages, setEditingSectionImages] = useState<
    Record<string, string> | undefined
  >();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleImagesUpdate = async () => {
    if (!editingChallengeId) return;
    try {
      const metadata = await fetchChallengeMetadata(editingChallengeId);
      setEditingHeroImageUrl(metadata.heroImageUrl);
      setEditingSectionImages(metadata.sectionImages);
    } catch (err) {
      console.error('[ManageChallenges] Error refreshing images:', err);
    }
  };

  const handleNewChallenge = () => {
    setEditingChallenge(null);
    setEditingChallengeId(null);
    setEditingChallengeConfig(null);
    setEditingChainMetadata(null);
    setEditingHeroImageUrl(undefined);
    setEditingSectionImages(undefined);
    setShowGeneratorModal(true);
  };

  const handleCloseModal = () => {
    setShowGeneratorModal(false);
    setEditingChallenge(null);
    setEditingChallengeId(null);
    setEditingChallengeConfig(null);
    setEditingChainMetadata(null);
    setEditingHeroImageUrl(undefined);
    setEditingSectionImages(undefined);
    setRefreshKey((prev) => prev + 1);
  };

  const handleGenerate = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleEditFromTable = async (fullChallenge: ChallengeTemplate, challengeId: string) => {
    setEditingChallenge(fullChallenge);
    setEditingChallengeId(challengeId);
    try {
      const metadata = await fetchChallengeMetadata(challengeId);
      const config: ChallengeConfig = {
        challengeInfo: {
          title: fullChallenge.title || '',
          description: fullChallenge.description || '',
        },
        targetAudience: metadata.targetAudience || {
          ageRange: '26-35',
          sex: 'Male',
          weight: 180,
          experienceLevel: fullChallenge.difficulty || 'intermediate',
        },
        requirements: {
          durationWeeks: metadata.durationWeeks as 2 | 3 | 4 | 5 | 6,
          theme: fullChallenge.theme,
        },
        medicalContext: { includeInjuries: false, includeConditions: false },
        goals: metadata.goals ?? { primary: 'Muscle Gain', secondary: 'Strength' },
        zoneId: metadata.equipmentProfile?.zoneId,
        selectedEquipmentIds: metadata.equipmentProfile?.equipmentIds,
      };
      setEditingChallengeConfig(config);
      setEditingChainMetadata(metadata.chain_metadata ?? null);
      setEditingHeroImageUrl(metadata.heroImageUrl ?? undefined);
      setEditingSectionImages(metadata.sectionImages ?? undefined);
    } catch (err) {
      console.error('[ManageChallenges] Error loading challenge for edit:', err);
      setEditingChallengeConfig({
        challengeInfo: {
          title: fullChallenge.title || '',
          description: fullChallenge.description || '',
        },
        targetAudience: {
          ageRange: '26-35',
          sex: 'Male',
          weight: 180,
          experienceLevel: fullChallenge.difficulty || 'intermediate',
        },
        requirements: {
          durationWeeks: (fullChallenge.durationWeeks ?? 4) as 2 | 3 | 4 | 5 | 6,
          theme: fullChallenge.theme || '',
        },
        medicalContext: { includeInjuries: false, includeConditions: false },
        goals: { primary: 'Muscle Gain', secondary: 'Strength' },
      });
      setEditingChainMetadata(null);
      setEditingHeroImageUrl(undefined);
      setEditingSectionImages(undefined);
    }
    setShowGeneratorModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">Challenge Factory</h1>
          <p className="mt-2 text-white/60">Create and manage 2-6 week fitness challenges</p>
        </div>
        <button
          onClick={handleNewChallenge}
          className="hover:bg-orange-light/90 flex items-center gap-2 rounded-lg bg-orange-light px-4 py-2 font-medium text-black transition-colors"
        >
          <Sparkles className="h-5 w-5" />
          <span>Create Challenge</span>
        </button>
      </div>

      <ChallengeLibraryTable key={refreshKey} onEdit={handleEditFromTable} />

      <ChallengeGeneratorModal
        isOpen={showGeneratorModal}
        onClose={handleCloseModal}
        onGenerate={handleGenerate}
        existingChallenge={editingChallenge || undefined}
        challengeConfig={editingChallengeConfig || undefined}
        editingChallengeId={editingChallengeId || undefined}
        editingChainMetadata={editingChainMetadata ?? undefined}
        editingHeroImageUrl={editingHeroImageUrl}
        editingSectionImages={editingSectionImages}
        onImagesUpdate={handleImagesUpdate}
      />
    </div>
  );
};

export default ManageChallenges;
