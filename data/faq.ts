export interface FAQItem {
  id: string
  question: string
  answer: string
}

export const faqItems: FAQItem[] = [
  {
    id: '1',
    question: 'How is this different from other AI workout apps?',
    answer:
      'Our AI is built by certified trainers using real progression logic. It adapts to your feedback, equipment, and goals over time — not just random exercises.',
  },
  {
    id: '2',
    question: 'Is this safe for beginners?',
    answer:
      'Absolutely. We include beginner-friendly plans with proper exercise selection, progressive overload, and form guidance built in.',
  },
  {
    id: '3',
    question: 'What equipment do I need?',
    answer:
      'Works for any setup — bodyweight, dumbbells, or full gym. Just tell us what you have, and we adapt your workouts.',
  },
  {
    id: '4',
    question: 'How long does it take to get my first workout?',
    answer:
      'Under 2 minutes. Answer a few quick questions and get your personalized plan instantly.',
  },
  {
    id: '5',
    question: 'Is there a free plan?',
    answer: 'Yes! Start free with no credit card required. Upgrade anytime for advanced features.',
  },
]
