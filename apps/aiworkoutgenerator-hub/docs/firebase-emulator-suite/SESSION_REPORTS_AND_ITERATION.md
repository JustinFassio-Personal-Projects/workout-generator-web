# Session Reports and Iteration Workflow in the Emulator

Session reports (workout summaries) are stored in the `workout_summaries` Firestore collection. They are created when a user completes a workout in the app and submits the completion form (Mark complete / Quick complete). The client writes to Firestore; if the write fails (e.g. wrong env, emulator not running, or rules), you’ll see a warning toast: “Workout marked complete, but session report didn’t save.” In the emulator there is no data by default, so you need either to complete a workout in the app (with the client pointed at the emulator) or seed sample data.

## Why session reports might not appear

1. **Client not connected to the emulator**  
   The app uses the **client** Firestore SDK for reading/writing `workout_summaries`. If `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST` is not set, the client talks to production Firestore and any summaries you create in the app are stored in production, not in the emulator UI.

2. **No data in the emulator**  
   A fresh emulator has no `workout_summaries` (and no completed `trainer_workouts`). So the iteration dropdown and Summaries page will be empty until you create data.

## Option A: Use the app (real flow)

1. **Point the app at the emulator**  
   In `.env.local`:

   ```bash
   NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
   NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
   ```

2. **Start the emulators** (e.g. from Admin repo or `npm run firebase:emulators`).

3. **Create a test user** (if you don’t have one):

   ```bash
   export FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
   export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
   npm run create:pro-user -- test@example.com yourpassword
   ```

   Note the printed **UID**.

4. **Sign in** in the app as that user.

5. **Generate a workout** (Generate → New Workout → pick trainer/focus → waiver → equipment → Generate).

6. **Complete the workout** (open the workout → complete sets → Mark Complete / Quick Complete and submit the completion modal).  
   That flow calls `WorkoutSummaryService.saveSummary()` and writes a document to `workout_summaries` in the emulator.

7. **Check the Emulator UI** (Firestore tab): you should see `workout_summaries` and `trainer_workouts`.  
   In the app: **Generate → Iterate Previous** should show that workout in the dropdown.

## Option B: Seed sample session reports (quick test)

To test the iteration workflow without completing a real workout, seed the emulator with sample `trainer_workouts` and `workout_summaries` for a test user.

1. **Emulators running** and **env set** as in Option A (step 1–2).

2. **Create a test user** and copy its **UID** (Option A step 3).

3. **Seed workout summaries** for that UID:

   ```bash
   npm run seed:workout-summaries:emulator -- <USER_UID>
   ```

   Example:

   ```bash
   npm run seed:workout-summaries:emulator -- abc123xyz
   ```

   Or with env set explicitly:

   ```bash
   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npx tsx scripts/seed-workout-summaries-emulator.ts <USER_UID>
   ```

4. **Sign in** as that user and go to **Generate → Iterate Previous**. You should see two sample session reports in the dropdown (“Upper Body Strength” and “Full Body HIIT”).

The seed script creates:

- Two minimal `trainer_workouts` (so `workout_id` is valid).
- Two `workout_summaries` (session reports) for that user with autoregulation fields (e.g. RPE, weight selection) so the iteration flow has realistic data.

## Troubleshooting

| Symptom                         | Check                                                                                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Iteration dropdown empty        | Env: `NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`. Either complete a workout as that user or run the seed script for that user’s UID. |
| Summaries page empty            | Same as above; summaries are per user and stored in the emulator only if the client is using it.                                              |
| “Permission denied” on save     | User must be signed in; `workout_summaries` rules require `user_id == request.auth.uid`.                                                      |
| Seed script “connection” errors | Emulators must be running; `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` (or `--emulator`).                                                        |

## Production

In production, the client writes to production Firestore. Session reports should save when a user completes a workout and submits the completion form, as long as:

- The user is signed in (`request.auth.uid` matches the document’s `user_id`).
- Firestore rules for `workout_summaries` allow create when `user_id == request.auth.uid`.

If the save fails (network, rules, or quota), the user sees a warning toast and the workout is still marked complete; only the session report (used for sharing and iteration) is missing.

## Related

- [SHARED_EMULATOR_SETUP.md](./SHARED_EMULATOR_SETUP.md) – one emulator for Hub + Admin
- [PRESERVE_DATA_ON_RESTART.md](./PRESERVE_DATA_ON_RESTART.md) – export/import emulator data
- `scripts/seed-workout-summaries-emulator.ts` – seed script implementation
