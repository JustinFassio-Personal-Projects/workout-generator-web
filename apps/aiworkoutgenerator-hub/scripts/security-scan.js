#!/usr/bin/env node

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

const SECURITY_PATTERNS = [
  // Firebase secrets (should be in env vars)
  /apiKey:\s*['"]AIza[a-zA-Z0-9_-]{35}['"]/,
  /authDomain:\s*['"][a-z0-9-]+\.firebaseapp\.com['"]/,

  // Hardcoded credentials
  /password\s*=\s*['"]/i,
  /secret\s*=\s*['"]/i,
  /token\s*=\s*['"][a-zA-Z0-9_-]{20,}['"]/,

  // Firebase Admin SDK package import (should never be in client code; relative ./firebase-admin is our server wrapper)
  /\bfrom\s+['"]firebase-admin['"]/,
  /\brequire\s*\(\s*['"]firebase-admin['"]\s*\)/,
  /serviceAccountKey\.json/,

  // Insecure Firestore rules patterns
  /allow\s+read,\s+write:\s+if\s+true/,
  /allow\s+read:\s+if\s+true/,
];

const EXCLUDE_PATTERNS = [
  /node_modules/,
  /\.next/,
  /\.git/,
  /\.env\.example/,
  /scripts\/security-scan\.js/,
  /\.env\.local/,
  /__tests__/,
  /\.test\./,
  /\.spec\./,
  // Server-side files where firebase-admin is allowed
  /src\/lib\/firebase-admin\.ts/,
  /src\/lib\/api-utils\.ts/, // Server-side API utilities (uses adminDb)
  /src\/lib\/ai-prompts\.ts/, // Server-side prompt resolution (uses adminDb)
  /src\/lib\/waiver\/getActiveWaiver\.ts/, // Server-side waiver utilities (uses adminDb)
  /src\/lib\/quality\//, // Server-side QA computation utilities
  /src\/lib\/image-mapping-admin\.ts/, // Server-side image mapping utilities (uses adminDb)
  /src\/app\/api\//,
  /scripts\//,
];

let findings = [];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    SECURITY_PATTERNS.forEach((pattern) => {
      if (pattern.test(line)) {
        findings.push({
          file: filePath,
          line: index + 1,
          content: line.trim(),
          pattern: pattern.toString(),
        });
      }
    });
  });
}

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  entries.forEach((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (EXCLUDE_PATTERNS.some((pattern) => pattern.test(fullPath))) {
      return;
    }

    if (entry.isDirectory()) {
      scanDirectory(fullPath);
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx|json)$/.test(entry.name)) {
      scanFile(fullPath);
    }
  });
}

console.log("🔒 Running security scan...\n");

scanDirectory("./src");
if (fs.existsSync("./firestore.rules")) {
  scanFile("./firestore.rules");
}

if (findings.length > 0) {
  console.error("❌ Security issues found:\n");
  findings.forEach((finding) => {
    console.error(`📁 ${finding.file}:${finding.line}`);
    console.error(`   ${finding.content}`);
    console.error(`   Pattern: ${finding.pattern}\n`);
  });
  process.exit(1);
} else {
  console.log("✅ No security issues found!");
  process.exit(0);
}
