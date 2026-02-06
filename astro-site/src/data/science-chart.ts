/**
 * ScienceChart section: goal types and per-goal chart data (title, y-axis, caption, AI vs Random series).
 */

export type GoalType = 'hypertrophy' | 'strength' | 'fatloss' | 'power' | 'calisthenics'

export interface GoalData {
  title: string
  yAxisLabel: string
  caption: string
  aiData: number[]
  randomData: number[]
}

export const goalDataMap: Record<GoalType, GoalData> = {
  hypertrophy: {
    title: 'Projected Muscle Growth (Volume Load)',
    yAxisLabel: '% Baseline Volume',
    caption:
      '*AI incorporates deloads at week 8 to resensitize muscle tissue, preventing plateaus.',
    aiData: [100, 105, 115, 128, 142, 155, 165, 140, 160, 175, 185, 195],
    randomData: [100, 108, 115, 118, 120, 122, 120, 118, 115, 115, 112, 110],
  },
  strength: {
    title: 'Max Strength Gains (1 Rep Max)',
    yAxisLabel: '% Baseline 1RM',
    caption: '*AI uses Step-Loading periodization. Random plans stall due to CNS fatigue.',
    aiData: [100, 102, 105, 105, 108, 112, 112, 115, 118, 120, 120, 125],
    randomData: [100, 103, 106, 108, 108, 108, 109, 109, 108, 108, 107, 107],
  },
  fatloss: {
    title: 'Metabolic Work Capacity',
    yAxisLabel: '% Work Capacity',
    caption: '*AI increases density (less rest) over time. Random leads to early burnout.',
    aiData: [100, 110, 120, 130, 145, 160, 175, 185, 200, 215, 230, 250],
    randomData: [100, 130, 135, 120, 110, 100, 95, 90, 85, 80, 75, 70],
  },
  power: {
    title: 'Powerbuilding Composite Score',
    yAxisLabel: 'Composite Score',
    caption: '*AI balances heavy compounds with isolation volume for hybrid gains.',
    aiData: [100, 104, 108, 115, 122, 130, 138, 145, 152, 160, 168, 180],
    randomData: [100, 105, 102, 108, 103, 105, 102, 100, 98, 102, 100, 98],
  },
  calisthenics: {
    title: 'Relative Strength (Bodyweight)',
    yAxisLabel: 'Relative Strength',
    caption: '*AI progresses through leverage (e.g., knee pushup -> archer pushup).',
    aiData: [100, 110, 120, 120, 135, 150, 150, 165, 180, 180, 200, 220],
    randomData: [100, 110, 115, 118, 120, 122, 123, 124, 125, 125, 125, 125],
  },
}
