/**
 * Script to create the "Random Workouts Kill Progress" blog post
 *
 * Run with: npx tsx scripts/create-random-workouts-post.ts
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

// Post data
const postData = {
  slug: 'random-workouts-kill-progress',
  title: "Why 'Random' Workouts Kill Progress (and How to Fix It)",
  excerpt:
    "Stop 'confusing' your muscles and start growing them. Learn why the SAID principle trumps random workouts and how to use progressive overload for real results.",
  content: `# Why "Random" Workouts Kill Progress (and How to Fix It)

We've all heard it: *"You need to confuse your muscles to make them grow."* It sounds logical. It sounds exciting. It is also, unfortunately, one of the biggest reasons people spin their wheels for years without seeing results.

The allure of the "Workout of the Day" (WOD) or asking ChatGPT for a "fun new chest workout" is strong. Novelty releases dopamine. But physiology doesn't run on dopamine; it runs on **adaptation**.

[GainsSimulator]

## The Science: Why "Confusion" Fails

Your body operates on the **S.A.I.D. Principle** (Specific Adaptation to Imposed Demands).

Think of it like learning a language. If you study Spanish on Monday, French on Wednesday, and Japanese on Friday, you aren't becoming a "polyglot." You're staying a beginner in three languages.

Muscle growth works the same way. When you repeat a squat for 4-6 weeks, your nervous system learns the pattern (weeks 1-2), allowing you to load it heavier (weeks 3-6). That heavy loading is what triggers hypertrophy.

## The Solution: Progressive Overload

Structured training isn't boring; it's effective. To force adaptation, you must do the same movements but make them slightly harder over time. This is **Progressive Overload**.

- **Increase Intensity (Load)**: Lift 5lbs more than last week.
- **Increase Volume**: Do 1 more rep or 1 more set than last week.
- **Decrease Rest**: Do the same work in less time (Density).

## How We Fix This With AI

This is why generic AI chatbots fail at fitness. They hallucinate a "new" workout every time you ask.

At **AI Workout Generator**, we built a memory system. When you generate a "Strength" block, we keep the core compound movements stable while rotating the accessory work. This gives you the novelty you *want* (dopamine) with the consistency you *need* (hypertrophy).

## Stop Guessing. Start Growing.

Get a trainer-verified, progressive plan generated in seconds. No credit card required.

[Generate My Plan](/)`,
  seo_title: "Why 'Random' Workouts Kill Progress (and How to Fix It) | AI Workout Generator",
  seo_description:
    "Stop 'confusing' your muscles and start growing them. Learn why the SAID principle trumps random workouts and how to use progressive overload for real results.",
  status: 'published' as const,
  published_at: '2024-10-15T00:00:00Z',
  tags: ['Progressive Overload', 'Training Science', 'SAID Principle', 'Muscle Growth'],
  featured_image: null,
}

async function createPost() {
  console.log('Creating blog post...\n')

  try {
    // Find or create category "Training Science"
    let categoryId: string | null = null
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', 'training-science')
      .single()

    if (existingCategory) {
      categoryId = existingCategory.id
      console.log('Found existing category: Training Science')
    } else {
      // Try to find similar category first (Fitness Technology)
      const { data: fitnessTechCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', 'fitness-technology')
        .single()

      if (fitnessTechCategory) {
        categoryId = fitnessTechCategory.id
        console.log('Using existing category: Fitness Technology')
      } else {
        // Create new category
        const { data: newCategory, error: categoryError } = await supabase
          .from('categories')
          .insert({
            name: 'Training Science',
            slug: 'training-science',
            description: 'Evidence-based training principles and exercise science',
          })
          .select('id')
          .single()

        if (categoryError) {
          console.error('Error creating category:', categoryError)
          // Continue without category if creation fails
        } else if (newCategory) {
          categoryId = newCategory.id
          console.log('Created new category: Training Science')
        }
      }
    }

    // Find or create author "Justin Fassio"
    let authorId: string | null = null
    const { data: existingAuthor } = await supabase
      .from('authors')
      .select('id')
      .eq('slug', 'justin-fassio')
      .single()

    if (existingAuthor) {
      authorId = existingAuthor.id
      console.log('Found existing author: Justin Fassio')
    } else {
      const { data: newAuthor, error: authorError } = await supabase
        .from('authors')
        .insert({
          name: 'Justin Fassio',
          slug: 'justin-fassio',
          bio: 'ACSM Certified Personal Trainer and Military Fitness Expert with over 30 years of experience in exercise science and tactical physical readiness.',
          avatar: '/Justin-and-Rachel-Profile.jpg',
        })
        .select('id')
        .single()

      if (authorError) {
        console.error('Error creating author:', authorError)
        process.exit(1)
      } else if (newAuthor) {
        authorId = newAuthor.id
        console.log('Created new author: Justin Fassio')
      }
    }

    // Check if post already exists
    const { data: existingPost } = await supabase
      .from('posts')
      .select('id')
      .eq('slug', postData.slug)
      .single()

    if (existingPost) {
      console.log('Post already exists. Updating...')
      const { data: updatedPost, error: updateError } = await supabase
        .from('posts')
        .update({
          ...postData,
          category_id: categoryId,
          author_id: authorId,
          updated_at: new Date().toISOString(),
        })
        .eq('slug', postData.slug)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating post:', updateError)
        process.exit(1)
      }

      console.log('Post updated successfully!')
      console.log('Post ID:', updatedPost?.id)
      return
    }

    // Create the post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        ...postData,
        category_id: categoryId,
        author_id: authorId,
      })
      .select()
      .single()

    if (postError) {
      console.error('Error creating post:', postError)
      process.exit(1)
    }

    console.log('Post created successfully!')
    console.log('Post ID:', post?.id)
    console.log('Slug:', post?.slug)
  } catch (error) {
    console.error('Unexpected error:', error)
    process.exit(1)
  }
}

createPost()
