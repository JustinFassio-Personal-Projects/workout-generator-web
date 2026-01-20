/**
 * Contextual FAQ Data (Spoke Pages)
 *
 * This file contains topic-specific FAQ questions for use on blog posts,
 * reports, and other contextual pages (the "Spoke" pages in Hub and Spoke strategy).
 *
 * For the main FAQ page (Hub), see:
 * - @/data/faq-data.ts (masterFAQData)
 *
 * For landing page FAQ section, see:
 * - @/data/faq.ts (legacy file)
 *
 * Used by: @/components/ui/FAQItems/ContextualFAQ.tsx
 */

import { FAQItem } from './faq-data'

export type ContextualFAQTopic =
  | 'injury-rehab'
  | 'seniors'
  | 'powerlifting'
  | 'calisthenics'
  | 'pregnancy'
  | 'equipment'
  | 'technical'

export const contextualFAQs: Record<ContextualFAQTopic, FAQItem[]> = {
  'injury-rehab': [
    {
      question: 'Can I use this if I have an injury (e.g., herniated disc)?',
      answer:
        "Yes. Our AI understands biomechanics. Instead of just 'consulting a doctor,' the system automatically swaps contraindicated exercises (like spinal-loaded squats) for safer alternatives (like belt squats) to protect your specific injury.",
    },
    {
      question: 'Does the AI account for previous injuries in workout planning?',
      answer:
        'Yes. When you input injury information, our Safety Governor automatically filters out movements that could aggravate your condition. The AI learns from your exercise swaps and adjusts future recommendations accordingly.',
    },
    {
      question: 'Can the AI help with rehabilitation after surgery?',
      answer:
        "Our AI can adapt to post-surgical limitations, but we always recommend following your physical therapist's protocol first. The AI can complement your rehab by suggesting safe movement patterns that respect your recovery timeline.",
    },
  ],
  seniors: [
    {
      question: 'Is AI fitness good for seniors (over 60)?',
      answer:
        "Yes. Our founder has trained seniors for 30 years. The AI includes a 'Silver Mode' with 'Mobility-First' logic specifically designed for joint health, balance, and longevity.",
    },
    {
      question: 'Does the AI adjust workouts for age-related limitations?',
      answer:
        'Yes. Silver Mode automatically reduces high-impact movements, prioritizes balance work, and focuses on functional movements that support daily activities. The AI understands that recovery needs increase with age.',
    },
    {
      question: 'Can seniors build muscle with AI workouts?',
      answer:
        'Absolutely. Muscle loss (sarcopenia) accelerates after 60, making resistance training crucial. Our AI ensures progressive overload while respecting joint health—you can build strength safely at any age.',
    },
  ],
  powerlifting: [
    {
      question: 'Can I use this for powerlifting peaking?',
      answer:
        "Yes. We support true peaking blocks (low volume, high intensity), not just random rep schemes. Our 'Specificity' logic tailors the program for maximum strength output when it counts.",
    },
    {
      question: 'Does the AI understand periodization for strength training?',
      answer:
        "Yes. Our AI features 'Periodization Logic.' If it detects a stall in your progress, it switches rep ranges or intensity zones—mimicking a real coach's decision to undulate periodization to bust plateaus.",
    },
    {
      question: 'Can the AI program for competition prep?',
      answer:
        'Yes. The AI can structure your training around competition dates, managing volume and intensity to peak at the right time. It understands the difference between general strength work and competition-specific peaking.',
    },
  ],
  calisthenics: [
    {
      question: 'Does it work for calisthenics/bodyweight only?',
      answer:
        'Yes. Unlike basic apps that just add reps, we track leverage progression (e.g., Knees -> Full -> Weighted Pushups). We understand the physics of bodyweight training.',
    },
    {
      question: 'Can the AI progress bodyweight exercises?',
      answer:
        'Yes. The AI tracks leverage progression, not just rep counts. It understands that moving from knee pushups to full pushups to weighted pushups represents real progression, even if reps stay the same.',
    },
    {
      question: 'Does it include advanced calisthenics movements?',
      answer:
        'Yes. Our exercise database includes progressions from basic movements to advanced skills like muscle-ups, handstand pushups, and levers. The AI sequences these appropriately based on your current ability.',
    },
  ],
  pregnancy: [
    {
      question: 'Is there a pregnancy safe mode?',
      answer:
        'Yes. Our exercises are filtered by pre/post-natal certified logic to ensure safety, excluding contraindicated movements like abdominal compression where appropriate.',
    },
    {
      question: 'How does the AI adjust workouts during pregnancy?',
      answer:
        'Pregnancy mode automatically reduces intensity, avoids supine positions after the first trimester, and focuses on movements that support your changing body. The AI adapts as you progress through trimesters.',
    },
    {
      question: 'Can I use this for postpartum recovery?',
      answer:
        'Yes. Postpartum mode gradually reintroduces core work, respects diastasis recti concerns, and helps rebuild strength safely. The AI understands that recovery timelines vary.',
    },
  ],
  equipment: [
    {
      question: 'Can I use this with limited home equipment?',
      answer:
        "Absolutely. Our 'MacGyver' feature builds a full, balanced program around exactly what you have—even if it's just two dumbbells and a chair.",
    },
    {
      question: 'Does it work offline?',
      answer:
        "Yes. Your plan downloads locally. No loading screens mid-set, ensuring your flow isn't interrupted even if your gym has no WiFi.",
    },
    {
      question: 'Can I swap exercises based on available equipment?',
      answer:
        "Yes. The AI learns what equipment you have and automatically suggests alternatives when you don't have access to specific machines or tools. It understands exercise equivalencies.",
    },
    {
      question: 'Does the AI work with gym machines?',
      answer:
        'Yes. The AI can program for any equipment setup—from bodyweight to full commercial gyms. It understands the differences between free weights, machines, and cables.',
    },
  ],
  technical: [
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
    {
      question: 'Does the app track progressive overload?',
      answer:
        "Yes. We don't just generate workouts; we generate <em>programs</em>. The AI links Day 1 to Day 30, tracking your leverage and load to ensure long-term biological adaptation.",
    },
    {
      question: 'Why do other apps give me weird exercises?',
      answer:
        "They often rely on simple tag-matching math. We use 'Trainer Logic.' Our hierarchical system prevents illogical pairings (like heavy compounds after exhaustion) because a 30-year expert programmed the rules.",
    },
    {
      question: 'Is my health data shared with ChatGPT?',
      answer:
        "Absolutely not. We operate with a 'Local Privacy' pledge. Your biometric profile is encrypted and used locally to customize your plan—we do not train public LLMs or sell data to third parties.",
    },
  ],
}
