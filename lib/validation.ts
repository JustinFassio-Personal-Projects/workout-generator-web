/**
 * Shared validation utilities
 */

/**
 * Validates an email address using a standard regex pattern.
 * @param email - The email address to validate
 * @returns true if the email is valid, false otherwise
 */
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
