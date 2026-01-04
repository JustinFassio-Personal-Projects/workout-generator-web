import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Force Node.js runtime for middleware to avoid Edge runtime issues with Supabase
export const runtime = 'nodejs'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect /admin routes
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
  matcher: '/admin/:path*',
}
