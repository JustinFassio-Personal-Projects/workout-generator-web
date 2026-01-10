import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Build Your Workout Plan - Workout Generator',
  description:
    'Build your personalized AI workout plan in 2 minutes. Choose your goal, fitness level, and equipment to generate a customized fitness plan.',
}

export default function OnboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Inline script to apply dark mode before React hydrates */}
      {/* This prevents flash of light mode by ensuring .dark class is applied immediately */}
      {/* Script runs synchronously during HTML parsing, before any React hydration */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                // Apply dark mode immediately to prevent flash
                document.documentElement.classList.add('dark');
              } catch (e) {
                // Silently fail if DOM manipulation fails (shouldn't happen but defensive)
              }
            })();
          `,
        }}
      />
      {children}
    </>
  )
}
