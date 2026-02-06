/**
 * Deep Research types for Supabase integration
 */

export interface DeepResearch {
  id: string
  slug: string
  title: string
  excerpt: string | null
  html_content: string
  seo_title: string | null
  seo_description: string | null
  status: 'draft' | 'published'
  published_at: string | null
  created_at: string
  updated_at: string
  equipment_zones?: string[]
  experience_levels?: string[]
  injuries_addressed?: string[]
  goals?: string[]
  days_per_week_min?: number | null
  days_per_week_max?: number | null
  diet_types?: string[]
  nutrition_goals?: string[]
  dietary_restrictions?: string[]
  macro_focus?: string[]
}
