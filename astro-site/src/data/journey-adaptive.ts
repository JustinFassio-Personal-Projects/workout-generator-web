/**
 * Data for the Journey section (Equipment Adaptive–style layout).
 * Step 1 from onboarding workflow, daily check-in, trainers, equipment selection.
 * Step 2 from Plan overview with AI Edit, Swap, Add.
 * Step 3 from Interval Workout Player (guided training).
 */

export type JourneyStepId = 'signup' | 'plan' | 'training'

export interface JourneyStepCard {
  title: string
  subtitle: string
}

export interface JourneyStepData {
  title: string
  desc: string
  logic: string[]
  steps: JourneyStepCard[]
}

export const journeyStepData: Record<JourneyStepId, JourneyStepData> = {
  signup: {
    title: 'Sign Up & Set Goals',
    desc: 'Create your account and tell us about your fitness goals, experience level, and preferences. Our onboarding captures what the app needs to build your plan.',
    logic: [
      'Onboarding workflow: goals, fitness level, activity, and units in one flow',
      'Daily check-in: track readiness and adjust recommendations',
      'Trainer-verified logic: programming built by certified experts',
      'Equipment selection: train with exactly what you have',
    ],
    steps: [
      { title: 'Onboarding workflow', subtitle: 'Goals, level, activity, units' },
      { title: 'Daily check-in', subtitle: 'Readiness and recommendations' },
      { title: 'Trainers', subtitle: 'Certified expert programming' },
      { title: 'Equipment selection', subtitle: 'Bodyweight to full gym' },
    ],
  },
  plan: {
    title: 'Get Your Plan',
    desc: 'Our AI generates a personalized workout plan. Review the plan overview and refine with AI Edit, Swap, and Add so every session fits you.',
    logic: [
      'Plan overview: see full week and split at a glance',
      'AI Edit: change focus, volume, or constraints and regenerate',
      'Swap: replace any exercise (injury or preference); AI learns why',
      'Add: insert exercises without breaking the program logic',
    ],
    steps: [
      { title: 'Plan overview', subtitle: 'Full week and split view' },
      { title: 'AI Edit', subtitle: 'Change focus, volume, constraints' },
      { title: 'Swap', subtitle: 'Replace exercises; AI adapts' },
      { title: 'Add', subtitle: 'Insert exercises safely' },
    ],
  },
  training: {
    title: 'Start Training',
    desc: 'Run your workout with the interval workout player: work/rest timers, step-by-step guidance, and form tips so you train safely and effectively.',
    logic: [
      'Guided work/rest intervals so you know when to work and when to rest',
      'Rest timer between sets to keep sessions on track',
      'Step-by-step exercise cues and set/rep targets',
      'Form tips and video demos for safe execution',
    ],
    steps: [
      { title: 'Interval workout player', subtitle: 'Work/rest intervals' },
      { title: 'Rest timer', subtitle: 'Between sets' },
      { title: 'Step-by-step', subtitle: 'Cues and set/rep targets' },
      { title: 'Form tips', subtitle: 'Video demos and safety' },
    ],
  },
}
