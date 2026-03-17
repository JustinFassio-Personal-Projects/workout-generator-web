"use client";

import { Sparkles, Dumbbell, BarChart3, type LucideIcon } from "lucide-react";
import type { User } from "firebase/auth";

interface Step {
  step: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const stepsLoggedOut: Step[] = [
  {
    step: "01",
    title: "Profile Sync",
    description:
      "Connect your wearables and input your fitness goals. Our AI builds your physiological baseline.",
    icon: Sparkles,
  },
  {
    step: "02",
    title: "AI Generation",
    description:
      "Receive hyper-personalized workout and nutrition plans that adapt to your daily recovery.",
    icon: Dumbbell,
  },
  {
    step: "03",
    title: "Real-time Adapt",
    description:
      "As you train, the system adjusts weights and intensity in real-time for maximum efficiency.",
    icon: BarChart3,
  },
];

const stepsLoggedIn: Step[] = [
  {
    step: "01",
    title: "Daily Check-In",
    description:
      "Tell us how you feel today — energy, sleep, stress, soreness, and time available.",
    icon: Sparkles,
  },
  {
    step: "02",
    title: "Generate Workout",
    description:
      "Our function reads your profile + today’s context and produces a workout tailored to your recovery.",
    icon: Dumbbell,
  },
  {
    step: "03",
    title: "Review & Track",
    description:
      "Open the generated workout, follow the plan, and keep iterating as your training evolves.",
    icon: BarChart3,
  },
];

interface HowItWorksSectionProps {
  user: User | null;
}

export function HowItWorksSection({ user }: HowItWorksSectionProps) {
  const steps = user ? stepsLoggedIn : stepsLoggedOut;
  return (
    <section id="how-it-works" className="py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            {user ? "Today’s " : "Your Path to"}{" "}
            <span className="bg-gradient-to-r from-primary to-complementary bg-clip-text text-transparent">
              {user ? "Next Workout" : "Peak Performance"}
            </span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            {user
              ? "A simple loop: check in, generate, and train."
              : "Three simple steps to a more intelligent training regime."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          {/* Connecting Lines for Desktop */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-border to-transparent -z-10" />

          {steps.map((s, i) => (
            <div
              key={i}
              className="flex flex-col items-center text-center group"
            >
              <div className="relative mb-8">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-card border-2 border-border shadow-xl transition-all duration-500 group-hover:border-primary group-hover:scale-110 group-hover:rotate-3">
                  <s.icon className="h-10 w-10 text-primary" />
                </div>
                <div className="absolute -top-4 -right-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg shadow-lg">
                  {s.step}
                </div>
              </div>
              <h3 className="text-xl font-bold mb-4 group-hover:text-primary transition-colors">
                {s.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
