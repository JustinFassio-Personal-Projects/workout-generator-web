import React from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import {
  FaCertificate,
  FaCheck,
  FaDumbbell,
  FaEnvelope,
  FaInstagram,
  FaLinkedin,
  FaListCheck,
  FaLocationDot,
  FaQuoteRight,
  FaShieldHalved,
  FaUserGear,
  FaXTwitter,
  FaYoutube,
} from 'react-icons/fa6'

// 1. SEO Metadata (Next.js App Router)
export const metadata: Metadata = {
  title: 'About AI Workout Generator | Trainer-Verified Fitness Intelligence',
  description:
    'AI Workout Generator combines 30 years of ACSM-certified personal training experience with advanced AI to create safe, progressive, and equipment-specific workout plans.',
  openGraph: {
    title: 'About AI Workout Generator | Trainer-Verified Fitness Intelligence',
    description: 'Safe, Trainer-Verified AI Workouts. 30 Years Experience + Advanced AI.',
    type: 'website',
    // url: 'https://aiworkoutgenerator.com/about', // Uncomment and set your actual URL
    // images: ['/assets/og-about.jpg'], // Uncomment when you have an OG Image
  },
}

// 2. JSON-LD Schema Data
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://aiworkoutgenerator.com/#organization',
      name: 'AI Workout Generator',
      url: 'https://aiworkoutgenerator.com',
      logo: 'https://aiworkoutgenerator.com/assets/logo.png',
      description:
        'A San Diego-based software company combining certified personal training experience with artificial intelligence to create safe, progressive workout plans.',
      foundingDate: '2024',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'San Diego',
        addressRegion: 'CA',
        addressCountry: 'US',
      },
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'support@aiworkoutgenerator.com',
        contactType: 'customer support',
      },
      founder: {
        '@type': 'Person',
        '@id': 'https://aiworkoutgenerator.com/#justin-fassio',
      },
      sameAs: [
        'https://x.com/AI_Workout',
        'https://www.instagram.com/aiworkoutgenerator/',
        'https://www.youtube.com/@aiworkoutgen',
        'https://www.facebook.com/aiworkoutgenerator',
        'https://www.linkedin.com/company/ai-workout-generator/',
        // Yelp URL removed: San Diego Core Fitness is a different business entity.
        // sameAs should only contain URLs for the same entity per Schema.org spec.
      ],
    },
    {
      '@type': 'Person',
      '@id': 'https://aiworkoutgenerator.com/#justin-fassio',
      name: 'Justin Fassio',
      jobTitle: 'Founder & Head Trainer',
      image: 'https://aiworkoutgenerator.com/Justin-and-Rachel-Profile.jpg',
      description:
        'ACSM Certified Personal Trainer and Military Fitness Expert with over 30 years of experience in exercise science and tactical physical readiness.',
      knowsAbout: [
        'Exercise Science',
        'Hypertrophy',
        'Tactical Fitness',
        'Artificial Intelligence Development',
        'Corrective Exercise',
      ],
      alumniOf: [
        {
          '@type': 'Organization',
          name: 'United States Army Master Fitness Trainer Course',
        },
      ],
      worksFor: {
        '@id': 'https://aiworkoutgenerator.com/#organization',
      },
      sameAs: [
        'https://www.linkedin.com/in/justinfassio/',
        'https://x.com/AI_Workout',
        'https://www.instagram.com/aiworkoutgenerator/',
        'https://www.youtube.com/@aiworkoutgen',
      ],
    },
  ],
}

export default function AboutPage() {
  return (
    <>
      {/* Schema Injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="bg-[#0a0e1a] text-[#F5F5F4] font-sans leading-relaxed selection:bg-[#84cc16] selection:text-[#0a0e1a] min-h-screen">
        {/* Navigation Placeholder (Remove if you have a global layout nav) */}
        <nav className="border-b border-white/10 bg-[#0b1220]/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="font-bold text-xl tracking-tight flex items-center gap-2">
              <FaDumbbell className="text-[#0ea5e9]" aria-hidden="true" /> AI Workout Generator
            </div>
            <Link
              href="/"
              className="text-sm font-medium text-slate-300 hover:text-[#84cc16] transition-colors"
            >
              Home
            </Link>
          </div>
        </nav>

        <div className="max-w-4xl mx-auto px-6 py-12 md:py-20 space-y-20">
          {/* 1. The H1: The Identity Hook */}
          <section className="text-center space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white">
              About AI Workout Generator: <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#849288] to-[#0ea5e9]">
                The Trainer-Verified Fitness Engine
              </span>
            </h1>

            {/* 2. The Mission Statement */}
            <div className="max-w-3xl mx-auto bg-[#0f172a] p-6 md:p-8 rounded-2xl shadow-sm border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-[#84cc16]"></div>
              <p className="text-lg md:text-xl text-slate-300 font-medium">
                AI Workout Generator is a San Diego-based software company founded in 2024. We
                combine{' '}
                <span className="text-white font-bold">
                  30 years of certified personal training experience
                </span>{' '}
                with advanced artificial intelligence to create safe, progressive, and
                equipment-specific workout plans that strictly adhere to exercise science
                principles.
              </p>
            </div>
          </section>

          {/* 3. The Expert Bio */}
          <section className="grid md:grid-cols-12 gap-10 items-start">
            {/* Image Column */}
            <div className="md:col-span-4 flex flex-col items-center md:items-start space-y-4">
              <div className="w-full aspect-[3/4] bg-slate-900 rounded-xl overflow-hidden relative shadow-md group">
                <Image
                  src="/Justin-and-Rachel-Profile.jpg"
                  alt="Justin and Rachel - AI Workout Generator"
                  width={500}
                  height={600}
                  priority
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                />
                <div className="absolute bottom-0 left-0 w-full bg-[#1C1917]/90 p-3 backdrop-blur-sm">
                  <p className="text-white text-sm font-bold text-center">Justin Fassio</p>
                  <p className="text-[#849288] text-xs text-center">Founder & Head Trainer</p>
                </div>
              </div>
              {/* ACSM Certificate */}
              <div className="w-full rounded-xl overflow-hidden relative shadow-md border border-white/10 bg-[#0f172a] p-4">
                <Image
                  src="/ACSM CPT Certificate.jpg"
                  alt="ACSM Certified Personal Trainer Certificate"
                  width={500}
                  height={400}
                  className="w-full h-auto object-contain rounded-lg"
                />
              </div>
              {/* Social Proof Links */}
              <div className="flex gap-4 justify-center md:justify-start w-full">
                <a
                  href="https://www.linkedin.com/in/justinfassio/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-300 hover:text-[#0077b5] transition-colors"
                >
                  <FaLinkedin className="text-2xl" aria-hidden="true" />
                </a>
                <a
                  href="https://x.com/AI_Workout"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-300 hover:text-white transition-colors"
                >
                  <FaXTwitter className="text-2xl" aria-hidden="true" />
                </a>
              </div>
            </div>

            {/* Content Column */}
            <div className="md:col-span-8 space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">
                  The Human Intelligence Behind the Code
                </h2>
                <p className="text-slate-300 leading-relaxed">
                  In an era of generic chatbots, credentials matter. AI Workout Generator was
                  architected by Justin Fassio, a seasoned fitness professional with deep roots in
                  both military physical training and civilian exercise science.
                </p>
              </div>

              {/* The "Receipts" (Credentials) */}
              <div className="bg-[#0f172a] rounded-xl border border-white/10 shadow-sm overflow-hidden">
                <div className="bg-white/5 px-6 py-3 border-b border-white/10">
                  <h3 className="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                    <FaCertificate className="text-[#84cc16]" aria-hidden="true" /> Verified
                    Credentials
                  </h3>
                </div>
                <ul className="divide-y divide-white/10">
                  <li className="px-6 py-4 flex items-start gap-3">
                    <FaCheck className="text-green-600 mt-1" aria-hidden="true" />
                    <div>
                      <span className="block font-bold text-white">
                        ACSM Certified Personal Trainer
                      </span>
                      <span className="text-sm text-slate-300">
                        American College of Sports Medicine |{' '}
                        <a
                          href="https://www.acsm.org/"
                          target="_blank"
                          rel="nofollow noreferrer"
                          className="text-[#84cc16] hover:underline"
                        >
                          Verify Credential
                        </a>
                      </span>
                    </div>
                  </li>
                  <li className="px-6 py-4 flex items-start gap-3">
                    <FaCheck className="text-green-600 mt-1" aria-hidden="true" />
                    <div>
                      <span className="block font-bold text-white">Master Fitness Trainer</span>
                      <span className="text-sm text-slate-300">
                        United States Army (Selected for advanced competency in exercise
                        prescription)
                      </span>
                    </div>
                  </li>
                  <li className="px-6 py-4 flex items-start gap-3">
                    <FaCheck className="text-green-600 mt-1" aria-hidden="true" />
                    <div>
                      <span className="block font-bold text-white">
                        Commander’s Total Fitness Program Manager
                      </span>
                      <span className="text-sm text-slate-300">
                        United States Air Force (Oversaw health outcomes for unit personnel)
                      </span>
                    </div>
                  </li>
                  <li className="px-6 py-4 flex items-start gap-3">
                    <FaCheck className="text-green-600 mt-1" aria-hidden="true" />
                    <div>
                      <span className="block font-bold text-white">
                        Founder, San Diego Core Fitness
                      </span>
                      <span className="text-sm text-slate-300">
                        Specialized in functional training and outdoor boot camps.
                      </span>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* 4. The Story */}
          <section className="bg-[#0f172a] rounded-2xl p-8 md:p-12 shadow-sm border border-white/10 relative overflow-hidden">
            <Image
              src="/Justin%20Suspension%20Training%20Mission%20Bay%20San%20Diego.jpg"
              alt=""
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-cover opacity-20"
              aria-hidden="true"
            />
            <div className="absolute inset-0 bg-[#0a0e1a]/70" aria-hidden="true"></div>
            <div className="relative">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <FaQuoteRight className="text-9xl" aria-hidden="true" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-6">
                Why I Built This: The &quot;Safety Gap&quot;
              </h2>
              <div className="prose prose-lg prose-invert text-slate-200">
                <p className="mb-4">
                  &quot;I watched the rise of AI with both excitement and concern. I saw people
                  getting dangerous, hallucinated workout advice from generic chatbots that
                  didn&apos;t understand biomechanics or progressive overload. An LLM can write a
                  poem, but if it writes a bad squat program, people get hurt.&quot;
                </p>
                <p className="mb-4">
                  &quot;I realized that for AI to be useful in fitness, it needed a governor—a layer
                  of <strong>&apos;Trainer Logic&apos;</strong> that filters the AI&apos;s
                  creativity through rigid safety protocols. I built AI Workout Generator to bridge
                  that gap.&quot;
                </p>
                <p>
                  &quot;We don&apos;t just let the AI guess. We force it to adhere to the same
                  principles I used when training soldiers and civilians:{' '}
                  <span className="font-bold text-white">Specificity, Overload, and Safety.</span>
                  &quot;
                </p>
              </div>
              <div className="mt-8 flex items-center gap-4">
                <div className="h-px bg-white/10 flex-1"></div>
                <span className="text-2xl text-[#84cc16] italic font-serif">Justin Fassio</span>
                <div className="h-px bg-white/10 flex-1"></div>
              </div>
            </div>
          </section>

          {/* 5. The Methodology */}
          <section>
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-white">How Our Engine Works</h2>
              <p className="text-slate-300 mt-2">
                Transparency in our &quot;Hybrid-Intelligence&quot; model.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 text-center">
              {/* Step 1 */}
              <div className="bg-[#0f172a] p-6 rounded-xl border border-white/10 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-400 text-2xl">
                  <FaUserGear aria-hidden="true" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-white">1. User Inputs</h3>
                <p className="text-sm text-slate-300">
                  You define your equipment, limitations, time constraints, and goals. This creates
                  the &quot;boundary conditions.&quot;
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-[#0f172a] p-6 rounded-xl border border-white/10 shadow-sm hover:shadow-md transition-shadow relative">
                {/* Connector Line for Desktop */}
                <div className="hidden md:block absolute top-1/2 -left-4 w-4 h-0.5 bg-white/10"></div>
                <div className="hidden md:block absolute top-1/2 -right-4 w-4 h-0.5 bg-white/10"></div>

                <div className="w-16 h-16 bg-[#84cc16]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[#84cc16] text-2xl">
                  <FaShieldHalved aria-hidden="true" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-white">2. The Safety Layer</h3>
                <p className="text-sm text-slate-300">
                  Our proprietary logic injects trainer-verified rules (volume/load calculation)
                  before the AI is allowed to generate.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-[#0f172a] p-6 rounded-xl border border-white/10 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-green-400 text-2xl">
                  <FaListCheck aria-hidden="true" />
                </div>
                <h3 className="font-bold text-lg mb-2 text-white">3. Structured Output</h3>
                <p className="text-sm text-slate-300">
                  The AI generates the specific exercises, but strict formatting ensures readability
                  and logical flow.
                </p>
              </div>
            </div>
          </section>

          {/* 6. Trust Signals & Contact */}
          <section className="bg-[#0f172a] text-[#F5F5F4] rounded-2xl p-8 md:p-12 border border-white/10">
            <div className="grid md:grid-cols-2 gap-10">
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Connect With Us</h2>
                <p className="text-[#849288] mb-6">
                  We are a real business run by real humans. Whether you have a feature request or a
                  question about a specific movement, we&apos;re here.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <FaLocationDot className="text-[#0ea5e9] w-6" aria-hidden="true" />
                    <span>San Diego, CA (USA)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <FaEnvelope className="text-[#0ea5e9] w-6" aria-hidden="true" />
                    <a
                      href="mailto:support@aiworkoutgenerator.com"
                      className="hover:text-white hover:underline transition-colors"
                    >
                      support@aiworkoutgenerator.com
                    </a>
                  </div>
                </div>

                <div className="mt-8 flex gap-4">
                  <a
                    href="https://x.com/AI_Workout"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#0ea5e9] transition-colors text-white"
                  >
                    <FaXTwitter aria-hidden="true" />
                  </a>
                  <a
                    href="https://www.instagram.com/aiworkoutgenerator/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#0ea5e9] transition-colors text-white"
                  >
                    <FaInstagram aria-hidden="true" />
                  </a>
                  <a
                    href="https://www.youtube.com/@aiworkoutgen"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#0ea5e9] transition-colors text-white"
                  >
                    <FaYoutube aria-hidden="true" />
                  </a>
                </div>
              </div>

              <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                <h3 className="font-bold text-white mb-4">Latest from the Founder</h3>
                <div className="space-y-4">
                  <Link href="/blog/random-workouts-kill-progress" className="block group">
                    <span className="text-xs text-[#849288]">January 2026</span>
                    <p className="font-medium text-[#F5F5F4] group-hover:text-[#0ea5e9] transition-colors">
                      Why &quot;Random&quot; Workouts Kill Progress (and How to Fix It)
                    </p>
                  </Link>
                  <hr className="border-white/10" />
                  <Link href="/blog/ai-hallucinations-health-data" className="block group">
                    <span className="text-xs text-[#849288]">September 2024</span>
                    <p className="font-medium text-[#F5F5F4] group-hover:text-[#0ea5e9] transition-colors">
                      The Problem with AI Hallucinations in Health Data
                    </p>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
