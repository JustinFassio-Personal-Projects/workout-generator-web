/**
 * Migration script to move existing blog posts from static data to Supabase
 *
 * Run with: npx tsx scripts/migrate-posts.ts
 *
 * Note: Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * environment variables to be set.
 */

import { createClient } from '@supabase/supabase-js'
import { blogPosts } from '../data/blog/posts'

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// Mapping of author names to their slugs
const authorNameToSlug: Record<string, string> = {
  'Fitness Team': 'fitness-team',
  'Nutrition Expert': 'nutrition-expert',
  'Workout Generator Team': 'workout-generator-team',
}

// Mapping of category names to their slugs
const categoryNameToSlug: Record<string, string> = {
  'Getting Started': 'getting-started',
  'Home Fitness': 'home-fitness',
  Nutrition: 'nutrition',
  Training: 'training',
  Recovery: 'recovery',
}

async function migrate() {
  console.log('Starting migration...\n')

  // Get all authors
  const { data: authors, error: authorsError } = await supabase.from('authors').select('id, slug')

  if (authorsError) {
    console.error('Error fetching authors:', authorsError)
    process.exit(1)
  }

  const authorMap = new Map(authors?.map(a => [a.slug, a.id]))
  console.log('Found authors:', [...authorMap.keys()])

  // Get all categories
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id, slug')

  if (categoriesError) {
    console.error('Error fetching categories:', categoriesError)
    process.exit(1)
  }

  const categoryMap = new Map(categories?.map(c => [c.slug, c.id]))
  console.log('Found categories:', [...categoryMap.keys()])
  console.log('')

  // Migrate each post
  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  for (const post of blogPosts) {
    console.log(`Processing: ${post.title}`)

    // Check if post already exists
    const { data: existingPost } = await supabase
      .from('posts')
      .select('id')
      .eq('slug', post.slug)
      .single()

    if (existingPost) {
      console.log(`  ⏭ Skipping - already exists`)
      skipCount++
      continue
    }

    // Get author ID
    const authorSlug = authorNameToSlug[post.author] || 'workout-generator-team'
    const authorId = authorMap.get(authorSlug)

    if (!authorId) {
      console.log(`  ⚠ Warning: Author "${post.author}" not found, using default`)
    }

    // Get category ID
    const categorySlug = categoryNameToSlug[post.category]
    const categoryId = categoryMap.get(categorySlug || '')

    if (!categoryId) {
      console.log(`  ⚠ Warning: Category "${post.category}" not found`)
    }

    // Prepare post data
    const postData = {
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      category_id: categoryId || null,
      tags: post.tags || [],
      author_id: authorId || null,
      featured_image: post.image || null,
      status: 'published' as const,
      published_at: new Date(post.date).toISOString(),
      created_at: new Date(post.date).toISOString(),
      updated_at: new Date(post.dateModified || post.date).toISOString(),
    }

    // Insert post
    const { error } = await supabase.from('posts').insert(postData)

    if (error) {
      console.log(`  ✗ Error: ${error.message}`)
      errorCount++
    } else {
      console.log(`  ✓ Migrated successfully`)
      successCount++
    }
  }

  console.log('\n--- Migration Complete ---')
  console.log(`✓ Success: ${successCount}`)
  console.log(`⏭ Skipped: ${skipCount}`)
  console.log(`✗ Errors: ${errorCount}`)
  console.log(`Total: ${blogPosts.length}`)
}

migrate().catch(console.error)
