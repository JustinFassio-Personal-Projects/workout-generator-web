'use client'

import React from 'react'
import { contextualFAQs, type ContextualFAQTopic } from '@/data/contextual-faqs'
import FaqItem from './FaqItem'

interface ContextualFAQProps {
  topic: ContextualFAQTopic
  title?: string
  className?: string
}

export const ContextualFAQ: React.FC<ContextualFAQProps> = ({ topic, title, className = '' }) => {
  const questions = contextualFAQs[topic] || []

  if (questions.length === 0) {
    return null
  }

  // Generate JSON-LD Schema for this contextual FAQ
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer.replace(/<[^>]*>/g, ''), // Strip HTML for schema
      },
    })),
  }

  const displayTitle = title || `Frequently Asked Questions`

  return (
    <>
      {/* Inject Schema for SEO Rich Results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />

      <section className={`mt-12 ${className}`}>
        <div className="bg-[#0f172a] rounded-2xl p-6 md:p-8 shadow-sm border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-6">{displayTitle}</h2>
          <div className="divide-y divide-white/10">
            {questions.map((item, index) => (
              <FaqItem key={index} question={item.question} answer={item.answer} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
