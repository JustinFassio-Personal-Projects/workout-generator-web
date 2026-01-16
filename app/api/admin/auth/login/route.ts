import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getPostHogClient } from '@/lib/posthog-server'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()

    // Attempt to sign in
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

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: adminUser.role,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'An error occurred during login' }, { status: 500 })
  }
}
