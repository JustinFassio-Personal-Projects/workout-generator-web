import {
  applicationDefault,
  cert,
  deleteApp,
  initializeApp,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "node:fs";
import path from "node:path";

type Args = {
  project: string | null;
  dryRun: boolean;
  emulator: boolean;
  confirmProduction: boolean;
  serviceAccount: string | null;
  batchSize: number;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    project: null,
    dryRun: false,
    emulator: false,
    confirmProduction: false,
    serviceAccount: null,
    batchSize: 100,
  };

  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];

    if (token === "--project") {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args.project = next;
        i++;
      } else {
        throw new Error(
          "--project flag requires a value (e.g., --project ai-workout-generator-hub)"
        );
      }
      continue;
    }

    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (token === "--confirm-production") {
      args.confirmProduction = true;
      continue;
    }

    if (token === "--emulator") {
      args.emulator = true;
      continue;
    }

    if (token === "--service-account") {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args.serviceAccount = next;
        i++;
      } else {
        throw new Error(
          "--service-account flag requires a path to the service account key JSON file"
        );
      }
      continue;
    }

    if (token === "--batch-size") {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        const size = parseInt(next, 10);
        if (isNaN(size) || size < 1 || size > 500) {
          throw new Error("--batch-size must be a number between 1 and 500");
        }
        args.batchSize = size;
        i++;
      } else {
        throw new Error("--batch-size flag requires a number value");
      }
      continue;
    }
  }

  return args;
}

interface MigrationStats {
  totalMessages: number;
  messagesNeedingMigration: number;
  messagesUpdated: number;
  messagesSkipped: number;
  errors: Array<{ messageId: string; error: string }>;
  workoutsNotFound: string[];
}

async function migrateCertificationMessages(
  db: ReturnType<typeof getFirestore>,
  dryRun: boolean,
  batchSize: number
): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalMessages: 0,
    messagesNeedingMigration: 0,
    messagesUpdated: 0,
    messagesSkipped: 0,
    errors: [],
    workoutsNotFound: [],
  };

  console.log("Fetching all certification messages...");

  // Get all certification messages
  const messagesSnapshot = await db.collection("certification_messages").get();

  stats.totalMessages = messagesSnapshot.size;
  console.log(`Found ${stats.totalMessages} total messages`);

  // Filter messages that need migration (missing workout_owner_id)
  const messagesToMigrate: Array<{
    id: string;
    workout_id: string;
    data: FirebaseFirestore.DocumentData;
  }> = [];

  messagesSnapshot.forEach((doc) => {
    const data = doc.data();
    // Check if workout_owner_id is missing or null/undefined
    if (!data.workout_owner_id) {
      if (!data.workout_id) {
        stats.errors.push({
          messageId: doc.id,
          error: "Missing workout_id field",
        });
        return;
      }
      messagesToMigrate.push({
        id: doc.id,
        workout_id: data.workout_id,
        data,
      });
    } else {
      stats.messagesSkipped++;
    }
  });

  stats.messagesNeedingMigration = messagesToMigrate.length;
  console.log(
    `Found ${stats.messagesNeedingMigration} messages needing migration`
  );
  console.log(
    `Skipping ${stats.messagesSkipped} messages that already have workout_owner_id`
  );

  if (messagesToMigrate.length === 0) {
    console.log("No messages need migration. Exiting.");
    return stats;
  }

  // Get unique workout IDs to look up
  const workoutIds = Array.from(
    new Set(messagesToMigrate.map((m) => m.workout_id))
  );
  console.log(`Looking up ${workoutIds.length} unique workouts...`);

  // Fetch workouts by ID (Firestore Admin SDK allows direct document access)
  const workoutCache = new Map<string, string | null>();
  console.log(`Fetching ${workoutIds.length} workouts...`);

  // Process in batches to avoid overwhelming the connection
  const workoutBatchSize = 50;
  for (let i = 0; i < workoutIds.length; i += workoutBatchSize) {
    const batch = workoutIds.slice(i, i + workoutBatchSize);

    // Fetch all workouts in this batch in parallel
    const workoutPromises = batch.map(async (workoutId) => {
      try {
        const workoutDoc = await db
          .collection("trainer_workouts")
          .doc(workoutId)
          .get();

        if (workoutDoc.exists) {
          const workoutData = workoutDoc.data();
          return { workoutId, userId: workoutData?.user_id || null };
        } else {
          return { workoutId, userId: null };
        }
      } catch (error) {
        console.error(`Error fetching workout ${workoutId}:`, error);
        return { workoutId, userId: null };
      }
    });

    const results = await Promise.all(workoutPromises);
    results.forEach(({ workoutId, userId }) => {
      workoutCache.set(workoutId, userId);
    });

    if (
      (i + workoutBatchSize) % 100 === 0 ||
      i + workoutBatchSize >= workoutIds.length
    ) {
      console.log(
        `Fetched ${Math.min(i + workoutBatchSize, workoutIds.length)}/${workoutIds.length} workouts...`
      );
    }
  }

  // Track workouts not found or with no user_id
  for (const workoutId of workoutIds) {
    if (!workoutCache.has(workoutId) || workoutCache.get(workoutId) === null) {
      stats.workoutsNotFound.push(workoutId);
    }
  }

  if (stats.workoutsNotFound.length > 0) {
    console.warn(
      `Warning: ${stats.workoutsNotFound.length} workouts not found in database or have no user_id`
    );
  }

  // Process messages in batches
  console.log(`Processing messages in batches of ${batchSize}...`);

  for (let i = 0; i < messagesToMigrate.length; i += batchSize) {
    const batch = messagesToMigrate.slice(i, i + batchSize);
    const writeBatch = db.batch();
    let batchOpCount = 0;

    for (const message of batch) {
      const workoutOwnerId = workoutCache.get(message.workout_id);

      if (!workoutOwnerId) {
        stats.errors.push({
          messageId: message.id,
          error: `Workout ${message.workout_id} not found or has no user_id`,
        });
        continue;
      }

      const messageRef = db
        .collection("certification_messages")
        .doc(message.id);

      if (dryRun) {
        console.log(
          `[dry-run] Would update message ${message.id} with workout_owner_id: ${workoutOwnerId}`
        );
        stats.messagesUpdated++;
      } else {
        writeBatch.update(messageRef, {
          workout_owner_id: workoutOwnerId,
        });
        batchOpCount++;
        stats.messagesUpdated++;
      }
    }

    if (!dryRun && batchOpCount > 0) {
      await writeBatch.commit();
      console.log(
        `Updated batch ${Math.floor(i / batchSize) + 1} (${Math.min(i + batchSize, messagesToMigrate.length)}/${messagesToMigrate.length} messages)`
      );
    }
  }

  return stats;
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.project) {
    throw new Error("Missing required flag: --project <firebase_project_id>");
  }

  const isProdTarget = args.project === "ai-workout-generator-hub";

  if (args.emulator) {
    process.env.FIRESTORE_EMULATOR_HOST =
      process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
  }

  // Hard guardrail: production writes require explicit confirmation.
  if (
    isProdTarget &&
    !args.emulator &&
    !args.dryRun &&
    !args.confirmProduction
  ) {
    throw new Error(
      'Refusing to write to production project "ai-workout-generator-hub" without --confirm-production'
    );
  }

  // Initialize Firebase Admin with service account key or ADC
  let credential;
  if (args.serviceAccount) {
    const serviceAccountPath = path.isAbsolute(args.serviceAccount)
      ? args.serviceAccount
      : path.join(process.cwd(), args.serviceAccount);
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(
        `Service account key file not found: ${serviceAccountPath}`
      );
    }
    const serviceAccountData = JSON.parse(
      fs.readFileSync(serviceAccountPath, "utf8")
    );
    credential = cert(serviceAccountData);
  } else {
    credential = applicationDefault();
  }

  const app = initializeApp({
    credential,
    projectId: args.project,
  });

  try {
    const db = getFirestore(app);

    console.log("Certification Messages Migration Configuration:");
    console.log(`- project: ${args.project}`);
    console.log(`- emulator: ${args.emulator ? "true" : "false"}`);
    console.log(`- dry-run: ${args.dryRun ? "true" : "false"}`);
    console.log(`- batch-size: ${args.batchSize}`);

    const stats = await migrateCertificationMessages(
      db,
      args.dryRun,
      args.batchSize
    );

    console.log("\n=== Migration Summary ===");
    console.log(`Total messages: ${stats.totalMessages}`);
    console.log(
      `Messages needing migration: ${stats.messagesNeedingMigration}`
    );
    console.log(`Messages updated: ${stats.messagesUpdated}`);
    console.log(`Messages skipped: ${stats.messagesSkipped}`);
    console.log(`Errors: ${stats.errors.length}`);
    console.log(`Workouts not found: ${stats.workoutsNotFound.length}`);

    if (stats.errors.length > 0) {
      console.log("\n=== Errors ===");
      stats.errors.forEach((err) => {
        console.error(`Message ${err.messageId}: ${err.error}`);
      });
    }

    if (stats.workoutsNotFound.length > 0) {
      console.log("\n=== Workouts Not Found ===");
      stats.workoutsNotFound.forEach((workoutId) => {
        console.warn(`Workout ID: ${workoutId}`);
      });
    }

    if (args.dryRun) {
      console.log(
        "\nThis was a dry run. No changes were made. Run without --dry-run to apply changes."
      );
    } else {
      console.log("\nMigration completed successfully!");
    }
  } finally {
    await deleteApp(app);
  }
}

main().catch((err) => {
  console.error("[migrate-certification-messages] Failed:", err);
  process.exitCode = 1;
});
