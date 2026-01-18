import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Workout Generator by Equipment | Smart Gym Configurator',
  description:
    'Build muscle with the gear you own. Select your available equipment and our AI will adjust volume, intensity, and exercise selection to match your home gym, hotel gym, or commercial facility.',
  keywords: [
    'dumbbell workout generator',
    'kettlebell AI workout',
    'barbell workout plans',
    'resistance band workouts',
    'bodyweight exercises',
    'home gym workout generator',
    'equipment-based workouts',
    'AI workout by equipment',
  ],
  openGraph: {
    title: 'AI Workout Generator by Equipment | Smart Gym Configurator',
    description:
      'Build muscle with the gear you own. Select your available equipment and get personalized AI workout plans.',
    type: 'website',
  },
}

export default function EquipmentLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
