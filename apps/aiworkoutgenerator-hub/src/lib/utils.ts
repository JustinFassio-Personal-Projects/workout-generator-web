import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Creates an environment-aware error message.
 * Returns the development message if NODE_ENV is "development", otherwise returns the production message.
 *
 * @param devMessage - Error message to show in development
 * @param prodMessage - Error message to show in production
 * @returns The appropriate error message for the current environment
 */
export function getEnvAwareErrorMessage(
  devMessage: string,
  prodMessage: string
): string {
  const isDevelopment = process.env.NODE_ENV === "development";
  return isDevelopment ? devMessage : prodMessage;
}

/**
 * Masks sensitive identifiers for safe logging.
 * In development: returns full identifier for debugging.
 * In production: returns truncated version (first 8 chars + "...") to protect privacy.
 *
 * @param identifier - The identifier to mask (e.g., user ID, email)
 * @returns Masked identifier safe for production logging
 */
export function maskIdentifier(identifier: string): string {
  const isDevelopment = process.env.NODE_ENV === "development";
  if (isDevelopment || identifier.length <= 8) {
    return identifier;
  }
  return `${identifier.slice(0, 8)}...`;
}
