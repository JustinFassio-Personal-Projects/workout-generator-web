import { NextResponse, type NextRequest } from 'next/server'

const APP_BASE = (process.env.NEXT_PUBLIC_APP_URL || 'https://app.aiworkoutgenerator.com').replace(
  /\/$/,
  ''
)

// Platform routes that should be accessible on tenant domains too
// These routes should NOT be rewritten to /sites/[domain]
const PLATFORM_ROUTES: readonly string[] = [
  '/faq',
  '/blog',
  '/about',
  '/reports',
  '/equipment',
  '/onboard',
  '/videos',
  '/exercise-challenge',
  '/founder-story',
  '/story',
]

// Set for O(1) exact match lookup
const PLATFORM_ROUTES_SET = new Set<string>(PLATFORM_ROUTES)

// Helper function to check if a pathname is a platform route
function isPlatformRoute(pathname: string): boolean {
  // O(1) exact match check
  if (PLATFORM_ROUTES_SET.has(pathname)) {
    return true
  }
  // O(n) prefix check (but array is constant, created once)
  return PLATFORM_ROUTES.some(route => pathname.startsWith(route + '/'))
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const normalizedPath = pathname.toLowerCase().replace(/\/$/, '') // Remove trailing slash and normalize case
  const hostname = request.headers.get('host') || ''

  // Admin routes: pass through. No Supabase here — it was timing out and adding 20+ seconds to every request.
  // Auth is enforced in each admin page via getServerUser(); session cookies are read there.
  if (pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  // ============================================================================
  // MULTI-TENANT ROUTING (handled first, before redirects)
  // ============================================================================

  // Skip multi-tenant routing for Next.js internal routes and static assets
  // Note: /api routes are excluded by the matcher pattern (line 269), so API routes
  // never reach this middleware. All current API routes are platform-level (admin, blog,
  // support) and don't require tenant context. If tenant-specific API routes are needed
  // in the future (e.g., /api/tenant/workouts), remove 'api' from the matcher exclusion
  // and add explicit tenant vs platform routing logic here.
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/manifest.json' ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|json|woff|woff2|ttf|eot)$/)
  ) {
    // Fall through to existing redirect logic below
  } else {
    // Normalize hostname (remove port, www)
    const normalizedHost = normalizeHostname(hostname)
    const ADMIN_DOMAIN = 'admin.localhost'
    // Note: normalizeHostname() removes 'www.' prefix, so we only need base domain here
    const PLATFORM_DOMAINS = [
      'localhost',
      'myplatform.com',
      'aiworkoutgenerator.com',
      'workoutgenerator.com',
      'app.aiworkoutgenerator.com', // nextjs-backend production
    ]
    // Vercel deployment URLs (preview, production) — this app's *.vercel.app should show platform, not tenant
    const isVercelDeployment = normalizedHost.endsWith('.vercel.app')

    // 1. Admin domain → /admin routes
    if (normalizedHost === ADMIN_DOMAIN || normalizedHost.startsWith('admin.')) {
      if (!pathname.startsWith('/admin')) {
        const url = request.nextUrl.clone()
        url.pathname = `/admin${pathname === '/' ? '' : pathname}`
        // Rewrite and continue (admin routes are handled by the early /admin block above)
        return NextResponse.rewrite(url)
      }
      // Already on /admin route - continue to redirect logic, then admin auth check
    }
    // 2. Platform domains → Existing homepage (no rewrite, continue to redirect logic)
    // Check if it's a non-platform domain (tenant) while treating localhost:3007 and *.vercel.app as platform.
    // Note: We intentionally combine normalizedHost (without port) with the raw hostname port check
    // to distinguish `client-a.localhost:3007` (tenant) from `localhost:3007` (platform).
    // Vercel deployment URLs (nextjs-backend-xxx.vercel.app) are platform, not tenant.
    else if (
      !PLATFORM_DOMAINS.includes(normalizedHost) &&
      !isVercelDeployment &&
      !(normalizedHost === 'localhost' && hostname.includes(':3007'))
    ) {
      // If this is a platform route, don't rewrite - let it fall through to platform handling
      if (isPlatformRoute(pathname)) {
        // Fall through to platform route handling (no rewrite)
      } else {
        // 3. Tenant domains → /sites/[domain] routes (OPTIMISTIC REWRITE)
        // No database query here - validation happens in page component
        const url = request.nextUrl.clone()
        url.pathname = `/sites/${normalizedHost}${pathname === '/' ? '' : pathname}`

        const response = NextResponse.rewrite(url)
        response.headers.set('x-tenant-domain', normalizedHost)
        return response
      }
    }
    // Platform domains fall through to existing redirect logic
  }

  // ============================================================================
  // EXISTING REDIRECT LOGIC (WordPress redirects, admin auth, etc.)
  // ============================================================================

  // Helper function to create redirect response
  const createRedirect = (destination: string, permanent = true) => {
    // Detect if destination is an external URL (starts with http:// or https://)
    const isExternal = /^https?:\/\//i.test(destination)
    // For external URLs, use destination directly; for internal, use request.url as base
    const url = isExternal ? new URL(destination) : new URL(destination, request.url)
    // Preserve query parameters only for internal redirects (e.g., ?ref=source, ?utm_source=...)
    // External redirects (full URLs) should not preserve query params to avoid leaking data
    if (!isExternal && search) {
      url.search = search
    }
    return NextResponse.redirect(url, { status: permanent ? 301 : 302 })
  }

  // Handle WordPress URL redirects before admin route checks
  // WordPress URL patterns - redirect workout-related pages to /generate
  const workoutPatterns = [
    '/workout-summary',
    '/workouts',
    '/fitness-program',
    '/project',
    '/project_tag',
    '/project_category',
  ]

  for (const pattern of workoutPatterns) {
    if (normalizedPath === pattern || normalizedPath.startsWith(pattern + '/')) {
      return createRedirect('/generate')
    }
  }

  // Author pages -> home
  if (normalizedPath === '/author' || normalizedPath.startsWith('/author/')) {
    return createRedirect('/')
  }

  // Category pages -> blog
  if (normalizedPath === '/category' || normalizedPath.startsWith('/category/')) {
    return createRedirect('/blog')
  }

  // Marketing/static page redirects (handle both with and without trailing slashes)
  const staticRedirects: Record<string, string> = {
    '/home': '/',
    '/api-documentation': '/',
    '/contact': '/',
    '/privacy-policy': '/',
    '/physical-information': '/',
    '/prompt': '/',
    '/pricing': '/#pricing',
    '/purchase': '/#pricing',
    '/how-it-works': '/#journey',
    '/ai-generated-workouts': '/',
    '/explorer': '/',
    '/trailblazer': '/',
    '/workout-generator-app': '/',
    '/membership-account': '/',
  }

  if (staticRedirects[normalizedPath] !== undefined) {
    return createRedirect(staticRedirects[normalizedPath])
  }

  // Handle membership-account with subpaths
  if (normalizedPath.startsWith('/membership-account/')) {
    return createRedirect('/')
  }

  // External redirects to app domain (NEXT_PUBLIC_APP_URL)
  const externalRedirects: Record<string, string> = {
    '/login': `${APP_BASE}/login`,
    '/react-login': `${APP_BASE}/login`,
    '/workout-generator-registration': `${APP_BASE}/signup`,
    '/build/login': `${APP_BASE}/login`,
    '/features/login': `${APP_BASE}/login`,
    '/register': `${APP_BASE}/signup`,
  }

  if (externalRedirects[normalizedPath] !== undefined) {
    return createRedirect(externalRedirects[normalizedPath])
  }

  // Blog post redirects - check if it's a known blog slug that should redirect to /blog/:slug
  // These are individual blog posts from WordPress that should be under /blog/
  const blogPostRedirects: Record<string, string> = {
    '/ai-will-revolutionize-your-approach-to-fitness':
      '/blog/ai-will-revolutionize-your-approach-to-fitness',
    '/the-power-of-functional-fitness': '/blog/the-power-of-functional-fitness',
    '/ai-fitness-trainers': '/blog/ai-fitness-trainers',
    '/tacp-school-house-workout-1990s': '/blog/tacp-school-house-workout-1990s',
    // Keep misspelling in both source and destination to match:
    // 1. Actual WordPress URL from Google Search Console (source)
    // 2. Actual blog post slug in database (destination - see next.config.js)
    '/football-accelleration-decelleration-workout':
      '/blog/football-accelleration-decelleration-workout',
    // Defensive redirect for correctly spelled version (if someone types it correctly)
    // Still redirects to misspelled slug since that's what exists in the database
    '/football-acceleration-deceleration-workout':
      '/blog/football-accelleration-decelleration-workout',
    '/can-ai-generated-workouts-boost-gym-revenue':
      '/blog/can-ai-generated-workouts-boost-gym-revenue',
    '/mobility-exercises-for-golfers': '/blog/mobility-exercises-for-golfers',
    '/ai-generated-dumbbell-chest-workout': '/blog/ai-generated-dumbbell-chest-workout',
    '/ai-generated-high-intensity-workout': '/blog/ai-generated-high-intensity-workout',
    '/ai-generated-micro-workout': '/blog/ai-generated-micro-workout',
    '/ai-workout-female-38yrs-active-runner-high-intensity':
      '/blog/ai-workout-female-38yrs-active-runner-high-intensity',
  }

  if (blogPostRedirects[normalizedPath] !== undefined) {
    return createRedirect(blogPostRedirects[normalizedPath])
  }

  return NextResponse.next()
}

// Helper function to normalize hostname for multi-tenant routing
function normalizeHostname(hostname: string): string {
  const withoutPort = hostname.split(':')[0]
  const withoutWww = withoutPort.replace(/^www\./, '')
  return withoutWww.toLowerCase()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes - excluded because all current routes are platform-level;
     *   see comment at line 13-18 for tenant API route considerations)
     * - _next (Next.js internal routes - static files, data fetching, HMR, etc.)
     * - favicon.ico (favicon file)
     * - public files (images, fonts, etc.)
     *
     * Performance note: This proxy runs on most requests to handle WordPress redirects
     * and multi-tenant routing. Redirect checks are O(1) string comparisons and return early
     * for non-matches. Multi-tenant routing executes first; /admin passes through (auth in pages).
     * Static assets are excluded by the matcher pattern above, so they never hit this proxy.
     */
    '/((?!api|_next|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|json|woff|woff2|ttf|eot)$).*)',
  ],
}
