import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const normalizedPath = pathname.toLowerCase().replace(/\/$/, '') // Remove trailing slash and normalize case

  // Helper function to create redirect response
  const createRedirect = (destination: string, permanent = true) => {
    const url = new URL(destination, request.url)
    // Preserve query parameters for internal redirects (e.g., ?ref=source, ?utm_source=...)
    // External redirects (full URLs) should not preserve query params to avoid leaking data
    if (search && destination.startsWith('/')) {
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
    '/faq': '/',
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

  // External redirects to app domain (https://aiworkoutgen.app)
  const externalRedirects: Record<string, string> = {
    '/login': 'https://aiworkoutgen.app/login',
    '/react-login': 'https://aiworkoutgen.app/login',
    '/workout-generator-registration': 'https://aiworkoutgen.app/signup',
    '/build/login': 'https://aiworkoutgen.app/login',
    '/features/login': 'https://aiworkoutgen.app/login',
    '/register': 'https://aiworkoutgen.app/signup',
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
    '/football-accelleration-decelleration-workout':
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

  // Only protect /admin routes (after redirect checks)
  if (!pathname.startsWith('/admin')) {
    return NextResponse.next()
  }

  // Allow login page without auth check to prevent redirect loops
  if (pathname === '/admin/login') {
    return NextResponse.next()
  }

  // For all other admin routes, require authentication
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // No user - redirect to login
  if (!user) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  // Check if user is in admin_users table (RLS allows users to check their own status)
  const { data: adminUser, error } = await supabase
    .from('admin_users')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (error || !adminUser) {
    // User is authenticated but not an admin - redirect to login with error
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('error', 'unauthorized')
    return NextResponse.redirect(loginUrl)
  }

  // Add admin role to headers for use in server components
  response.headers.set('x-admin-role', adminUser.role)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
