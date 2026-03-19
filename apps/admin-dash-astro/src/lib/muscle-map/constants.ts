/**
 * Canonical muscle IDs for the Muscle Engagement Visualization.
 * AI output and SVG assets must use these IDs. See MUSCLE_ENGAGEMENT_VISUALIZATION_DESIGN.md.
 */

export const MUSCLE_IDS = [
  'pectoralis_major',
  'anterior_deltoid',
  'lateral_deltoid',
  'posterior_deltoid',
  'rectus_abdominis',
  'external_obliques',
  'serratus_anterior',
  'trapezius_upper',
  'trapezius_mid',
  'trapezius_lower',
  'latissimus_dorsi',
  'rhomboids',
  'erector_spinae',
  'biceps_brachii',
  'triceps_brachii',
  'brachialis',
  'forearm_flexors',
  'forearm_extensors',
  'gluteus_maximus',
  'gluteus_medius',
  'hip_flexors',
  'quadriceps',
  'hamstrings',
  'gastrocnemius',
  'soleus',
  'core_stabilizers',
] as const;

export type MuscleId = (typeof MUSCLE_IDS)[number];

export const MUSCLE_DISPLAY_NAMES: Record<string, string> = {
  pectoralis_major: 'Pectoralis major',
  anterior_deltoid: 'Anterior deltoid',
  lateral_deltoid: 'Lateral deltoid',
  posterior_deltoid: 'Posterior deltoid',
  rectus_abdominis: 'Rectus abdominis',
  external_obliques: 'External obliques',
  serratus_anterior: 'Serratus anterior',
  trapezius_upper: 'Upper trapezius',
  trapezius_mid: 'Mid trapezius',
  trapezius_lower: 'Lower trapezius',
  latissimus_dorsi: 'Latissimus dorsi',
  rhomboids: 'Rhomboids',
  erector_spinae: 'Erector spinae',
  biceps_brachii: 'Biceps brachii',
  triceps_brachii: 'Triceps brachii',
  brachialis: 'Brachialis',
  forearm_flexors: 'Forearm flexors',
  forearm_extensors: 'Forearm extensors',
  gluteus_maximus: 'Gluteus maximus',
  gluteus_medius: 'Gluteus medius',
  hip_flexors: 'Hip flexors (iliopsoas, TFL)',
  quadriceps: 'Quadriceps',
  hamstrings: 'Hamstrings',
  gastrocnemius: 'Gastrocnemius',
  soleus: 'Soleus',
  core_stabilizers: 'Core stabilizers',
};

/** Muscle IDs present in body-anterior.svg */
export const ANTERIOR_MUSCLE_IDS = [
  'pectoralis_major',
  'anterior_deltoid',
  'lateral_deltoid',
  'rectus_abdominis',
  'external_obliques',
  'serratus_anterior',
  'trapezius_upper',
  'biceps_brachii',
  'brachialis',
  'forearm_flexors',
  'hip_flexors',
  'quadriceps',
  'core_stabilizers',
] as const;

/** Muscle IDs present in body-posterior.svg */
export const POSTERIOR_MUSCLE_IDS = [
  'posterior_deltoid',
  'trapezius_upper',
  'trapezius_mid',
  'trapezius_lower',
  'latissimus_dorsi',
  'rhomboids',
  'erector_spinae',
  'triceps_brachii',
  'forearm_extensors',
  'gluteus_maximus',
  'gluteus_medius',
  'hamstrings',
  'gastrocnemius',
  'soleus',
] as const;

export function isValidMuscleId(id: string): id is MuscleId {
  return (MUSCLE_IDS as readonly string[]).includes(id);
}
