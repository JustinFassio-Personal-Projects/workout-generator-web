# Pre-PR Verification System Documentation

## Overview

The Pre-PR Verification System ensures production-ready code through automated checks, manual validation, and Firebase-specific security audits. This system prevents common issues before they reach production.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Developer Workflow                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Code Changes                                             │
│     ↓                                                         │
│  2. Pre-Commit Hook (Husky)                                  │
│     - ESLint                                                  │
│     - Prettier                                                │
│     - TypeScript                                              │
│     ↓                                                         │
│  3. Manual Verification                                       │
│     - Security scan                                           │
│     - Firebase emulator tests                                │
│     - Critical path tests                                     │
│     ↓                                                         │
│  4. Pre-Push Hook                                             │
│     - Build check                                             │
│     - All tests                                               │
│     ↓                                                         │
│  5. CI/CD Pipeline (GitHub Actions)                          │
│     - Production build                                        │
│     - Deploy to Firebase preview channel                     │
│     - Lighthouse audit                                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Guide

### Phase 1: Dependencies & Configuration

**Install Development Dependencies:**

```bash
npm install -D \
  husky \
  lint-staged \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  prettier \
  eslint-config-prettier \
  @next/eslint-plugin-next \
  vitest \
  @testing-library/react \
  @testing-library/jest-dom \
  firebase-tools
```

**Configure `package.json` scripts:**

```json
{
  "scripts": {
    "dev": "next dev --port 5178",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "format": "prettier --write \"src/**/*.{js,jsx,ts,tsx,json,css,md}\"",
    "format:check": "prettier --check \"src/**/*.{js,jsx,ts,tsx,json,css,md}\"",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:emulator": "firebase emulators:exec --only auth,firestore 'vitest run'",
    "test:critical": "vitest run --grep=\"@critical\"",
    "security:scan": "node scripts/security-scan.js",
    "verify:quick": "npm run type-check && npm run build",
    "verify:all": "npm run lint && npm run format:check && npm run type-check && npm run test:run && npm run security:scan && npm run build",
    // Note: verify:quick intentionally excludes lint since linting runs automatically
    // in pre-commit hooks via lint-staged. Use verify:all for comprehensive checks.
    "verify:deploy": "npm run verify:all && npm run test:emulator",
    "firebase:emulators": "firebase emulators:start",
    "check-deps": "npx depcheck",
    "prepare": "husky install"
  }
}
```

### Phase 2: Git Hooks (Husky)

**Initialize Husky:**

```bash
npx husky-init && npm install
```

**Create `.husky/pre-commit`:**

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# Run lint-staged
npx lint-staged

# Type check
npm run type-check

echo "✅ Pre-commit checks passed!"
```

**Create `.husky/pre-push`:**

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🚀 Running pre-push verification..."

# Run quick verification
npm run verify:quick

echo "✅ Pre-push checks passed!"
```

**Configure `.lintstagedrc.json`:**

```json
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,css}": ["prettier --write"]
}
```

### Phase 3: Security Scanning

**Create `scripts/security-scan.js`:**

```javascript
#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const SECURITY_PATTERNS = [
  // Firebase secrets (should be in env vars)
  /apiKey:\s*['"]AIza[a-zA-Z0-9_-]{35}['"]/,
  /authDomain:\s*['"][a-z0-9-]+\.firebaseapp\.com['"]/,

  // Hardcoded credentials
  /password\s*=\s*['"]/i,
  /secret\s*=\s*['"]/i,
  /token\s*=\s*['"][a-zA-Z0-9_-]{20,}['"]/,

  // Firebase Admin SDK (should never be in client code)
  /firebase-admin/,
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
```

**Make executable:**

```bash
chmod +x scripts/security-scan.js
```

### Phase 4: Firebase Emulator Testing

**Create `firebase.json`:**

```json
{
  "hosting": {
    "public": "out",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          }
        ]
      }
    ]
  },
  "emulators": {
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8080
    },
    "hosting": {
      "port": 5000
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

**Create `firestore.rules` (secure by default):**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    // Users collection
    match /users/{userId} {
      allow read: if isOwner(userId);
      allow write: if isOwner(userId);
    }

    // Workouts collection
    match /workouts/{workoutId} {
      allow read: if isAuthenticated() &&
                     resource.data.userId == request.auth.uid;
      allow create: if isAuthenticated() &&
                       request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAuthenticated() &&
                               resource.data.userId == request.auth.uid;
    }

    // Default deny all
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Usage for Developers

### Daily Workflow

1. **Create feature branch:**

   ```bash
   git checkout -b feature/workout-generation
   ```

2. **Make changes** (pre-commit hooks run automatically)

3. **Before pushing:**

   ```bash
   npm run verify:quick
   ```

4. **Push to remote:**

   ```bash
   git push origin feature/workout-generation
   ```

5. **Create PR** (CI/CD runs automatically)

### Common Commands

```bash
# Quick check before commit (linting runs automatically via pre-commit hook)
npm run type-check

# Quick verification before push (validates TypeScript compilation and build)
# Note: Linting is already handled by pre-commit hooks via lint-staged
npm run verify:quick

# Full verification before PR (includes lint, format, type-check, tests, security scan, build)
npm run verify:all

# Test with Firebase emulators
npm run firebase:emulators
npm run test:emulator

# Security scan only
npm run security:scan

# Check for unused dependencies
npm run check-deps
```

## Troubleshooting

### Pre-commit hook fails

**Issue**: ESLint or Prettier errors
**Fix**:

```bash
npm run lint:fix
npm run format
```

### Pre-push hook fails

**Issue**: Build errors
**Fix**:

1. Check `.env.local` has all required variables
2. Run `npm run build` to see detailed errors
3. Fix TypeScript errors

### Firebase emulator connection refused

**Issue**: Emulators not running
**Fix**:

```bash
firebase emulators:start
# In another terminal:
npm run test:emulator
```

### Security scan false positives

**Issue**: Env var references flagged as secrets
**Fix**: Add pattern to `EXCLUDE_PATTERNS` in `scripts/security-scan.js`

## Firebase-Specific Gotchas

### 1. Firestore Security Rules

**❌ Never do this:**

```
allow read, write: if true; // PERMISSIVE!
```

**✅ Always do this:**

```
allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
allow write: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
```

### 2. Environment Variables

**❌ Never commit:**

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyABC123...", // HARDCODED!
};
```

**✅ Always use env vars:**

```typescript
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
};
```

### 3. Client vs Server Code

**❌ Never in client components:**

```typescript
import admin from "firebase-admin"; // SERVER ONLY!
```

**✅ Use client SDK:**

```typescript
import { getAuth } from "firebase/auth";
```

## Success Metrics

Track these in GitHub Projects:

- **Pre-commit pass rate**: >95%
- **CI/CD pass rate**: >90%
- **Security scan findings**: 0 per sprint
- **Production incidents from missed checks**: 0

## Next Steps

After implementing this system:

1. ✅ Train team on workflow
2. ✅ Document Firebase-specific patterns
3. ✅ Set up monitoring (Sentry, LogRocket)
4. ✅ Configure Firebase performance monitoring
5. ✅ Create runbook for production incidents

---

**Maintained by:** Engineering Team  
**Last Updated:** [Current Date]  
**Version:** 1.0.0
