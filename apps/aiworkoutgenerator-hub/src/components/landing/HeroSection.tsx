"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  ArrowRight,
  Users,
  Star,
  ShieldCheck,
  Dumbbell,
} from "lucide-react";
import type { User } from "firebase/auth";
import { useUserDailyState } from "@/hooks/useUserDailyState";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
  user: User | null;
}

export function HeroSection({ user }: HeroSectionProps) {
  const { data: dailyStateData } = useUserDailyState();
  const hasCompletedCheckIn = !!dailyStateData;
  return (
    <section className="relative pt-24 pb-32 sm:pt-32 sm:pb-48 overflow-hidden">
      {/* Advanced Background effects */}
      <div className="absolute inset-0 -z-10">
        {/* High-intensity Glow Layer */}
        <div
          className="absolute inset-0 opacity-100"
          style={{
            background: `
                  radial-gradient(circle at 50% -5%, hsl(var(--primary) / 0.5) 0%, transparent 60%),
                  radial-gradient(circle at 50% 30%, hsl(var(--complementary) / 0.4) 0%, transparent 50%),
                  radial-gradient(circle at 10% 25%, hsl(var(--tertiary) / 0.3) 0%, transparent 40%),
                  radial-gradient(circle at 90% 25%, hsl(var(--primary) / 0.2) 0%, transparent 40%)
                `,
            filter: "blur(60px)",
          }}
        />

        {/* Subtle Grid overlay */}
        <div
          className="absolute inset-0 brand-grid opacity-30"
          style={{
            maskImage:
              "radial-gradient(circle at center, black 30%, transparent 80%)",
            WebkitMaskImage:
              "radial-gradient(circle at center, black 30%, transparent 80%)",
          }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
        <Badge
          variant="outline"
          className="mb-8 rounded-full border-tertiary/30 bg-tertiary/10 px-4 py-1.5 text-sm font-medium text-tertiary shadow-[0_0_15px_rgba(231,98,23,0.15)] backdrop-blur-md"
        >
          <Sparkles className="mr-2 h-3.5 w-3.5 fill-tertiary" />
          The Future of Fitness is Here
        </Badge>

        <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-foreground sm:text-7xl lg:text-8xl">
          {user ? (
            <>
              Welcome back — let&apos;s{" "}
              <span className="bg-gradient-to-r from-tertiary via-complementary to-tertiary bg-clip-text text-transparent animate-gradient-x">
                train smarter
              </span>
            </>
          ) : (
            <>
              Elevate Your Training with{" "}
              <span className="bg-gradient-to-r from-tertiary via-complementary to-tertiary bg-clip-text text-transparent animate-gradient-x">
                AI Intelligence
              </span>
            </>
          )}
        </h1>

        <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          {user
            ? "Update today’s check-in, then generate a workout tailored to your current recovery and goals."
            : "Hyper-personalized workouts and precision nutrition plans that adapt to your unique physiology in real-time."}
        </p>

        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            asChild
            size="lg"
            variant="outline"
            className={cn(
              "group h-14 rounded-full border-2 px-10 text-base font-semibold transition-all hover:bg-muted/50 hover:scale-[1.02]",
              !hasCompletedCheckIn &&
                user &&
                "animate-pulse border-tertiary text-tertiary shadow-[0_0_20px_rgba(232,108,23,0.5)]"
            )}
          >
            <Link href={user ? "/daily-checkin" : "#features"}>
              {user ? "Daily Check-In" : "Explore Features"}
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          {user && !hasCompletedCheckIn ? (
            <Button
              size="lg"
              disabled
              aria-label="Complete your daily check-in first to generate a workout"
              title="Complete your daily check-in first to generate a workout"
              className="h-14 rounded-full px-10 text-base font-semibold shadow-xl shadow-primary/25 opacity-50 cursor-not-allowed"
            >
              Generate Today&apos;s Workout
              <Dumbbell className="ml-2 h-5 w-5" />
            </Button>
          ) : (
            <Button
              asChild
              size="lg"
              className="h-14 rounded-full px-10 text-base font-semibold shadow-xl shadow-primary/25 transition-all hover:scale-[1.02] group"
            >
              <Link href={user ? "/generate" : "/login?mode=signup"}>
                {user ? "Generate Today's Workout" : "Claim Your Free Trial"}
                <Dumbbell className="ml-2 h-5 w-5 transition-transform group-hover:scale-110" />
              </Link>
            </Button>
          )}
        </div>

        {/* Social Proof Trust Bar */}
        <div className="mt-24 pt-8 border-t border-border/40">
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span className="font-bold">10K+ ATHLETES</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-current" />
              <span className="font-bold">4.9/5 RATING</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              <span className="font-bold">SENTRY MONITORED</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
