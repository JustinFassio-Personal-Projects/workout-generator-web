/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
export type AspectRatio = '16:9' | '9:16' | '1:1'

export type ComplexityLevel =
  | 'New to Exercise'
  | 'Some Experience'
  | 'Advanced Athlete'
  | 'Elite Athlete'

export type VisualStyle =
  | 'Default'
  | 'Minimalist'
  | 'Realistic'
  | 'Cartoon'
  | 'Vintage'
  | 'Futuristic'
  | '3D Render'
  | 'Sketch'

export type Language =
  | 'English'
  | 'Spanish'
  | 'French'
  | 'German'
  | 'Mandarin'
  | 'Japanese'
  | 'Hindi'
  | 'Arabic'
  | 'Portuguese'
  | 'Russian'

export interface ExerciseDetail {
  header: string
  content: string
}

export interface GeneratedImage {
  id: string
  data: string // Base64 data URL
  prompt: string
  timestamp: number
  level?: ComplexityLevel
  style?: VisualStyle
  language?: Language
  details?: ExerciseDetail[]
  thinking?: string
}

export interface SearchResultItem {
  title: string
  url: string
}

export interface ResearchResult {
  imagePrompt: string
  details: ExerciseDetail[]
  searchResults: SearchResultItem[]
  thinking?: string
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>
    openSelectKey: () => Promise<void>
  }
}
