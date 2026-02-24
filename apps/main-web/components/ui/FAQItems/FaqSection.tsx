import { faqData } from '@/data/faq-data'
import FaqItem from './FaqItem'

interface FaqSectionProps {
  categoryId: string
  showTitle?: boolean
  className?: string
}

export default function FaqSection({
  categoryId,
  showTitle = true,
  className = '',
}: FaqSectionProps) {
  const category = faqData.find(cat => cat.id === categoryId)

  if (!category) return null

  return (
    <section
      className={`bg-[#0f172a] rounded-2xl p-6 md:p-8 shadow-sm border border-white/10 ${className}`}
    >
      {showTitle && <h2 className="text-2xl font-bold text-white mb-6">{category.title}</h2>}
      <div className="divide-y divide-white/10">
        {category.items.map((item, index) => (
          <FaqItem key={index} question={item.question} answer={item.answer} />
        ))}
      </div>
    </section>
  )
}
