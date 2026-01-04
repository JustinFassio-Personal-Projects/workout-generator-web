/**
 * Setup script to create an initial admin user
 *
 * Run with: npx tsx scripts/setup-admin-user.ts <email> <password>
 *
 * Note: Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * environment variables to be set.
 */

import { createClient } from '@supabase/supabase-js'

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Get email and password from command line arguments
const email = process.argv[2]
const password = process.argv[3]
const role = process.argv[4] || 'admin' // default to 'admin', can be 'editor'

if (!email || !password) {
  console.error('Usage: npx tsx scripts/setup-admin-user.ts <email> <password> [role]')
  console.error(
    'Example: npx tsx scripts/setup-admin-user.ts admin@example.com securepassword123 admin'
  )
  process.exit(1)
}

if (!['admin', 'editor'].includes(role)) {
  console.error('Role must be either "admin" or "editor"')
  process.exit(1)
}

// Create admin client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function setupAdminUser() {
  console.log('Setting up admin user...\n')

  try {
    // Create the user in Supabase Auth
    console.log(`Creating user: ${email}`)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email so user can login immediately
    })

    if (authError) {
      console.error('Error creating user:', authError.message)
      process.exit(1)
    }

    if (!authData.user) {
      console.error('Failed to create user: No user data returned')
      process.exit(1)
    }

    console.log(`✓ User created with ID: ${authData.user.id}`)

    // Add user to admin_users table
    console.log(`Adding user to admin_users table with role: ${role}`)
    const { error: adminError } = await supabase.from('admin_users').insert({
      id: authData.user.id,
      role: role,
    })

    if (adminError) {
      console.error('Error adding user to admin_users:', adminError.message)

      // Try to clean up the auth user if admin_users insert fails
      console.log('Cleaning up auth user...')
      await supabase.auth.admin.deleteUser(authData.user.id)

      process.exit(1)
    }

    console.log(`✓ User added to admin_users table`)
    console.log('\n--- Setup Complete ---')
    console.log(`Email: ${email}`)
    console.log(`Role: ${role}`)
    console.log(`User ID: ${authData.user.id}`)
    console.log('\nYou can now login at /admin/login')
  } catch (error) {
    console.error('Unexpected error:', error)
    process.exit(1)
  }
}

setupAdminUser().catch(console.error)
