import {
  connectFunctionsEmulator,
  getFunctions,
  type Functions,
} from "firebase/functions";

import { app } from "@/lib/firebase";
import { getEnvAwareErrorMessage } from "@/lib/utils";

let functions: Functions | null = null;
let functionsEmulatorConnected = false;

export function getFunctionsInstance(): Functions {
  if (typeof window === "undefined") {
    throw new Error("Firebase Functions can only be used on the client side");
  }
  if (!app) {
    throw new Error(
      getEnvAwareErrorMessage(
        "Firebase app is not initialized. Check your Firebase env vars (.env.local) and rebuild.",
        "Firebase app is not initialized. Check your deployment environment variables. For Firebase App Hosting, ensure secrets are configured in Cloud Secret Manager."
      )
    );
  }
  if (!functions) {
    functions = getFunctions(app);

    const hostPort =
      process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_EMULATOR_HOST?.trim() ?? "";
    if (hostPort && !functionsEmulatorConnected) {
      const [host, portStr] = hostPort.split(":");
      const port = Number(portStr);
      if (host && Number.isFinite(port)) {
        console.log(
          `[Functions] Connecting Functions emulator to ${host}:${port}`
        );
        connectFunctionsEmulator(functions, host, port);
        functionsEmulatorConnected = true;
        console.log(`[Functions] Functions emulator connected successfully`);
      } else {
        console.warn(
          `[Functions] Invalid emulator host format: ${hostPort}. Expected format: host:port`
        );
      }
    }
  }
  return functions;
}
