/**
 * Admin-specific types for the admin dashboard
 */

import type { Lead, VisionLeadIntel, ExerciseSubmission } from './exercise-challenge'

/**
 * Admin Lead type (reuses Lead from exercise-challenge)
 */
export type AdminLead = Lead

/**
 * Admin Lead with related data (vision_lead_intel and exercise_submissions)
 */
export interface AdminLeadWithRelations extends AdminLead {
  vision_lead_intel?: VisionLeadIntel[]
  exercise_submissions?: ExerciseSubmission[]
}
