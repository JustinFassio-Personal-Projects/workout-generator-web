-- Anatomical muscle diagram image URL (AI-generated from muscle_engagement_map).
ALTER TABLE public.generated_exercises
  ADD COLUMN IF NOT EXISTS muscle_diagram_image_url text;
