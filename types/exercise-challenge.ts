/**
 * TypeScript types for Exercise Challenge feature
 */

export type ExerciseCategory = 'strength' | 'conditioning' | 'mobility' | 'skill' | 'recovery'
export type EquipmentType = 'none' | 'db' | 'bb' | 'kb' | 'bands' | 'machine' | 'other'
export type MovementPattern =
  | 'squat'
  | 'hinge'
  | 'push'
  | 'pull'
  | 'carry'
  | 'rotation'
  | 'locomotion'
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'
export type ExerciseStatus = 'new' | 'reviewing' | 'accepted' | 'rejected'

export interface Lead {
  id: string
  first_name: string
  email: string
  source: string
  utm_source?: string | null
  utm_campaign?: string | null
  utm_medium?: string | null
  referrer?: string | null
  consent_follow_up: boolean
  consent_email_plan: boolean
  coaching_interest: boolean
  verified: boolean
  created_at: string
}

export interface ExerciseSubmission {
  id: string
  lead_id: string
  exercise_name: string
  category: ExerciseCategory
  equipment: EquipmentType
  primary_muscles: string[]
  movement_pattern: MovementPattern
  difficulty: DifficultyLevel
  technique_cues: string
  safety_notes?: string | null
  regression?: string | null
  progression?: string | null
  mistakes?: string | null
  contraindications?: string | null
  rationale?: string | null
  vision_prompt?: string | null
  status: ExerciseStatus
  created_at: string
}

export interface LeadFormData {
  first_name: string
  email: string
  consent_follow_up: boolean
  consent_email_plan: boolean
  coaching_interest: boolean
  turnstile_token: string
}

export interface ExerciseSubmissionFormData {
  exercise_name: string
  category: ExerciseCategory
  equipment: EquipmentType
  primary_muscles: string[]
  movement_pattern: MovementPattern
  difficulty: DifficultyLevel
  technique_cues: string
  safety_notes?: string
  regression?: string
  progression?: string
  mistakes?: string
  contraindications?: string
  rationale?: string
  vision_prompt?: string
}

export interface CreateLeadResponse {
  success: boolean
  lead_id: string
  message?: string
}

export interface CreateExerciseSubmissionResponse {
  success: boolean
  submission_id: string
  message?: string
}

export interface VisionLeadIntel {
  id: string
  lead_id: string
  vision_prompt?: string | null
  goal_primary: string
  frustration_primary: string
  ai_expectation_primary: string
  payment_trigger_primary?: string | null
  expectation_free_text?: string | null
  exercise_suggestion?: string | null
  created_at: string
}

export interface MicroInterviewFormData {
  goal_primary: string
  frustration_primary: string
  ai_expectation_primary: string
  payment_trigger_primary?: string
  expectation_free_text?: string
  exercise_suggestion?: string
  vision_prompt?: string
}

export interface CreateVisionLeadIntelResponse {
  success: boolean
  intel_id: string
  message?: string
}
