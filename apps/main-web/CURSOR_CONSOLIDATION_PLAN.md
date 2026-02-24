# Cursor Action Plan: In-Place Consolidation (Simplified)

**Context:**

- **Repo Root:** `~/Local Sites/Workout Generator` (Live Site).
- **Goal:** Convert this folder into a Monorepo.
- **`app/admin`:** The current live Next.js site.
- **`apps/admin`:** The new Astro admin (from `ai-fitness-guy`).
- **`reference/admin-legacy`:** The old admin (from `AI Workout Gen Admin`), kept only for code reference.

Copy and paste these prompts into Cursor to execute the restructure safely.

---

## Step 1: Create Monorepo Structure

_Paste this into Cursor:_

```text
I am converting this repository (`~/Local Sites/Workout Generator`) into a monorepo workspace.
Please perform the following file operations:

1. Create a folder named `apps`.
2. Create a folder named `reference`.
3. Create a folder named `apps/website`.

Now, move ALL existing files and folders in the root directory INTO `apps/website`, EXCEPT for:
- The `apps` folder itself.
- The `reference` folder itself.
- `.git` (Leave git at the root).
- `.gitignore` (Leave at root, we might need to update it).

After this step, the root should mainly contain `apps/`, `reference/`, and git config.
```

---

## Step 2: Initialize Workspace Config

_Paste this into Cursor:_

````text
Now that the old live site is in `apps/website`, let's set up the root workspace.

1. Create a `pnpm-workspace.yaml` at the root with:
   ```yaml
   packages:
     - 'apps/*'
````

2. Create a root `package.json` (if one doesn't exist) with:
   ```json
   {
     "name": "aiworkoutgenerator-monorepo",
     "private": true,
     "scripts": {
       "dev:website": "pnpm --filter workout-generator dev",
       "dev:admin": "pnpm --filter @aiworkoutgenerator/admin dev"
     }
   }
   ```
   _(Note: Ensure the name in `apps/website/package.json` matches the filter)._

````

---

## Step 3: Import the New Admin & Legacy Code
*Paste this into Cursor:*
```text
I need to import the external projects now.
Please give me the terminal commands to copy the folders (I will run them, or you can run them if allowed):

1. Copy `~/Local Sites/ai-fitness-guy` -> `apps/admin` (This is the new Astro admin).
2. Copy `~/Local Sites/AI Workout Gen Admin` -> `reference/admin-legacy` (This is for reference only).

*Note to AI:* Ensure we copy the contents correctly and don't nest the git repositories (delete `.git` inside the copied folders if present).
````

---

## Step 4: Final Verification

_Paste this into Cursor:_

```text
Verify the structure:
- `apps/website` should contain the Next.js live site.
- `apps/admin` should contain the Astro admin.
- `reference/admin-legacy` should contain the old admin code.

If this looks correct, I am ready to commit.
```
