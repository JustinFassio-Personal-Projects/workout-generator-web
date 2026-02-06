/**
 * FAQ Data Structure for Astro
 */

export type FAQItem = {
  question: string
  answer: string
}

export type FAQCategory = {
  id: string
  title: string
  items: FAQItem[]
}

// Master FAQ Data - Top 10 broadest questions for the Hub page
export const masterFAQData: FAQItem[] = [
  {
    question: 'Are AI workouts effective?',
    answer:
      "Yes. AI workouts can be highly effective when built on real training principles, not random generation. Our AI tracks 'Volume Load' (Sets x Reps x Weight) mathematically and ensures Progressive Overload—the scientifically proven driver of hypertrophy—over time. Unlike generic apps, we generate programs, not just isolated workouts.",
  },
  {
    question: 'Are AI workouts safe for beginners?',
    answer:
      "Yes. Unlike 'black box' apps, our AI has 'Beginner Mode' constraints verified by our founder (30+ years experience). It blocks high-risk movements like Snatches or Overhead Squats until you prove stability.",
  },
  {
    question: 'Can AI fitness apps cause injury?',
    answer:
      "Generic ones can push you too hard. Our AI functions as a 'Safety Engineer,' using a biological feedback loop to cap volume based on your recovery data, preventing burnout and injury. We hard-code volume limits—the AI literally cannot prescribe more than 6 sets of heavy compounds to a beginner.",
  },
  {
    question: 'Does the AI hallucinate fake exercises?',
    answer:
      "No. Our system is a 'Closed-Loop' engine, not a generative chatbot. It chooses from a database of human-verified videos and strictly cannot invent movements or hallucinate dangerous advice.",
  },
  {
    question: 'Can you actually build muscle with AI?',
    answer:
      "Yes, because we track 'Volume Load' (Sets x Reps x Weight) mathematically. Unlike random workout generators, our AI ensures Progressive Overload—the scientifically proven driver of hypertrophy—over time.",
  },
  {
    question: 'How does the AI create the workout?',
    answer:
      "It is not a Random Number Generator (RNG). It is the digitization of 30 years of training logs. The AI uses a complex 'decision tree' derived from human expertise to build logical, effective sessions.",
  },
  {
    question: 'Is AI better than a personal trainer?',
    answer:
      "It's a hybrid truth. A human is best for hands-on form correction, but AI is superior for data management and consistency. We position ourselves as the ultimate tool between trainer sessions—elite programming at a fraction of the cost.",
  },
  {
    question: 'How much does it cost vs a real trainer?',
    answer:
      'A personal trainer can cost $80/hour. We offer the logic of that trainer for the price of a streaming subscription (approx. $15/month). It is the democratization of elite coaching.',
  },
  {
    question: 'Is there a free version?',
    answer:
      "We offer a trial. Completely free AI often sells your data or lacks safety checks. We charge a small fee to maintain our 'Human-Verification' layer and ensure your safety.",
  },
  {
    question: 'Can I use this with limited home equipment?',
    answer:
      "Absolutely. Our 'MacGyver' feature builds a full, balanced program around exactly what you have—even if it's just two dumbbells and a chair.",
  },
]

// Categorized FAQ Data
export const faqData: FAQCategory[] = [
  {
    id: 'trust-safety',
    title: 'Trust & Safety',
    items: [
      {
        question: 'Are AI workouts safe for beginners?',
        answer:
          "Yes. Unlike 'black box' apps, our AI has 'Beginner Mode' constraints verified by our founder (30+ years experience). It blocks high-risk movements until you prove stability.",
      },
      {
        question: 'Is my health data shared with ChatGPT?',
        answer:
          "Absolutely not. We operate with a 'Local Privacy' pledge. Your biometric profile is encrypted and used locally—we do not train public LLMs or sell data to third parties.",
      },
      {
        question: 'Can I use this if I have an injury?',
        answer:
          'Yes. Our AI understands biomechanics and automatically swaps contraindicated exercises for safer alternatives to protect your specific injury.',
      },
    ],
  },
  {
    id: 'efficacy',
    title: 'Efficacy & Results',
    items: [
      {
        question: 'Does the app track progressive overload?',
        answer:
          "Yes. We don't just generate workouts; we generate programs. The AI links Day 1 to Day 30, tracking your leverage and load for long-term biological adaptation.",
      },
      {
        question: 'Is this better than a PDF workout plan?',
        answer:
          "A PDF is static; it doesn't know you slept 4 hours last night. Our AI offers 'Dynamic Adaptation,' automatically reducing volume on bad days to prevent burnout.",
      },
    ],
  },
  {
    id: 'technical',
    title: 'Technical & Pricing',
    items: [
      {
        question: 'Do I need expensive gym equipment?',
        answer:
          'No. Our AI builds complete programs around whatever you have—dumbbells, resistance bands, or even just bodyweight.',
      },
      {
        question: 'Can I cancel anytime?',
        answer:
          'Yes. We offer simple monthly billing with no contracts. Cancel anytime from your account settings.',
      },
    ],
  },
]
