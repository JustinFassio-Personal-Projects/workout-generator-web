/**
 * FAQ Data Structure
 *
 * This file contains the "Hub and Spoke" FAQ architecture:
 * - masterFAQData: Top 10 broadest questions for the main FAQ page (/faq)
 *   Used for SEO-rich results and high-volume search traffic
 *
 * For contextual FAQs (used on blog posts, reports, etc.), see:
 * - @/data/contextual-faqs.ts
 *
 * For landing page FAQ section (condensed version), see:
 * - @/data/faq.ts (legacy file, used by landing page)
 */

export type FAQItem = {
  question: string
  answer: string // Can contain HTML strings if needed, or use a ReactNode if careful
}

export type FAQCategory = {
  id: string
  title: string
  items: FAQItem[]
}

// Master FAQ Data - Top 10 broadest questions for the Hub page
// These are high-volume, general questions that capture broad search traffic
// Used by: /app/faq/page.tsx (main FAQ page)
export const masterFAQData: FAQItem[] = [
  {
    question: 'Are AI workouts effective?',
    answer:
      "Yes. AI workouts can be highly effective when built on real training principles, not random generation. Our AI tracks 'Volume Load' (Sets x Reps x Weight) mathematically and ensures Progressive Overload—the scientifically proven driver of hypertrophy—over time. Unlike generic apps, we generate <em>programs</em>, not just isolated workouts.",
  },
  {
    question: 'Are AI workouts safe for beginners?',
    answer:
      "Yes. Unlike 'black box' apps, our AI has 'Beginner Mode' constraints verified by our founder (30+ years experience). It blocks high-risk movements like Snatches or Overhead Squats until you prove stability.",
  },
  {
    question: 'Can AI fitness apps cause injury?',
    answer:
      "Generic ones can push you too hard. Our AI functions as a 'Safety Engineer,' using a biological feedback loop to cap volume based on your recovery data, preventing burnout and injury. We hard-code volume limits—the AI literally cannot prescribe more than 6 sets of heavy compounds to a beginner, no matter how 'creative' it wants to be.",
  },
  {
    question: 'Does the AI hallucinate fake exercises?',
    answer:
      "No. Our system is a 'Closed-Loop' engine, not a generative chatbot. It chooses from a database of human-verified videos and strictly cannot invent movements or hallucinate dangerous advice. Generic AI models trained on the entire internet can confidently suggest exercises that don't exist or are physically impossible—we prevent this with verified constraints.",
  },
  {
    question: 'Can you actually build muscle with AI?',
    answer:
      "Yes, because we track 'Volume Load' (Sets x Reps x Weight) mathematically. Unlike random workout generators, our AI ensures Progressive Overload—the scientifically proven driver of hypertrophy—over time.",
  },
  {
    question: 'How does the AI create the workout?',
    answer:
      "It is not a Random Number Generator (RNG). It is the digitization of 30 years of training logs. The AI uses a complex 'decision tree' derived from human expertise to build logical, effective sessions. Before our AI writes your plan, it must pass a check against our Verified Exercise Database.",
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

// Full FAQ Data - All questions organized by category (for reference and contextual use)
export const faqData: FAQCategory[] = [
  {
    id: 'trust-safety',
    title: 'Trust & Safety (Is it dangerous?)',
    items: [
      {
        question: 'Are AI workouts safe for beginners?',
        answer:
          "Yes. Unlike 'black box' apps, our AI has 'Beginner Mode' constraints verified by our founder (30+ years experience). It blocks high-risk movements like Snatches or Overhead Squats until you prove stability.",
      },
      {
        question: 'Can AI fitness apps cause injury?',
        answer:
          "Generic ones can push you too hard. Our AI functions as a 'Safety Engineer,' using a biological feedback loop to cap volume based on your recovery data, preventing burnout and injury.",
      },
      {
        question: 'Does the AI hallucinate fake exercises?',
        answer:
          "No. Our system is a 'Closed-Loop' engine, not a generative chatbot. It chooses from a database of human-verified videos and strictly cannot invent movements or hallucinate dangerous advice.",
      },
      {
        question: 'Is my health data shared with ChatGPT?',
        answer:
          "Absolutely not. We operate with a 'Local Privacy' pledge. Your biometric profile is encrypted and used locally to customize your plan—we do not train public LLMs or sell data to third parties.",
      },
      {
        question: 'Why do other apps give me weird exercises?',
        answer:
          "They often rely on simple tag-matching math. We use 'Trainer Logic.' Our hierarchical system prevents illogical pairings (like heavy compounds after exhaustion) because a 30-year expert programmed the rules.",
      },
      {
        question: 'Can I use this if I have an injury (e.g., herniated disc)?',
        answer:
          "Yes. Our AI understands biomechanics. Instead of just 'consulting a doctor,' the system automatically swaps contraindicated exercises (like spinal-loaded squats) for safer alternatives (like belt squats) to protect your specific injury.",
      },
    ],
  },
  {
    id: 'efficacy',
    title: 'Efficacy & Results (Will I build muscle?)',
    items: [
      {
        question: 'Can you actually build muscle with AI?',
        answer:
          "Yes, because we track 'Volume Load' (Sets x Reps x Weight) mathematically. Unlike random workout generators, our AI ensures Progressive Overload—the scientifically proven driver of hypertrophy—over time.",
      },
      {
        question: 'Is AI better than a personal trainer?',
        answer:
          "It's a hybrid truth. A human is best for hands-on form correction, but AI is superior for data management and consistency. We position ourselves as the ultimate tool between trainer sessions—elite programming at a fraction of the cost.",
      },
      {
        question: 'Why am I not getting stronger on other AI apps?',
        answer:
          "Many algorithms are too linear. Our AI features 'Periodization Logic.' If it detects a stall in your progress, it switches rep ranges or intensity zones—mimicking a real coach's decision to undulate periodization to bust plateaus.",
      },
      {
        question: 'Does the app track progressive overload?',
        answer:
          "Yes. We don't just generate workouts; we generate <em>programs</em>. The AI links Day 1 to Day 30, tracking your leverage and load to ensure long-term biological adaptation.",
      },
      {
        question: 'Is this better than a PDF workout plan?',
        answer:
          "A PDF is static; it doesn't know you slept 4 hours last night. Our AI offers 'Dynamic Adaptation,' automatically reducing volume on bad days to prevent burnout while keeping you on track.",
      },
      {
        question: 'Will I lose weight with this AI?',
        answer:
          'The workout builds the engine (muscle) to burn the fuel (fat). While we focus on training, our holistic approach integrates with nutrition concepts to ensure your caloric deficit matches your work output.',
      },
    ],
  },
  {
    id: 'technical',
    title: 'Technical & Features (How does it work?)',
    items: [
      {
        question: 'How does the AI create the workout?',
        answer:
          "It is not a Random Number Generator (RNG). It is the digitization of 30 years of training logs. The AI uses a complex 'decision tree' derived from human expertise to build logical, effective sessions.",
      },
      {
        question: 'Does it use ChatGPT or GPT-4?',
        answer:
          "We use AI for processing, but our knowledge base is proprietary and verified. We are not a generic 'wrapper' app that simply calls an API; our 'Fine-Tuned' logic ensures fitness-specific accuracy.",
      },
      {
        question: 'Can I swap exercises I hate?',
        answer:
          'Yes. And unlike other apps, our AI learns <em>why</em> you swapped it (e.g., Injury vs Preference), adjusting future recommendations to respect your autonomy.',
      },
      {
        question: 'How accurate is the weight recommendation?',
        answer:
          "We use 'RPE Calibration.' The AI asks for feedback after your first set and adjusts immediately based on your Rate of Perceived Exertion (RPE) to ensure you aren't crushed or under-trained.",
      },
      {
        question: 'Does it track rest times automatically?',
        answer:
          'Yes. We use smart timers that adjust based on the intensity of the lift (e.g., longer rest for heavy squats, shorter for curls) to optimize ATP recovery.',
      },
      {
        question: 'Can I customize the workout duration?',
        answer:
          "Yes. If you only have 20 minutes, our 'Efficiency' algorithm strips the 'fluff' exercises and prioritizes the 'Big Rock' compound movements to maximize your ROI.",
      },
    ],
  },
  {
    id: 'logistics',
    title: 'Logistics (Equipment & Pricing)',
    items: [
      {
        question: 'Can I use this with limited home equipment?',
        answer:
          "Absolutely. Our 'MacGyver' feature builds a full, balanced program around exactly what you have—even if it's just two dumbbells and a chair.",
      },
      {
        question: 'Is it easy to cancel the subscription?',
        answer:
          'Yes. One-click cancellation. No emails, no phone calls. We rely on results to keep you, not trapped user accounts.',
      },
      {
        question: 'Is there a free version?',
        answer:
          "We offer a trial. Completely free AI often sells your data or lacks safety checks. We charge a small fee to maintain our 'Human-Verification' layer and ensure your safety.",
      },
      {
        question: 'Does it work offline?',
        answer:
          "Yes. Your plan downloads locally. No loading screens mid-set, ensuring your flow isn't interrupted even if your gym has no WiFi.",
      },
      {
        question: 'How much does it cost vs a real trainer?',
        answer:
          'A personal trainer can cost $80/hour. We offer the logic of that trainer for the price of a streaming subscription (approx. $15/month). It is the democratization of elite coaching.',
      },
      {
        question: 'Can I share my subscription?',
        answer: 'We offer family tier pricing so your whole household can get fit together.',
      },
    ],
  },
  {
    id: 'niche',
    title: 'Niche Use Cases (Seniors, Powerlifting, Calisthenics)',
    items: [
      {
        question: 'Is AI fitness good for seniors (over 60)?',
        answer:
          "Yes. Our founder has trained seniors for 30 years. The AI includes a 'Silver Mode' with 'Mobility-First' logic specifically designed for joint health, balance, and longevity.",
      },
      {
        question: 'Can I use this for powerlifting peaking?',
        answer:
          "Yes. We support true peaking blocks (low volume, high intensity), not just random rep schemes. Our 'Specificity' logic tailors the program for maximum strength output when it counts.",
      },
      {
        question: 'Does it work for calisthenics/bodyweight only?',
        answer:
          'Yes. Unlike basic apps that just add reps, we track leverage progression (e.g., Knees -> Full -> Weighted Pushups). We understand the physics of bodyweight training.',
      },
      {
        question: 'Can I combine running and lifting?',
        answer:
          "The AI knows if you ran 5k yesterday, so it uses 'Interference Effect' logic to automatically reduce leg volume today, preventing overtraining.",
      },
      {
        question: 'Is there a pregnancy safe mode?',
        answer:
          'Yes. Our exercises are filtered by pre/post-natal certified logic to ensure safety, excluding contraindicated movements like abdominal compression where appropriate.',
      },
    ],
  },
]
