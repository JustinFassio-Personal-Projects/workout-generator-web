import { Dumbbell, Weight, Cable, User, CircleDot, ChevronRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface EquipmentCardItem {
  id: string
  name: string
  description: string
  icon: string
}

const iconMap: Record<string, LucideIcon> = {
  dumbbell: Dumbbell,
  weight: Weight,
  barbell: Dumbbell,
  bands: CircleDot,
  cable: Cable,
  user: User,
}

interface EquipmentCardGridProps {
  items: EquipmentCardItem[]
}

export function EquipmentCardGrid({ items }: EquipmentCardGridProps) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {items.map(card => {
        const IconComponent = iconMap[card.icon] ?? User
        return (
          <a
            key={card.id}
            href={`/onboard?equipment=${card.id}`}
            className="glass-card p-6 text-center group"
            id={card.id}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--color-orange-light)]/10 flex items-center justify-center text-[var(--color-orange-light)] group-hover:bg-[var(--color-orange-light)]/20 transition-colors">
              <IconComponent className="w-8 h-8" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-bold mb-2 group-hover:text-[var(--color-orange-light)] transition-colors">
              {card.name}
            </h3>
            <p className="text-sm text-secondary mb-4">{card.description}</p>
            <div className="flex items-center justify-center gap-2 text-[var(--color-orange-light)] text-sm font-semibold">
              <span>Get Started</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </a>
        )
      })}
    </div>
  )
}
