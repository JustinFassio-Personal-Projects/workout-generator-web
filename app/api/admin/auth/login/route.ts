import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getPostHogClient } from '@/lib/posthog-server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Missing Supabase environment variables' }, { status: 500 })
    }

    // Response we will return on success; Supabase will set session cookies on it via setAll
    const response = new NextResponse()
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    })

    // Attempt to sign in (this triggers setAll and writes cookies to response)
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      // PostHog: Track failed login attempt
      try {
        const posthog = getPostHogClient()
        posthog.capture({
          distinctId: email,
          event: 'admin_login_failed',
          properties: {
            email_domain: email.split('@')[1] || 'unknown',
            error_message: authError.message,
            reason: 'auth_error',
          },
        })
        await posthog.flush()
      } catch (posthogError) {
        console.warn('PostHog tracking error:', posthogError)
      }
      return NextResponse.json({ error: authError.message }, { status: 401 })
    }

    if (!data.user) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    // Check if user is in admin_users table
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('id, role')
      .eq('id', data.user.id)
      .single()

    if (adminError || !adminUser) {
      // PostHog: Track unauthorized admin access attempt
      try {
        const posthog = getPostHogClient()
        posthog.capture({
          distinctId: data.user.id,
          event: 'admin_login_failed',
          properties: {
            user_id: data.user.id,
            email_domain: (data.user.email || '').split('@')[1] || 'unknown',
            reason: 'not_admin',
          },
        })
        await posthog.flush()
      } catch (posthogError) {
        console.warn('PostHog tracking error:', posthogError)
      }
      // Sign out since user is not an admin
      await supabase.auth.signOut()
      return NextResponse.json({ error: 'You do not have admin access' }, { status: 403 })
    }

    // PostHog: Track successful admin login
    try {
      const posthog = getPostHogClient()
      posthog.capture({
        distinctId: data.user.id,
        event: 'admin_login_success',
        properties: {
          user_id: data.user.id,
          email_domain: (data.user.email || '').split('@')[1] || 'unknown',
          role: adminUser.role,
        },
      })
      // Identify the admin user
      posthog.identify({
        distinctId: data.user.id,
        properties: {
          email: data.user.email,
          role: adminUser.role,
          is_admin: true,
        },
      })
      await posthog.flush()
    } catch (posthogError) {
      console.warn('PostHog tracking error:', posthogError)
    }

    // Return JSON with session cookies on the same response so the browser stores them before redirect
    const body = {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: adminUser.role,
      },
    }
    const successResponse = NextResponse.json(body)
    const setCookieHeaders = response.headers.getSetCookie?.() ?? []
    if (setCookieHeaders.length > 0) {
      setCookieHeaders.forEach(value => successResponse.headers.append('Set-Cookie', value))
    } else {
      response.cookies.getAll().forEach(cookie => {
        successResponse.cookies.set(cookie.name, cookie.value, { path: '/' })
      })
    }
    return successResponse
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'An error occurred during login' }, { status: 500 })
  }
}
