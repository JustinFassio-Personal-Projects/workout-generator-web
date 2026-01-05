export interface Milestone {
  slug: string
  title: string
  tagline: string
  heroText?: string // Custom hero text (if different from tagline)
  order: number
  relatedChapters?: string[]
  // Content fields
  storyText: string // Full narrative content
  learnedPoints: string[] // "What I Learned" bullets
  productConnections: string[] // "How This Shows Up" bullets
  // SEO fields
  seoTitle?: string
  seoDescription?: string
  // CTA fields
  primaryCtaHref?: string
  primaryCtaLabel?: string
  secondaryCtaHref?: string
  secondaryCtaLabel?: string
}

export const milestones: Milestone[] = [
  {
    slug: 'santa-cruz-surfing',
    title: 'Santa Cruz: Where Fitness Was a Lifestyle, Not a Plan',
    tagline: 'Training should fit real life.',
    heroText:
      "Fitness wasn't something I \"got into.\" It was the environment I grew up in.\nI'm Justin Fassio, and my first understanding of training came long before gyms, apps, or wearables—it came from growing up in **Santa Cruz, California**, where movement wasn't optional and capability mattered.",
    order: 1,
    relatedChapters: ['joining-the-air-force'],
    seoTitle: 'Santa Cruz Surf Roots | Founder Story — Justin Fassio',
    seoDescription:
      'Before certifications and tech, fitness started in Santa Cruz—surf culture, cold water discipline, and learning to train for real life.',
    storyText: `If you grew up in a coastal town, you know the vibe: the ocean sets the schedule. You don't negotiate with the water. You show up ready—or you get humbled.

Surfing teaches you a kind of fitness that doesn't care about aesthetics. It's endurance, resilience, timing, and repeat effort. It's patience mixed with sudden intensity. It's also a relationship with recovery—because if you go too hard too often, the ocean will make you pay for it.

That environment shaped my earliest philosophy: **fitness is usefulness.** The goal isn't to win the mirror. The goal is to move well, stay durable, and build a body that can handle real life.

When I started learning training more formally later on, what stuck out immediately was how much "fitness culture" drifted away from that truth—people chasing novelty, chasing extremes, chasing quick fixes. But the body doesn't care what's trending. The body responds to consistency, intelligent progression, and basic principles executed over time.

That's the Santa Cruz imprint on everything I've built since: coaching systems, training businesses, and eventually AI fitness tools. Because if you strip away the hype, good training is simple. Not easy—simple.

> **Cold water lesson:** motivation is unreliable. Systems are what keep you showing up.`,
    learnedPoints: [
      'Consistency beats intensity spikes.',
      'Training has to work in the real world, not just inside a perfect plan.',
      `Recovery isn't weakness—it's part of performance.`,
      `The best training is the kind you'll actually repeat.`,
    ],
    productConnections: [
      `Workouts are designed around **repeatability**, not novelty for novelty's sake.`,
      'The programming logic prioritizes **progression and sustainability** over "destroy you" sessions.',
      'The product is built to meet people where they are—because real life has constraints.',
    ],
    primaryCtaHref: '/#workout-builder',
    primaryCtaLabel: 'Generate Your First Workout',
    secondaryCtaHref: '/story/joining-the-air-force',
    secondaryCtaLabel: 'Next Chapter: Joining the Air Force',
  },
  {
    slug: 'joining-the-air-force',
    title: 'Joining the Air Force: Choosing Standards Over Comfort',
    tagline: 'Standards matter. Structure matters.',
    heroText:
      'I joined the Air Force because I wanted structure, challenge, and standards.\nNot slogans. Not vibes. Standards.',
    order: 2,
    relatedChapters: ['santa-cruz-surfing', 'tacp'],
    seoTitle: 'Joining the Air Force | Founder Story — Justin Fassio',
    seoDescription:
      'Why I joined the Air Force—and how military standards shaped my philosophy on training, discipline, and real performance.',
    storyText: `When you grow up around athletic people, outdoors people, surf people—there's a natural confidence that comes with it. But there's also a question that eventually shows up: *What happens when it's not just you and your friends? What happens when you're part of something bigger, something that demands more?*

Joining the Air Force was a turning point because it introduced a completely different relationship with fitness and performance. In the civilian world, you can always opt out. You can always hit pause. You can always change the goal.

In the military, **fitness is tied to readiness**, and readiness is tied to responsibility. That changes how you train. It changes how you think. And it changes how seriously you take the basics.

I didn't join thinking, "This will make me a trainer." I joined thinking, "This will shape me." And it did.

It taught me:

* that systems matter more than motivation
* that accountability is a performance multiplier
* that fitness isn't a personal hobby—it's often a requirement

Later, when I became a professional trainer and started building fitness products, I kept coming back to that: the difference between training as entertainment and training as a standard.

That's also where I first started noticing what most beginners struggle with: not effort—**structure**. People don't need more motivation. They need a plan that makes sense, is realistic, and evolves with them.`,
    learnedPoints: [
      'Standards create clarity: you always know what "good" looks like.',
      'Discipline is an environment—build the environment, and behavior follows.',
      'Fitness systems need measurement, not guesswork.',
    ],
    productConnections: [
      'The app is built around **clear inputs → structured outputs**.',
      'The programming favors **simple logic done well** over complicated randomness.',
      'The goal is to create **clarity and momentum** quickly, especially for beginners.',
    ],
    primaryCtaHref: '/#workout-builder',
    primaryCtaLabel: 'Generate Your First Workout',
    secondaryCtaHref: '/story/tacp',
    secondaryCtaLabel: 'Next Chapter: Life as a TACP',
  },
  {
    slug: 'tacp',
    title: 'TACP: Where Fitness Became Readiness',
    tagline: `Fitness isn't vibes. It's preparedness.`,
    heroText:
      '**TACP isn\'t a job you fake your way through.**\nIt\'s one of those roles where your body and your mindset get tested constantly—and where fitness stops being "optional."',
    order: 3,
    relatedChapters: ['joining-the-air-force', 'mft-ufpm-3rd-asog'],
    seoTitle: 'TACP Background | Founder Story — Justin Fassio',
    seoDescription:
      'Serving as a TACP taught me the difference between workouts and readiness—and why training must be structured, safe, and repeatable.',
    storyText: `My time as a **Tactical Air Control Party (TACP)** member hardwired a truth that never left me: **training is only valuable if it holds up under stress.**

In a lot of fitness marketing, you'll hear nonsense like "battle ready" or "tactical." Most of it is cosplay. But in the real world, the stakes are different. You don't train for aesthetics—you train because capability matters.

That experience taught me to respect:

* movement quality under fatigue
* durability over ego
* conditioning that supports performance, not punishment
* and programming that doesn't break people just to prove it's "hard"

It also taught me the importance of adaptability. You won't always have perfect equipment, perfect conditions, or perfect recovery. Your training has to account for reality, not fantasy.

That concept—**train with constraints**—became foundational for how I later coached civilians, and it's one of the most important principles behind AIWorkoutGenerator today.

Because here's the ugly truth: a lot of AI-generated workouts ignore constraints. They throw exercises together like a blender. They don't know what a beginner can recover from. They don't understand progression. And they often don't even consider safety.

TACP made me allergic to that kind of sloppy thinking.`,
    learnedPoints: [
      'Fitness is a tool. Treat it like one.',
      'Constraints are normal—programs must flex without breaking.',
      `The "hardest" plan isn't the best plan. The best plan is the one you can execute and repeat.`,
    ],
    productConnections: [
      'Equipment-aware outputs (train with what you have).',
      'A bias toward **workable programming** over flashy randomness.',
      'A "durability-first" programming philosophy.',
    ],
    primaryCtaHref: '/#workout-builder',
    primaryCtaLabel: 'Generate Your First Workout',
    secondaryCtaHref: '/story/mft-ufpm-3rd-asog',
    secondaryCtaLabel: 'Next Chapter: Running Fitness at Fort Hood (3rd ASOG)',
  },
  {
    slug: 'mft-ufpm-3rd-asog',
    title: 'Fort Hood: Master Fitness Trainer / UFPM for 3rd ASOG (11th ASOS)',
    tagline: 'AI workouts must be constrained, progressive, and safe.',
    heroText:
      '**This was the chapter where I stopped thinking like an individual trainee—and started thinking like a system designer.**',
    order: 4,
    relatedChapters: ['tacp', 'ucsc-literature-critical-theory'],
    seoTitle: 'MFT / UFPM at Fort Hood | Founder Story — Justin Fassio',
    seoDescription:
      'A waiver appointment to lead fitness programming taught me how to build safe, scalable training systems for real populations.',
    storyText: `At **Fort Hood, Texas**, I was assigned within the **11th Air Support Operations Squadron**, under the **3rd Air Support Operations Group (3rd ASOG)**. During that time, I was granted a **waiver as an Airman First Class** to serve as **Master Fitness Trainer (MFT) / Unit Fitness Program Manager (UFPM)**.

That detail matters for one reason: you don't get waivers like that unless leadership trusts your competence and your judgment. That role wasn't "rah-rah PT." It was responsibility—training outcomes, compliance, readiness metrics, and accountability.

And it's where I learned one of the most overlooked truths about fitness programming:

> **When you design training for a population, your job is not to make it hard. Your job is to make it work.**

You're not writing a plan for the most motivated person. You're designing a system for:

* different fitness levels
* different injury histories
* different attitudes toward exercise
* and different life constraints

You also learn fast that prevention matters. If you train people into the ground, you don't get a medal. You get more injuries and worse readiness.

That's where "safe programming" became non-negotiable for me—not as a marketing phrase, but as an operational requirement. Safety isn't softness. Safety is how you keep performance going long-term.

That entire experience became the blueprint for how I think about AI fitness:

* Input quality matters
* Constraints matter
* Progression matters
* And outputs must be safe enough to repeat.`,
    learnedPoints: [
      'Scaling fitness requires structure, not personality.',
      'Safety is performance preservation.',
      'A good system supports beginners without boring advanced people.',
      'Compliance and consistency are the real bottlenecks.',
    ],
    productConnections: [
      'The product treats programming as a **decision system**, not a random generator.',
      "It's built to create **consistency and progression**, not viral workouts.",
      'The approach respects different levels and constraints because it was born in a population-management mindset.',
    ],
    primaryCtaHref: '/#workout-builder',
    primaryCtaLabel: 'Generate Your First Workout',
    secondaryCtaHref: '/story/ucsc-literature-critical-theory',
    secondaryCtaLabel: 'Next Chapter: UCSC & Systems Thinking',
  },
  {
    slug: 'ucsc-literature-critical-theory',
    title: 'UCSC: Literature, Semiotics, and the Psychology of Adherence',
    tagline: 'Adherence is design. Not willpower.',
    heroText: '**This is the "weird" chapter on paper—and the secret weapon in practice.**',
    order: 5,
    relatedChapters: ['mft-ufpm-3rd-asog', 'san-diego-core-fitness'],
    seoTitle: 'UC Santa Cruz & Critical Theory | Founder Story — Justin Fassio',
    seoDescription:
      'Literature and semiotics trained me to design for human behavior—because the best workout plan is the one people actually follow.',
    storyText: `After the military, I earned my degree in **Literature from the University of California, Santa Cruz**, then completed graduate coursework in **Critical Theory and Semiotics** (coursework completed; degree not conferred).

Most people hear that and think, "What does that have to do with fitness?"

A lot, actually.

Because fitness isn't just physiology. It's behavior. It's identity. It's the stories people tell themselves:

* "I'm not athletic."
* "I always fall off."
* "I don't have time."
* "I need the perfect plan first."

Semiotics is basically the study of meaning—how people interpret signals. In fitness products, everything is a signal:

* the words you use
* the tone of the app
* the way progress is framed
* the confidence or shame implied by messaging

That education taught me how to look at training not just as sets and reps, but as a **human system**. And the biggest failure point in fitness systems isn't usually intensity. It's confusion. Friction. Overwhelm. Poor expectations.

When I later built businesses and products, I kept returning to that:

* Make it clear.
* Make it doable.
* Make it repeatable.
* Make the next step obvious.

That's how people change. Not with perfect motivation—**with better design**.`,
    learnedPoints: [
      'Clarity is a retention strategy.',
      `People don't quit because they're lazy; they quit because the system is confusing or unrealistic.`,
      'Language shapes behavior—especially for beginners.',
      'Trust is built through transparency, not hype.',
    ],
    productConnections: [
      'Plain-English explanations instead of jargon dumps.',
      'A bias toward "doable next steps" rather than overwhelming program outputs.',
      'The product is built to reduce cognitive load and make consistency easier.',
    ],
    primaryCtaHref: '/#workout-builder',
    primaryCtaLabel: 'Generate Your First Workout',
    secondaryCtaHref: '/story/san-diego-core-fitness',
    secondaryCtaLabel: 'Next Chapter: San Diego Core Fitness',
  },
  {
    slug: 'san-diego-core-fitness',
    title: 'San Diego Core Fitness: The Real-World Training Lab',
    tagline: `Programs that don't work in real life don't work.`,
    heroText:
      '**This is where theory met reality.**\nI built San Diego Core Fitness to prove something simple: the best training is what people can sustain.',
    order: 6,
    relatedChapters: ['ucsc-literature-critical-theory', 'gymgo'],
    seoTitle: 'San Diego Core Fitness | Founder Story — Justin Fassio',
    seoDescription:
      'Building San Diego Core Fitness taught me what works outside theory—real people, real schedules, real constraints, real results.',
    storyText: `San Diego Core Fitness wasn't born from branding. It was born from coaching. From watching what actually works when people are busy, stressed, inconsistent, and human.

In the civilian world, you can build the most "perfect" program imaginable—and it can still fail for the dumbest reasons:

* it takes too long
* it's too complicated
* it's too intimidating
* it doesn't fit someone's schedule
* it ignores what someone can recover from

So I built a business around functional training, outdoor sessions, and a style of programming that kept things challenging but grounded. Not random. Not reckless. Not designed to impress other trainers. Designed to help real people show up again tomorrow.

Running a business also forces you to understand something most people never see: fitness isn't just exercise—it's logistics.

* scheduling
* communication
* follow-up
* accountability
* onboarding
* expectation-setting

That operational side of coaching is where retention lives or dies.

San Diego Core Fitness taught me that if you want results at scale, you need systems. Not just talent. Not just motivation. Systems.`,
    learnedPoints: [
      'A plan is only as good as its adherence.',
      `Most people don't need more intensity—they need better structure.`,
      'Coaching is part physiology, part psychology, part operations.',
      'Fitness businesses run on trust and consistency.',
    ],
    productConnections: [
      'The app is built to produce plans that are realistic, not fantasy workouts.',
      'The logic is designed to support consistent training, not "one perfect week."',
      'Product decisions prioritize usability and follow-through.',
    ],
    primaryCtaHref: '/#workout-builder',
    primaryCtaLabel: 'Generate Your First Workout',
    secondaryCtaHref: '/story/gymgo',
    secondaryCtaLabel: 'Next Chapter: GymGo',
  },
  {
    slug: 'gymgo',
    title: 'GymGo: Designing Fitness Tech Before It Was Normal',
    tagline: 'Fitness products live or die on usability.',
    heroText: `**I didn't move into tech because it was trendy.**\nI moved into tech because I kept watching great coaching get crushed by bad systems.`,
    order: 7,
    relatedChapters: ['san-diego-core-fitness', 'fitnimbus'],
    seoTitle: 'GymGo Platform | Founder Story — Justin Fassio',
    seoDescription:
      'GymGo was an early attempt to remove friction from coaching through software—less admin, better delivery, more consistency.',
    storyText: `GymGo came from a practical frustration: coaches were wasting energy on logistics instead of coaching. Scheduling. Billing. Managing clients. Delivering content. Keeping people engaged.

And at the same time, clients were stuck with too many broken experiences:

* messy communication
* inconsistent programming
* unclear expectations
* lack of follow-through

GymGo was an attempt to build a platform that made training delivery cleaner and more consistent. It was early. It wasn't perfect. And yes, the company is no longer operating. But it taught me the lesson that shaped everything afterward:

> **Great coaching doesn't scale by willpower. It scales by infrastructure.**

That includes:

* product design
* user experience
* onboarding flows
* friction removal
* and systems that encourage follow-through

GymGo forced me to think about fitness as a product experience, not just a workout. And that mindset is exactly what AI fitness needs—because AI without good product design is just chaos delivered faster.`,
    learnedPoints: [
      'UX determines adherence more than people admit.',
      'A fitness app must reduce friction, not add decisions.',
      'Delivery systems matter as much as programming.',
    ],
    productConnections: [
      `AIWorkoutGenerator isn't just "AI output"—it's a guided experience.`,
      'The product is built to make starting simple and continuing easier.',
      'Every feature is evaluated through one lens: does this help someone follow through?',
    ],
    primaryCtaHref: '/#workout-builder',
    primaryCtaLabel: 'Generate Your First Workout',
    secondaryCtaHref: '/story/fitnimbus',
    secondaryCtaLabel: 'Next Chapter: FitNimbus',
  },
  {
    slug: 'fitnimbus',
    title: 'FitNimbus: Building Infrastructure for Coaches',
    tagline: 'Automation should remove friction, not remove quality.',
    heroText: '**FitNimbus was about the unsexy truth: admin kills coaching.**',
    order: 8,
    relatedChapters: ['gymgo', 'why-ai-workout-generator'],
    seoTitle: 'FitNimbus | Founder Story — Justin Fassio',
    seoDescription:
      'FitNimbus was built to solve the operational reality of coaching—billing, scheduling, client management—so trainers could focus on outcomes.',
    storyText: `FitNimbus came from the operational side of fitness—the side nobody wants to talk about until it breaks:

* billing
* scheduling
* client management
* retention workflows

A lot of fitness entrepreneurs burn out not because coaching is hard, but because everything around coaching is chaotic.

Building FitNimbus deepened my belief that fitness outcomes aren't just training variables. They're system variables:

* consistent scheduling
* clear communication
* structured follow-up
* easy "next steps"

FitNimbus also pushed me closer to the product-builder identity: designing tools for other professionals, not just for individual clients. That's a scaling mindset—similar to what I learned running unit fitness programming in the military, but translated into software.

And once you start thinking in systems, AI becomes an obvious next step—not as a gimmick, but as a multiplier.`,
    learnedPoints: [
      'Fitness results depend on operational consistency.',
      'Most "motivation problems" are really workflow problems.',
      `Scale requires tools that don't collapse under real usage.`,
    ],
    productConnections: [
      'The product is designed as a system, not a one-time generator.',
      'The goal is repeat engagement: plan → execute → adjust → continue.',
      'AI is used to reduce friction and increase clarity, not to replace good fundamentals.',
    ],
    primaryCtaHref: '/#workout-builder',
    primaryCtaLabel: 'Generate Your First Workout',
    secondaryCtaHref: '/story/why-ai-workout-generator',
    secondaryCtaLabel: 'Next Chapter: Why AIWorkoutGenerator Exists',
  },
  {
    slug: 'why-ai-workout-generator',
    title: 'Why I Built AIWorkoutGenerator: Anti-Randomness, Pro-Progress',
    tagline: 'The thesis: safe AI, progression logic, anti-randomness stance.',
    heroText: `**Most AI workouts fail for one reason: they're confident chaos.**\nThey look smart. They sound precise. But they're often random, inconsistent, and disconnected from progression.`,
    order: 9,
    relatedChapters: ['fitnimbus'],
    seoTitle: 'Why AIWorkoutGenerator Exists | Founder Story — Justin Fassio',
    seoDescription:
      'AIWorkoutGenerator was built to solve the biggest problem with AI workouts: randomness. This is structured training with safety and progression built in.',
    storyText: `I've been training people since 1996. I've run fitness programming inside military units. I've built real-world training businesses. I've designed fitness software.

And across all of that, one truth keeps showing up:

> People don't need more workout ideas. They need a plan that makes sense and evolves with them.

AI made it easier than ever to generate workouts. That's the problem. Because generating output is easy. Generating *good* programming—programming that respects constraints, supports progression, and doesn't beat people into the ground—is harder.

AIWorkoutGenerator exists because I wanted to build something that:

* respects real training principles
* helps beginners start safely
* gives intermediates structure
* and avoids the "random workout of the day" trap

The goal isn't to impress you with complexity. The goal is to help you train consistently enough that results become inevitable.

This is also where I draw a hard line: AI should never be a license to be reckless. It should be used to reduce friction, increase clarity, and help people follow through.

That's why the product is built with a bias toward:

* repeatability
* progression
* practical constraints
* and workouts that match the person doing them

Because the future of fitness isn't "AI replacing coaches."
It's AI making good coaching logic accessible at scale—without losing the fundamentals.`,
    learnedPoints: [
      `**Safety isn't optional.**`,
      '**Progression beats novelty.**',
      '**Consistency beats intensity spikes.**',
      '**A plan you can follow beats a plan you admire.**',
    ],
    productConnections: [
      'Inputs matter (goals, equipment, constraints) → output changes accordingly.',
      'The system is designed to support consistency and progress over time.',
      'The experience is built to reduce overwhelm and decision fatigue.',
    ],
    primaryCtaHref: '/#workout-builder',
    primaryCtaLabel: 'Generate Your First Workout',
    secondaryCtaHref: '/founder-story',
    secondaryCtaLabel: 'Back to Founder Story',
  },
]

export const getMilestoneBySlug = (slug: string): Milestone | undefined => {
  return milestones.find(milestone => milestone.slug === slug)
}

export const getMilestonesByOrder = (): Milestone[] => {
  return [...milestones].sort((a, b) => a.order - b.order)
}

export const getAllMilestoneSlugs = (): string[] => {
  return milestones.map(milestone => milestone.slug)
}

/**
 * Get related chapter slugs for a milestone.
 * Uses manual relatedChapters if defined, otherwise falls back to order-based (previous/next).
 */
export const getRelatedChapterSlugs = (milestone: Milestone): string[] => {
  // If manual relationships are defined, use them
  if (milestone.relatedChapters && milestone.relatedChapters.length > 0) {
    return milestone.relatedChapters
  }

  // Otherwise, use order-based relationships (previous and next)
  const allMilestones = getMilestonesByOrder()
  const currentIndex = allMilestones.findIndex(m => m.slug === milestone.slug)

  if (currentIndex === -1) {
    return []
  }

  const relatedSlugs: string[] = []

  // Add previous chapter if it exists
  if (currentIndex > 0) {
    relatedSlugs.push(allMilestones[currentIndex - 1].slug)
  }

  // Add next chapter if it exists
  if (currentIndex < allMilestones.length - 1) {
    relatedSlugs.push(allMilestones[currentIndex + 1].slug)
  }

  return relatedSlugs
}
