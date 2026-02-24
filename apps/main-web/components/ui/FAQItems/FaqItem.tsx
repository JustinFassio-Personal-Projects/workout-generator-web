'use client'

import { useState } from 'react'
import { FaChevronDown } from 'react-icons/fa6' // Assuming you installed react-icons

interface FaqItemProps {
  question: string
  answer: string
}

export default function FaqItem({ question, answer }: FaqItemProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-white/10 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-5 text-left text-lg font-medium text-white hover:text-[#0ea5e9] transition-colors focus:outline-none"
        aria-expanded={isOpen}
      >
        <span>{question}</span>
        <FaChevronDown
          className={`ml-4 h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div
          className="pb-5 text-slate-300 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: answer }}
        />
      </div>
    </div>
  )
}
