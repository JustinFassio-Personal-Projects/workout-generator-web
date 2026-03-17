#!/usr/bin/env node
/**
 * Sync Firestore security rules from Hub repository to Admin repository.
 *
 * This script copies firestore.rules from the Hub repo to the Admin repo,
 * ensuring both repositories have consistent security rules.
 *
 * Usage:
 *   tsx scripts/sync-firestore-rules-to-admin.ts [--dry-run] [--admin-path <path>]
 *
 * Options:
 *   --dry-run        Show what would be copied without making changes
 *   --admin-path     Path to Admin repository (defaults to ../AI Workout Gen Admin)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Args = {
  dryRun: boolean;
  adminPath: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    dryRun: false,
    adminPath: path.resolve(__dirname, "../../AI Workout Gen Admin"),
  };

  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];

    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (token === "--admin-path") {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args.adminPath = path.resolve(next);
        i++;
      } else {
        throw new Error("--admin-path requires a path value");
      }
      continue;
    }

    if (token === "--help" || token === "-h") {
      console.log(`
Sync Firestore Security Rules from Hub to Admin

Usage:
  tsx scripts/sync-firestore-rules-to-admin.ts [options]

Options:
  --dry-run              Show what would be copied without making changes
  --admin-path <path>    Path to Admin repository
                        (default: ../AI Workout Gen Admin)
  --help, -h             Show this help message

Examples:
  tsx scripts/sync-firestore-rules-to-admin.ts --dry-run
  tsx scripts/sync-firestore-rules-to-admin.ts --admin-path /path/to/admin
      `);
      process.exit(0);
    }
  }

  return args;
}

function main() {
  try {
    const args = parseArgs(process.argv);

    // Paths
    const hubRepoRoot = path.resolve(__dirname, "..");
    const adminRepoRoot = args.adminPath;
    const hubRulesPath = path.join(hubRepoRoot, "firestore.rules");
    const adminRulesPath = path.join(adminRepoRoot, "firestore.rules");

    console.log("🔄 Firestore Rules Sync: Hub → Admin\n");
    console.log(`Hub Repository: ${hubRepoRoot}`);
    console.log(`Admin Repository: ${adminRepoRoot}`);
    console.log(`Hub Rules: ${hubRulesPath}`);
    console.log(`Admin Rules: ${adminRulesPath}\n`);

    // Check if Hub rules file exists
    if (!fs.existsSync(hubRulesPath)) {
      throw new Error(`Hub rules file not found: ${hubRulesPath}`);
    }

    // Check if Admin repo exists
    if (!fs.existsSync(adminRepoRoot)) {
      throw new Error(`Admin repository not found: ${adminRepoRoot}`);
    }

    // Read Hub rules
    const hubRules = fs.readFileSync(hubRulesPath, "utf-8");
    console.log(`✅ Read Hub rules (${hubRules.length} bytes)\n`);

    // Check if Admin rules exist
    const adminRulesExist = fs.existsSync(adminRulesPath);
    let adminRules: string | null = null;
    let rulesAreIdentical = false;

    if (adminRulesExist) {
      adminRules = fs.readFileSync(adminRulesPath, "utf-8");
      rulesAreIdentical = hubRules === adminRules;

      if (rulesAreIdentical) {
        console.log("✅ Rules are already identical - no sync needed");
        console.log(`   Both files have ${hubRules.length} bytes\n`);
        return;
      }

      console.log(`⚠️  Admin rules exist and differ from Hub rules`);
      console.log(`   Hub: ${hubRules.length} bytes`);
      console.log(`   Admin: ${adminRules.length} bytes\n`);

      // Show diff summary
      const hubLines = hubRules.split("\n");
      const adminLines = adminRules.split("\n");
      let diffCount = 0;
      const maxDiffs = 10;

      for (let i = 0; i < Math.max(hubLines.length, adminLines.length); i++) {
        if (hubLines[i] !== adminLines[i]) {
          if (diffCount < maxDiffs) {
            console.log(`   Line ${i + 1}:`);
            if (adminLines[i]) {
              console.log(`     - ${adminLines[i]}`);
            }
            if (hubLines[i]) {
              console.log(`     + ${hubLines[i]}`);
            }
          }
          diffCount++;
        }
      }

      if (diffCount > maxDiffs) {
        console.log(`   ... and ${diffCount - maxDiffs} more differences\n`);
      } else {
        console.log();
      }
    } else {
      console.log("ℹ️  Admin rules file does not exist - will be created\n");
    }

    // Dry run mode
    if (args.dryRun) {
      console.log("🔍 DRY RUN MODE - No changes will be made\n");
      console.log("Would copy Hub rules to Admin repository:");
      console.log(`  ${hubRulesPath}`);
      console.log(`  → ${adminRulesPath}\n`);
      console.log("Run without --dry-run to apply changes");
      return;
    }

    // Create backup if Admin rules exist
    if (adminRulesExist && adminRules) {
      const backupPath = `${adminRulesPath}.backup.${Date.now()}`;
      fs.writeFileSync(backupPath, adminRules, "utf-8");
      console.log(`💾 Created backup: ${path.basename(backupPath)}\n`);
    }

    // Copy Hub rules to Admin
    fs.writeFileSync(adminRulesPath, hubRules, "utf-8");
    console.log(`✅ Copied Hub rules to Admin repository\n`);

    // Verify the copy
    const copiedRules = fs.readFileSync(adminRulesPath, "utf-8");
    if (copiedRules === hubRules) {
      console.log("✅ Verification: Rules copied successfully");
      console.log(
        `   Admin rules now match Hub rules (${copiedRules.length} bytes)\n`
      );
    } else {
      throw new Error("Verification failed: Copied rules do not match source");
    }

    console.log("🎉 Sync completed successfully!");
    console.log("\nNext steps:");
    console.log("1. Review the changes in the Admin repository");
    console.log("2. Commit the updated firestore.rules file");
    console.log("3. Restart the Firebase emulator if it's running");
  } catch (error) {
    console.error(
      "\n❌ Error:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

main();
