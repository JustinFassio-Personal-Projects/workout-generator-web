/**
 * Optional fire-and-forget notification to the main site (e.g. deploy hook or
 * cache-purge endpoint). Main site (Astro) serves blog/deep-research/sitemap/feed
 * at request time from Supabase, so no revalidation is required for correctness;
 * this is for optional CDN refresh when MAIN_SITE_REVALIDATE_URL is set.
 */
export function notifyMainSiteRevalidate(): void {
  const url = process.env.MAIN_SITE_REVALIDATE_URL
  if (!url || typeof url !== 'string' || url.trim() === '') return

  const secret = process.env.MAIN_SITE_REVALIDATE_SECRET
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (secret && typeof secret === 'string') {
    headers['x-revalidate-secret'] = secret
  }

  void fetch(url.trim(), {
    method: 'POST',
    headers,
    body: JSON.stringify({ source: 'admin-dash' }),
  }).catch(() => {
    // Fire-and-forget: do not log URL or surface errors to the response
  })
}
