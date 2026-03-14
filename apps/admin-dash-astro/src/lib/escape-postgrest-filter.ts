/**
 * Escape reserved characters in values used inside PostgREST filter strings.
 * Prevents query-string injection/parsing issues when interpolating user input.
 * @see https://postgrest.org/en/stable/api.html#horizontal-filtering-rows
 */
export function escapePostgrestFilterValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/[,()]/g, (ch) => `\\${ch}`);
}
