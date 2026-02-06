import type { APIRoute } from 'astro'

const baseUrl = import.meta.env.PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com'

export const GET: APIRoute = () => {
  const robotsTxt = `# Robots.txt for AI Workout Generator
User-agent: *
Allow: /
Disallow: /admin/

# Sitemap
Sitemap: ${baseUrl}/sitemap-index.xml
`

  return new Response(robotsTxt, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
