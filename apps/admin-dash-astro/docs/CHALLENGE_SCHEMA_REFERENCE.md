# Challenge Schema Reference

Canonical schema documentation for Challenge Factory tables. For setup instructions, see [CHALLENGE_DATA_MODEL.md](./CHALLENGE_DATA_MODEL.md).

---

## challenges

| Column | Type | Constraints | TypeScript mapping |
|--------|------|-------------|--------------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | `ChallengeLibraryItem.id` |
| `title` | text | NOT NULL | `ChallengeLibraryItem.title`, `ChallengeTemplate.title` |
| `description` | text | | `ChallengeLibraryItem.description` |
| `author_id` | uuid | NOT NULL, FK auth.users | `ChallengeLibraryItem.authorId` |
| `status` | text | NOT NULL, DEFAULT 'draft' | `ChallengeLibraryItem.status` |
| `config` | jsonb | | See config shape below; maps to `ChallengeConfig`, `ChallengeTemplate` fields |
| `chain_metadata` | jsonb | | `ChallengeLibraryItem.chain_metadata`, `PromptChainMetadata` |
| `hero_image_url` | text | | `ChallengeLibraryItem.heroImageUrl` |
| `section_images` | jsonb | DEFAULT '{}' | `ChallengeLibraryItem.sectionImages` → `Record<string, string>` |
| `created_at` | timestamptz | DEFAULT now() | `ChallengeLibraryItem.createdAt` |
| `updated_at` | timestamptz | DEFAULT now() | `ChallengeLibraryItem.updatedAt` |

### config JSONB shape

Maps to `ChallengeConfig` and `ChallengeTemplate`:

- `difficulty`: `'beginner'` | `'intermediate'` | `'advanced'`
- `durationWeeks`: number (2–6)
- `theme`: string
- `tagline`: string
- `milestones`: `{ week: number; label: string; checkInPrompt?: string }[]`
- `targetAudience`: `{ ageRange, sex, weight, experienceLevel }`
- `equipmentProfile`: `{ zoneId, equipmentIds }` (optional)
- `goals`: `{ primary, secondary }`

---

## challenge_weeks

| Column | Type | Constraints | TypeScript mapping |
|--------|------|-------------|--------------------|
| `id` | uuid | PK, DEFAULT gen_random_uuid() | (internal) |
| `challenge_id` | uuid | NOT NULL, FK challenges | Links to parent challenge |
| `week_number` | integer | NOT NULL, UNIQUE(challenge_id, week_number) | `ProgramSchedule.weekNumber` |
| `content` | jsonb | | See content shape below |
| `created_at` | timestamptz | DEFAULT now() | |

### content JSONB shape

```ts
{
  workouts: Array<{
    title: string;
    description: string;
    blocks?: Exercise[];
    exerciseBlocks?: ExerciseBlock[];
    warmupBlocks?: WarmupBlock[];
    finisherBlocks?: WarmupBlock[];
    cooldownBlocks?: WarmupBlock[];
  }>
}
```

Matches `ProgramSchedule['workouts']` from `types/ai-program.ts`. Challenge rows are assembled into `ChallengeTemplate.schedule` (one `ProgramSchedule` per week).

---

## Indexes

| Index | Table | Columns |
|-------|-------|---------|
| `idx_challenges_created_at` | challenges | (created_at DESC) |
| `idx_challenges_status_created` | challenges | (status, created_at DESC) |

---

## RLS Policies

| Table | Policy | USING clause |
|-------|--------|--------------|
| challenges | Authors can manage own challenges | `auth.uid() = author_id` |
| challenge_weeks | Authors can manage challenge_weeks | `EXISTS (SELECT 1 FROM challenges c WHERE c.id = challenge_id AND c.author_id = auth.uid())` |

---

## DDL

Run [RUN_CHALLENGES_SCHEMA.sql](./RUN_CHALLENGES_SCHEMA.sql) in the Supabase SQL Editor for idempotent schema creation.
