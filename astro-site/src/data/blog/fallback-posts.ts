import type { TransformedPost } from '@/types/blog'

/**
 * Static fallback blog posts for when Supabase is unavailable
 * These are used as a backup data source
 */
export const fallbackPosts: TransformedPost[] = [
  {
    id: '1',
    slug: 'getting-started-with-ai-workouts',
    title: 'Getting Started with AI-Powered Workouts',
    excerpt:
      'Learn how to create your first AI-generated workout plan using an approach built on real training principles, not random prompts.',
    image: '/ai_workout_generator_hero_1.png',
    dateModified: '2026-01-07',
    content: `# Getting Started with AI-Powered Workouts: A Beginner's Guide to Personalized Training

**By Justin Fassio, Product Designer & Certified Personal Trainer**
*Published: January 7, 2026*

---

Getting started with AI-powered workouts can feel confusing — especially if you've tried fitness apps that promise personalization but deliver generic routines.

This guide walks you through how to create your first **AI-generated workout plan** using an approach built on real training principles, not random prompts. If you're new to AI workouts or looking for a smarter way to train, this is the place to start.

---

## What Are AI-Powered Workouts?

AI-powered workouts use adaptive algorithms to generate training plans based on your **goals, experience level, available equipment, and time constraints**.

Unlike static workout templates, a well-designed AI workout generator:

* Adjusts difficulty as you progress
* Matches exercises to your experience level
* Accounts for the equipment you actually have
* Evolves your plan instead of repeating the same routines

The goal isn't novelty — it's **consistency, safety, and long-term progress**.

---

## Why AI-Powered Workouts Work Better Than Generic Plans

Traditional workout plans are often one-size-fits-all. They don't account for where you're starting, what you have access to, or how your body adapts over time.

AI-powered workouts solve this by:

* Personalizing workouts instead of forcing you into presets
* Scaling volume and intensity as you improve
* Reducing guesswork around exercise selection
* Helping beginners avoid common training mistakes

When combined with real coaching logic, AI becomes a tool for **better decision-making**, not a replacement for sound training principles.

---

## Start Your First AI Workout

AI-powered workouts work best when they're **personalized, adaptive, and grounded in real training logic**.

If you're ready to try it yourself, you can generate your first AI workout in minutes and see how adaptive training feels in practice.`,
    date: '2026-01-07',
    author: 'Justin Fassio',
    category: 'Getting Started',
    tags: ['aiworkouts', 'beginnerfitness', 'personalizedtraining', 'strengthandconditioning'],
  },
  {
    id: '2',
    slug: 'maximizing-your-home-workout-space',
    title: 'Master Your Micro-Gym: How to Strategically Maximize Your Home Workout Space',
    excerpt:
      'Transform any space into an effective home gym. Expert tips on maximizing small workout spaces, equipment selection, and organization strategies for optimal home fitness results.',
    image: '/HIIT_Workout.png',
    dateModified: '2026-01-10',
    content: `# Master Your Micro-Gym: How to Strategically Maximize Your Home Workout Space

**By Justin Fassio, Product Designer & Certified Personal Trainer**
*Published: January 10, 2026*

---

The dream of a fully-equipped home gym often collides with the reality of limited square footage. But just because you don't have a dedicated room doesn't mean you can't create an incredibly effective, inspiring **home workout space**.

Whether you're working with a 5x5 corner of your living room, a slice of a spare bedroom, or even a flexible outdoor patio, strategic planning can turn any area into an optimized **home gym setup**. The key isn't the size—it's how you maximize what you have.

---

## 1. Declutter and Define Your Zone

The first step to maximizing any **home workout space** is ruthless decluttering. Remove anything that doesn't serve your workout goals from your designated area. Clear boundaries help both mentally and physically prepare the space for activity.

### Minimum Space Requirements

* **Bodyweight workouts**: You need at least a 6x6 foot area (36 square feet)
* **Resistance band training**: A 5x5 foot area (25 square feet) works perfectly
* **Dumbbell workouts**: Plan for 8x8 feet (64 square feet) to safely perform exercises
* **Full circuit training**: Ideally 10x10 feet (100 square feet) allows for movement flow

---

## 2. Embrace Verticality and Multi-Functional Equipment

When floor space is at a premium, look up! **Vertical storage solutions** transform unused wall space into organizational gold.

### Multi-Functional Equipment for Small Spaces

**Adjustable dumbbells** are the MVP of **small space workout setup**. A single pair can replace an entire rack.

**A sturdy bench** serves multiple purposes including upper body presses, step-ups, core training, and stretching.

**Resistance band sets** offer a gym's worth of exercises in a tiny footprint.`,
    date: '2026-01-10',
    author: 'Justin Fassio',
    category: 'Home Fitness',
    tags: ['homeworkout', 'homegym', 'smallspaceworkout', 'workoutequipment'],
  },
  {
    id: '3',
    slug: 'progressive-overload-explained',
    title: 'Progressive Overload: The Science Behind Building Muscle',
    excerpt:
      'Understand the fundamental principle that drives all muscle and strength gains. Learn how to apply progressive overload safely and effectively.',
    image: '/ai_workout_generator_hero_1.png',
    dateModified: '2026-01-15',
    content: `# Progressive Overload: The Science Behind Building Muscle

**By Justin Fassio, Product Designer & Certified Personal Trainer**
*Published: January 15, 2026*

---

Progressive overload is the most important principle in strength training. It's the systematic increase of demands placed on your body over time—and without it, your muscles have no reason to adapt and grow.

---

## What Is Progressive Overload?

Progressive overload means gradually increasing the stress placed on your musculoskeletal system. This can be achieved through:

* **Increasing weight**: The most common method
* **Increasing reps**: More volume at the same weight
* **Increasing sets**: More total work
* **Decreasing rest time**: Higher training density
* **Improving form**: Better muscle engagement

---

## Why Progressive Overload Matters

Your body adapts to stress. If you lift the same weight for the same reps every week, your body has no reason to change. Progressive overload provides the stimulus for:

* **Muscle hypertrophy**: Bigger muscles
* **Strength gains**: Lift heavier weights
* **Improved neural efficiency**: Better mind-muscle connection
* **Bone density**: Stronger skeletal system

---

## How to Implement Progressive Overload Safely

The key is **gradual progression**. Aim for small, consistent increases:

* Add 2.5-5 lbs to upper body lifts
* Add 5-10 lbs to lower body lifts
* Or add 1-2 reps before increasing weight

Track your workouts and aim to beat your previous performance—even by a small margin.`,
    date: '2026-01-15',
    author: 'Justin Fassio',
    category: 'Training Science',
    tags: ['progressiveoverload', 'musclebuilding', 'strengthtraining', 'hypertrophy'],
  },
]
