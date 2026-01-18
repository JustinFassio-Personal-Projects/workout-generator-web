/**
 * Script to update the featured image for "Best AI Workout Generator 2026" blog post
 *
 * Run with: npx tsx scripts/update-best-ai-workout-generator-image.ts
 *
 * Note: Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * environment variables to be set.
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf-8')
  envFile.split('\n').forEach(line => {
    // Skip comments and empty lines
    const trimmedLine = line.trim()
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return
    }

    const match = trimmedLine.match(/^([^=:#]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()
      // Remove quotes if present
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
}

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nMake sure .env.local exists in the project root with these variables.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function updatePostImage() {
  console.log('Updating blog post image...\n')

  try {
    const slug = 'best-ai-workout-generator-2026-system-vs-randomness'
    const newImage = '/female-situp.jpg'

    // Check if post exists
    const { data: existingPost, error: fetchError } = await supabase
      .from('posts')
      .select('id, slug, title, featured_image')
      .eq('slug', slug)
      .single()

    if (fetchError) {
      console.error('Error fetching post:', fetchError)
      console.log('\nPost may not exist in Supabase yet. Static data files have been updated.')
      process.exit(1)
    }

    if (!existingPost) {
      console.log('Post not found in Supabase.')
      console.log(
        'Static data files have been updated. The post will use the new image when it is created in Supabase.'
      )
      return
    }

    console.log(`Found post: "${existingPost.title}"`)
    console.log(`Current image: ${existingPost.featured_image || '(none)'}`)
    console.log(`Updating to: ${newImage}\n`)

    // Update the post
    const { data: updatedPost, error: updateError } = await supabase
      .from('posts')
      .update({
        featured_image: newImage,
        updated_at: new Date().toISOString(),
      })
      .eq('slug', slug)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating post:', updateError)
      process.exit(1)
    }

    console.log('✓ Post updated successfully!')
    console.log(`Post ID: ${updatedPost?.id}`)
    console.log(`New featured image: ${updatedPost?.featured_image}`)
  } catch (error) {
    console.error('Unexpected error:', error)
    process.exit(1)
  }
}

updatePostImage()
