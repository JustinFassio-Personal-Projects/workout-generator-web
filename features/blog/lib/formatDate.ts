/**
 * Formats a date string to a human-readable format
 * @param dateString - ISO date string (e.g., '2025-01-15')
 * @returns Formatted date string (e.g., 'January 15, 2025')
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

