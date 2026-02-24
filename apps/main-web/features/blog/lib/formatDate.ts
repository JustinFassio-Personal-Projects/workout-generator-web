/**
 * Formats a date string to a human-readable format
 * @param dateString - ISO date string (e.g., '2025-01-15') or timestamp (e.g., '2025-01-15T00:00:00.000Z')
 * @returns Formatted date string (e.g., 'January 15, 2025')
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) {
    return 'Invalid Date'
  }

  try {
    // Handle both date strings ('2025-01-15') and full timestamps ('2025-01-15T00:00:00.000Z' or '2025-01-15 00:00:00+00')
    let date: Date

    // If it's a simple date string (YYYY-MM-DD), parse it explicitly to avoid timezone issues
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number)
      date = new Date(year, month - 1, day)
    } else {
      // For full timestamps, use Date constructor
      date = new Date(dateString)
    }

    // Validate the date
    if (isNaN(date.getTime())) {
      console.error('Invalid date string:', dateString)
      return 'Invalid Date'
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch (error) {
    console.error('Error formatting date:', dateString, error)
    return 'Invalid Date'
  }
}
