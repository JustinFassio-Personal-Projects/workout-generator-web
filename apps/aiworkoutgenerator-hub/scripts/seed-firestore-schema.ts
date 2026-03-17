import fs from "node:fs";
import path from "node:path";

import {
  applicationDefault,
  cert,
  deleteApp,
  initializeApp,
} from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

type SeedItem = {
  id: string;
  name: string;
  [key: string]: unknown; // Allow additional fields beyond id and name
};

type Args = {
  project: string | null;
  dryRun: boolean;
  emulator: boolean;
  confirmProduction: boolean;
  serviceAccount: string | null;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    project: null,
    dryRun: false,
    emulator: false,
    confirmProduction: false,
    serviceAccount: null,
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

    // Support explicit boolean form for convenience in npm scripts
    if (token.startsWith("--dry-run=")) {
      const parts = token.split("=", 2);
      const value = parts.length === 2 ? parts[1] : undefined;
      if (value !== "true" && value !== "false") {
        throw new Error(
          `Invalid value for --dry-run: "${value ?? ""}". Expected "true" or "false".`
        );
      }
      args.dryRun = value === "true";
      continue;
    }
  }

  return args;
}

function readSeedJson(filePath: string): SeedItem[] {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`Seed file is not an array: ${filePath}`);
  }

  const items = parsed as SeedItem[];
  for (const item of items) {
    if (
      !item ||
      typeof item.id !== "string" ||
      item.id.trim() === "" ||
      typeof item.name !== "string" ||
      item.name.trim() === ""
    ) {
      throw new Error(
        `Invalid seed item in ${filePath}. Expected { id: string, name: string } with non-empty values`
      );
    }
  }

  const ids = items.map((i) => i.id);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    throw new Error(`Duplicate id(s) found in seed file: ${filePath}`);
  }

  return items;
}

async function upsertCollection(
  db: ReturnType<typeof getFirestore>,
  collectionName: string,
  items: SeedItem[],
  dryRun: boolean
) {
  if (dryRun) {
    console.log(
      `[dry-run] Would upsert ${items.length} docs -> ${collectionName}`
    );
    return { attempted: items.length, written: 0 };
  }

  const batch = db.batch();
  for (const item of items) {
    const ref = db.collection(collectionName).doc(item.id);
    // TODO: Add schema validation (e.g., Zod) for seed data before writing to Firestore.
    // Spreading all properties from the item bypasses validation and could lead to
    // unexpected fields or invalid data being written if JSON is malformed.
    batch.set(
      ref,
      {
        ...item, // Include all fields from the seed data
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  await batch.commit();
  return { attempted: items.length, written: items.length };
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.project) {
    throw new Error("Missing required flag: --project <firebase_project_id>");
  }

  const isProdTarget = args.project === "ai-workout-generator-hub";

  if (args.emulator) {
    // Default to standard Firestore emulator host if caller didn't set it.
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

    const seedDir = path.join(process.cwd(), "scripts", "seed-data");
    const equipment = readSeedJson(path.join(seedDir, "equipment.json"));
    const workoutTypes = readSeedJson(path.join(seedDir, "workout_types.json"));
    const workoutFocuses = readSeedJson(
      path.join(seedDir, "workout_focuses.json")
    );
    const equipmentItems = readSeedJson(
      path.join(seedDir, "equipment_items.json")
    );

    console.log("Firestore seeding configuration:");
    console.log(`- project: ${args.project}`);
    console.log(`- emulator: ${args.emulator ? "true" : "false"}`);
    console.log(`- dry-run: ${args.dryRun ? "true" : "false"}`);

    const results = [];
    results.push(
      await upsertCollection(db, "equipment", equipment, args.dryRun)
    );
    results.push(
      await upsertCollection(db, "workout_types", workoutTypes, args.dryRun)
    );
    results.push(
      await upsertCollection(db, "workout_focuses", workoutFocuses, args.dryRun)
    );
    results.push(
      await upsertCollection(db, "equipment_items", equipmentItems, args.dryRun)
    );

    const attempted = results.reduce((sum, r) => sum + r.attempted, 0);
    const written = results.reduce((sum, r) => sum + r.written, 0);

    console.log("Seeding complete:");
    console.log(`- attempted: ${attempted}`);
    console.log(`- written: ${written}`);
  } finally {
    // Clean up Firebase app instance to allow process to exit naturally
    await deleteApp(app);
  }
}

main().catch((err) => {
  console.error("[seed-firestore-schema] Failed:", err);
  process.exitCode = 1;
});
