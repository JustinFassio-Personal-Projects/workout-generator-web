/**
 * Script to create the "AI Hallucinations in Fitness Data" blog post
 *
 * Run with: npx tsx scripts/create-ai-hallucinations-post.ts
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
  slug: 'ai-hallucinations-health-data',
  title: 'The Problem with AI Hallucinations in Fitness Data',
  excerpt:
    "Generic AI chatbots often invent dangerous exercises. Learn why 'hallucinations' happen in fitness data and how our trainer-verified engine prevents injuries.",
  content: `# The Problem with AI Hallucinations in Fitness Data

Large Language Models (LLMs) are "prediction engines," not truth engines. They don't know that a human knee can't bend 180 degrees backwards. They just predict the next likely word.

In creative writing, a hallucination is a "plot twist." In fitness data, a hallucination is a **torn meniscus**. When you ask a generic chatbot for a workout, it doesn't check biomechanics; it checks probability. This leads to confident, authoritative-sounding advice that is physically impossible or incredibly dangerous.

[HallucinationQuiz]

## Why Fitness Hallucinations Happen

Generic AI models are trained on the entire internet. This includes Reddit threads from 2008, satire sites, and bad fitness blogs. When you ask for a routine, the AI blends high-quality data (ACSM guidelines) with low-quality data (Bro-science).

Because the AI prioritizes "sounding human" over "being accurate," it will confidently instruct you to perform exercises that don't exist, or prescribe volume (e.g., "10 sets of 10 deadlifts") that leads to rhabdomyolysis for beginners.

> **The "Context Window" Trap**
>
> Most chatbots forget your previous injuries after a few messages. You might mention "lower back pain" at the start, but by message #5, the AI suggests "Good Mornings"—a notorious back-loader—because it statistically pairs well with "Leg Day."

## The Solution: Verified Constraints

We solve this at **AI Workout Generator** by using a method called *Retrieval Augmented Generation (RAG)* with a strict "Safety Governor."

Before our AI writes your plan, it must pass a check against our **Verified Exercise Database**. If the AI suggests "Bosu Ball Squats" but that move isn't in our "Safe" list, the system rejects it and forces the AI to choose a stable alternative (like a Goblet Squat).

We also hard-code volume limits. The AI literally *cannot* prescribe more than 6 sets of heavy compounds to a beginner, no matter how "creative" it wants to be.

## Get a Plan That Won't Break You

Our engine is trainer-built and safety-verified. Stop gambling with your joints.

[Build My Safe Routine](/)`,
  seo_title: 'The Problem with AI Hallucinations in Fitness Data | AI Workout Generator',
  seo_description:
    "Generic AI chatbots often invent dangerous exercises. Learn why 'hallucinations' happen in fitness data and how our trainer-verified engine prevents injuries.",
  status: 'published' as const,
  published_at: '2024-10-22T00:00:00Z',
  tags: ['AI Safety', 'Hallucinations', 'Fitness Data', 'Health Risks'],
  featured_image: null,
}

async function createPost() {
  console.log('Creating blog post...\n')

  try {
    // Find or create category "AI Safety"
    let categoryId: string | null = null
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', 'ai-safety')
      .single()

    if (existingCategory) {
      categoryId = existingCategory.id
      console.log('Found existing category: AI Safety')
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
            name: 'AI Safety',
            slug: 'ai-safety',
            description: 'AI safety and reliability in fitness applications',
          })
          .select('id')
          .single()

        if (categoryError) {
          console.error('Error creating category:', categoryError)
          // Continue without category if creation fails
        } else if (newCategory) {
          categoryId = newCategory.id
          console.log('Created new category: AI Safety')
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
