import type { Metadata } from 'next'
import { masterFAQData, faqData } from '@/data/faq-data'
import FaqItem from '@/components/ui/FAQItems/FaqItem'
import FaqSection from '@/components/ui/FAQItems/FaqSection'
import { FAQPageCTA } from '@/components/ui/FAQItems/FAQPageCTA'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://aiworkoutgenerator.com'

export async function generateMetadata(): Promise<Metadata> {
  const description =
    'Answers about safety, accuracy, and pricing for AI Workout Generator. Verified by certified trainers. We answer the tough questions other apps avoid.'

  return {
    title: 'Frequently Asked Questions | AI Workout Generator',
    description,
    keywords: [
      'AI workout FAQ',
      'fitness app questions',
      'workout generator FAQ',
      'AI fitness safety',
      'workout app accuracy',
      'personal trainer AI',
      'fitness questions',
      'workout safety',
    ],
    authors: [{ name: 'AI Workout Generator' }],
    openGraph: {
      title: 'Frequently Asked Questions | AI Workout Generator',
      description,
      type: 'website',
      url: `${baseUrl}/faq`,
      siteName: 'AI Workout Generator',
      images: [
        {
          url: `${baseUrl}/og-image.jpg`,
          width: 1200,
          height: 630,
          alt: 'AI Workout Generator FAQ - Frequently Asked Questions',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Frequently Asked Questions | AI Workout Generator',
      description,
      images: [`${baseUrl}/og-image.jpg`],
    },
    alternates: {
      canonical: `${baseUrl}/faq`,
    },
  }
}

export default function FAQPage() {
  // Generate JSON-LD Schema automatically from ALL FAQ data
  // Includes all questions from all 5 categories for comprehensive SEO coverage
  const allQuestions = faqData.flatMap(category => category.items)
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allQuestions.map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer.replace(/<[^>]*>/g, ''), // Strip HTML for schema
      },
    })),
  }

  return (
    <>
      {/* Inject Schema for SEO Rich Results */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />

      <main className="min-h-screen bg-[#0a0e1a] text-[#F5F5F4] font-sans leading-relaxed selection:bg-[#84cc16] selection:text-[#0a0e1a] py-12 md:py-20">
        <div className="mx-auto max-w-3xl px-6">
          {/* Header */}
          <div className="text-center mb-16">
            <span className="text-[#0ea5e9] font-bold tracking-wider uppercase text-sm">
              Support
            </span>
            <h1 className="mt-2 text-4xl font-extrabold text-white sm:text-5xl">
              Frequently Asked Questions
            </h1>
            <p className="mt-4 text-lg text-slate-300">
              Everything you need to know about our trainer-verified AI engine. We answer the tough
              questions other apps avoid—including safety, accuracy, and whether AI can actually
              build muscle.
            </p>
          </div>

          {/* Master FAQ Questions - Top 10 Broadest Questions */}
          <div className="space-y-12">
            <section className="bg-[#0f172a] rounded-2xl p-6 md:p-8 shadow-sm border border-white/10">
              <h2 className="text-2xl font-bold text-white mb-6">Most Common Questions</h2>
              <p className="text-slate-300 mb-6 text-sm">
                These are the top questions people ask about AI workouts. For specific topics like
                injuries, seniors, or powerlifting, check out our{' '}
                <a
                  href="/blog"
                  className="text-[#0ea5e9] font-semibold hover:text-[#84cc16] transition-colors"
                >
                  blog posts
                </a>{' '}
                and{' '}
                <a
                  href="/reports"
                  className="text-[#0ea5e9] font-semibold hover:text-[#84cc16] transition-colors"
                >
                  reports
                </a>{' '}
                where we dive deeper into specialized topics.
              </p>
              <div className="divide-y divide-white/10">
                {masterFAQData.map((item, index) => (
                  <FaqItem key={index} question={item.question} answer={item.answer} />
                ))}
              </div>
            </section>

            {/* All FAQ Categories - Complete Coverage */}
            <FaqSection categoryId="trust-safety" />
            <FaqSection categoryId="efficacy" />
            <FaqSection categoryId="technical" />
            <FaqSection categoryId="logistics" />
            <FaqSection categoryId="niche" />
          </div>

          {/* CTA Section */}
          <FAQPageCTA />

          {/* Footer Contact */}
          <div className="mt-12 text-center">
            <p className="text-slate-300">
              Still have questions? Email us at{' '}
              <a
                href="mailto:support@aiworkoutgenerator.com"
                className="text-[#0ea5e9] font-bold hover:text-[#84cc16] transition-colors"
              >
                support@aiworkoutgenerator.com
              </a>
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
