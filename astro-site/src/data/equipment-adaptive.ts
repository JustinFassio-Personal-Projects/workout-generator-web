/**
 * Data for the Equipment Adaptive section (Chest & Triceps example).
 * Single source of truth for the homepage adaptive demo.
 */

export type EquipmentType = 'gym' | 'dumbbells' | 'bodyweight'

export interface EquipmentAdaptiveExercise {
  name: string
  sets: string
  type: string
}

export interface EquipmentAdaptiveData {
  title: string
  desc: string
  logic: string[]
  exercises: EquipmentAdaptiveExercise[]
}

export const equipmentData: Record<EquipmentType, EquipmentAdaptiveData> = {
  gym: {
    title: 'Optimal Hypertrophy',
    desc: 'Full gym access allows for the most stable and loadable exercises, maximizing mechanical tension on the muscle fibers.',
    logic: [
      'Barbell Bench: Highest loading potential for CNS adaptation',
      'Cable Fly: Constant tension profile at full extension',
      'Tricep Pushdown: Isolation for lateral head (impossible with free weights)',
    ],
    exercises: [
      { name: 'Barbell Bench Press', sets: '3-4', type: 'Compound' },
      { name: 'Incline Dumbbell Press', sets: '3', type: 'Compound' },
      { name: 'Cable Chest Fly', sets: '3', type: 'Isolation' },
      { name: 'Rope Tricep Pushdown', sets: '3', type: 'Isolation' },
    ],
  },
  dumbbells: {
    title: 'Home Gym Stability',
    desc: 'Focuses on unilateral movements to fix imbalances since barbell stability is absent. Volume is increased to compensate for lower absolute loads.',
    logic: [
      'DB Press: Increased range of motion vs Barbell',
      'Unilateral work: High core stabilization requirement',
      'Floor Press: Limits ROM to protect shoulders without a spotter',
    ],
    exercises: [
      { name: 'Flat Dumbbell Press', sets: '4', type: 'Compound' },
      { name: 'Incline DB Fly', sets: '3', type: 'Isolation' },
      { name: 'DB Skullcrushers', sets: '3', type: 'Isolation' },
      { name: 'Close Grip DB Press', sets: '3', type: 'Compound' },
    ],
  },
  bodyweight: {
    title: 'Calisthenic Overload',
    desc: 'Uses leverage manipulation and tempo control to create intensity without external load.',
    logic: [
      'Decline Pushups: Shifts weight to upper chest/shoulders',
      'Dips: Highest relative load compound movement',
      'Tempo: 3-1-1 cadence to increase Time Under Tension (TUT)',
    ],
    exercises: [
      { name: 'Weighted/Standard Dips', sets: '4', type: 'Compound' },
      { name: 'Decline Pushups', sets: '3', type: 'Compound' },
      { name: 'Diamond Pushups', sets: '3', type: 'Isolation' },
      { name: 'Bench Dips', sets: '3', type: 'Burnout' },
    ],
  },
}
