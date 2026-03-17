import {
  connectFirestoreEmulator,
  getFirestore,
  Firestore,
} from "firebase/firestore";
import { app } from "@/lib/firebase";
import { getEnvAwareErrorMessage } from "@/lib/utils";

let db: Firestore | null = null;
let firestoreEmulatorConnected = false;

/**
 * Client-only Firestore accessor.
 * NOTE: Firebase is initialized only in the browser in `src/lib/firebase.ts`.
 */
export function getDbInstance(): Firestore {
  if (typeof window === "undefined") {
    throw new Error("Firestore can only be used on the client side");
  }
  if (!app) {
    throw new Error(
      getEnvAwareErrorMessage(
        "Firebase app is not initialized. Check your Firebase env vars (.env.local) and rebuild.",
        "Firebase app is not initialized. Check your deployment environment variables. For Firebase App Hosting, ensure secrets are configured in Cloud Secret Manager."
      )
    );
  }
  if (!db) {
    db = getFirestore(app);
    const hostPort =
      process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST?.trim() ?? "";
    if (hostPort && !firestoreEmulatorConnected) {
      const [host, portStr] = hostPort.split(":");
      const port = Number(portStr);
      if (host && Number.isFinite(port)) {
        console.log(
          `[Firestore] Connecting Firestore emulator to ${host}:${port}`
        );
        connectFirestoreEmulator(db, host, port);
        firestoreEmulatorConnected = true;
        console.log(`[Firestore] Firestore emulator connected successfully`);
      } else {
        console.warn(
          `[Firestore] Invalid emulator host format: ${hostPort}. Expected format: host:port`
        );
      }
    } else if (!hostPort) {
      console.warn(
        "[Firestore] Firestore emulator not configured. Set NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST to connect to emulator."
      );
    }
  }
  return db;
}
