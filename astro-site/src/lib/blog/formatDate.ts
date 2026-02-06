/**
 * Formats a date string to a human-readable format.
 * Mirrors features/blog/lib/formatDate.ts for parity with Next.js blog.
 * @param dateString - ISO date string (e.g., '2025-01-15') or timestamp (e.g., '2025-01-15T00:00:00.000Z')
 * @returns Formatted date string (e.g., 'January 15, 2025')
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) {
    return 'Invalid Date'
  }

  try {
    let date: Date

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-').map(Number)
      date = new Date(year, month - 1, day)
    } else {
      date = new Date(dateString)
    }

    if (isNaN(date.getTime())) {
      return 'Invalid Date'
    }

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return 'Invalid Date'
  }
}
