# Preserving Emulator Data When Restarting

When you need to restart the Firebase emulator (e.g., to reload security rules), you can preserve your data using export/import.

## Quick Solution

### Step 1: Export Current Emulator Data

While your emulators are running, in a **new terminal** (keep emulators running):

```bash
# Export all emulator data to a directory
firebase emulators:export ./emulator-data
```

This exports:

- Firestore data
- Auth users
- Functions state
- All emulator state

### Step 2: Stop and Restart Emulators

```bash
# Stop emulators (Ctrl+C in the emulator terminal)
# Then restart with the exported data:
firebase emulators:start --import=./emulator-data
```

Or if using npm script:

```bash
# You may need to modify the script to include --import flag
# Or run directly:
firebase emulators:start --import=./emulator-data
```

### Step 3: Verify Data Restored

1. Check Emulator UI: http://localhost:4000
2. Verify your Firestore collections have data
3. Verify Auth users exist
4. Test your app - data should be restored

## Alternative: Continuous Export

For ongoing development, you can set up automatic exports:

```bash
# Export before stopping (in a separate terminal while emulators run)
firebase emulators:export ./emulator-data

# Then restart with import
firebase emulators:start --import=./emulator-data
```

## Important Notes

- **Export directory**: The `./emulator-data` directory will contain all emulator state
- **Git ignore**: Add `emulator-data/` to `.gitignore` (it can be large)
- **Export while running**: You can export while emulators are running (it's a snapshot)
- **Import on start**: Data is loaded when emulators start, then emulators continue normally

## Troubleshooting

### Export Fails

If export fails, make sure:

- Emulators are running
- You have write permissions in the current directory
- The export directory doesn't already exist (or remove it first)

### Import Doesn't Work

If data doesn't appear after import:

- Check the export directory has files
- Verify the import path is correct
- Check emulator logs for import errors
- Try exporting again (export while emulators are running)
