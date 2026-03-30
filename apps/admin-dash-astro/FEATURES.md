# Feature copy checklist (from apps/programs)

Copy one feature at a time into this app. For each, add API routes, components, libs, deps, then nav + route.

| Feature | API routes (programs) | Components (programs) | Notes |
|--------|------------------------|------------------------|-------|
| **Dashboard home** | — | — | ✅ Done (placeholder) |
| **Program Factory** | `api/admin/programs/index.ts`, `[programId].ts`; `api/ai/generate-architect`, `generate-blueprint`, `generate-program-chain`, `extend-program`, etc. | `ManagePrograms`, `ProgramEditor`, `ProgramGeneratorModal`, `ProgramLibraryTable`, `ProgramBlueprintEditor`, … | Heavy: many modals and libs |
| **Workout Factory** | `api/admin/workouts/index.ts`, `[workoutId].ts`; `api/ai/generate-workout-chain`, … | `ManageWorkouts`, `WorkoutEditor`, `WorkoutGeneratorModal`, `WorkoutLibraryTable`, … | |
| **Challenge Factory** | `api/admin/challenges/*`, `api/ai/generate-challenge-*`, `generate-image` | `ManageChallenges`, `ChallengeEditor`, `ChallengeGeneratorModal`, `ChallengeLibraryTable`, … | |
| **Exercises** | `api/admin/exercises/[id]/*` (generate-page, generate-biomechanics, update-deep-dive, …) | `ManageExercises`, `AdminExerciseDetail`, `DeepDiveEditor` | ✅ Deep Dive (generate, edit) migrated |
| **WOD Engine** | `api/wod/index.ts`, `api/ai/generate-wod`, `suggest-wod-name` | `WODEngine`, `WODEditor` views | |
| **Warm-Up Engine** | `api/warmup-config.ts`, admin warmup API if any | `WarmUpEngine` view | |
| **Users** | `api/admin/users.ts`, `users/firestore.ts`, `users/[uid]/revoke.ts` | `ManageUsers` view | |
| **Zones** | (if any admin API) | `ManageZones` view | |
| **Exercise Image Lab** | `api/admin/exercises/…`, `generate-exercise-image`, etc. | `ExerciseImageGenerator`, `ExerciseVisualizationLabModal` | |

Suggested order: Programs → Workouts → Challenges → Exercises → WOD → Warm-up → Users → Zones → Exercise Image Lab.
