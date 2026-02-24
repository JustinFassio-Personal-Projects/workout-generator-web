/**
 * Landing Page FAQ Data (Legacy)
 *
 * This file contains FAQ items specifically for the landing page FAQ section.
 * This is a condensed, simplified version for homepage display.
 *
 * For the main FAQ page with full questions, see:
 * - @/data/faq-data.ts (masterFAQData)
 *
 * For contextual FAQs (topic-specific), see:
 * - @/data/contextual-faqs.ts
 *
 * Used by: @/components/landing/FAQ/FAQ.tsx
 */

export interface FAQItem {
  id: string
  question: string
  answer: string
  buttonText?: string
}

export const faqItems: FAQItem[] = [
  {
    id: '1',
    question: 'How is this different from other AI workout apps?',
    answer:
      'Our AI is built by certified trainers using real progression logic. It adapts to your feedback, equipment, and goals over time — not just random exercises.',
    buttonText: 'Get Started',
  },
  {
    id: '2',
    question: 'Is this safe for beginners?',
    answer:
      'Absolutely. We include beginner-friendly plans with proper exercise selection, progressive overload, and form guidance built in.',
    buttonText: 'Get Started',
  },
  {
    id: '3',
    question: 'What equipment do I need?',
    answer:
      'Works for any setup — bodyweight, dumbbells, or full gym. Just tell us what you have, and we adapt your workouts.',
    buttonText: 'Generate Workout',
  },
  {
    id: '4',
    question: 'How long does it take to get my first workout?',
    answer:
      'Under 2 minutes. Answer a few quick questions and get your personalized plan instantly.',
    buttonText: 'Generate Workout',
  },
  {
    id: '5',
    question: 'Is there a free plan?',
    answer: 'Yes! Start free with no credit card required. Upgrade anytime for advanced features.',
    buttonText: 'Get Started',
  },
]
