/**
 * Formats a date string to a human-readable format
 * @param dateString - ISO date string (e.g., '2025-01-15')
 * @returns Formatted date string (e.g., 'January 15, 2025')
 */
export function formatDate(dateString: string): string {
  // Parse date string explicitly to avoid timezone issues
  // Date strings like '2025-01-15' are interpreted as UTC midnight,
  // which can display as the previous day in some timezones
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
