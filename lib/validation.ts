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

/**
 * Validates that a string is not empty after trimming.
 * @param value - The string to validate
 * @returns true if the string is not empty, false otherwise
 */
export function validateNotEmpty(value: string): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

/**
 * Validates that an array has at least one element.
 * @param array - The array to validate
 * @returns true if the array has at least one element, false otherwise
 */
export function validateArrayNotEmpty<T>(array: T[]): boolean {
  return Array.isArray(array) && array.length > 0
}

/**
 * Validates that a value is one of the allowed values.
 * @param value - The value to validate
 * @param allowedValues - Array of allowed values
 * @returns true if the value is in the allowed values, false otherwise
 */
export function validateEnum<T>(value: unknown, allowedValues: readonly T[]): value is T {
  return allowedValues.includes(value as T)
}

/**
 * Validates exercise name (1-100 characters).
 * @param name - The exercise name to validate
 * @returns true if valid, false otherwise
 */
export function validateExerciseName(name: string): boolean {
  return validateNotEmpty(name) && name.trim().length >= 1 && name.trim().length <= 100
}

/**
 * Validates technique cues (minimum 10 characters, maximum 2000 characters).
 * @param cues - The technique cues to validate
 * @returns true if valid, false otherwise
 */
export function validateTechniqueCues(cues: string): boolean {
  return validateNotEmpty(cues) && cues.trim().length >= 10 && cues.trim().length <= 2000
}
