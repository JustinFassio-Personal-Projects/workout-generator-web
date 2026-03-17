"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dumbbell,
  ChefHat,
  BarChart3,
  CheckCircle2,
  UserCog,
} from "lucide-react";
import type { User } from "firebase/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface FeaturesSectionProps {
  user: User | null;
}

export function FeaturesSection({ user }: FeaturesSectionProps) {
  return (
    <section id="features" className="py-24 sm:py-32 bg-muted/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16 max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            {user ? "Your Training " : "Intelligence in Every"}{" "}
            <span className="bg-gradient-to-r from-tertiary to-complementary bg-clip-text text-transparent">
              {user ? "Toolkit" : "Repetition"}
            </span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {user
              ? "Jump back in — daily context + generation + progress, all in one place."
              : "Our ecosystem combines cutting-edge AI with expert sports science."}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Feature */}
          <Card className="md:col-span-2 md:row-span-2 relative overflow-hidden border-2 bg-card/50 backdrop-blur-md border-glow">
            <CardHeader className="p-8">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                <Dumbbell className="h-7 w-7" />
              </div>
              <CardTitle className="text-3xl">AI Trainer Pro</CardTitle>
              <CardDescription className="text-lg mt-2 leading-relaxed">
                Custom workouts that evolve with you. Our Genkit engine analyzes
                your performance to optimize every set.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  "Dynamic Intensity Adjustment",
                  "Progressive Overload Logic",
                  "Form Guidance Library",
                  "Real-time Session Logging",
                ].map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-3 text-muted-foreground"
                  >
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{f}</span>
                  </li>
                ))}
              </ul>

              {user && (
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button asChild className="rounded-full">
                    <Link href="/generate">Generate Workout</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-full">
                    <Link href="/daily-checkin">Daily Check-In</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Secondary Feature 1 */}
          <Card className="border-2 bg-card/50 backdrop-blur-md">
            <CardHeader className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-complementary/10 text-complementary">
                <ChefHat className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">AI Chef</CardTitle>
              <CardDescription>
                Macro-balanced recipes tailored to your palate.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Secondary Feature 2 */}
          <Card className="border-2 bg-card/50 backdrop-blur-md">
            <CardHeader className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-tertiary/10 text-tertiary">
                <BarChart3 className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl">Analytics</CardTitle>
              <CardDescription>
                Deep insights into your strength and volume trends.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Secondary Feature 3 - Equipment Locker */}
          <Link href="/equipment">
            <Card className="border-2 bg-card/50 backdrop-blur-md cursor-pointer transition-all hover:shadow-lg hover:border-primary/50">
              <CardHeader className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                  <Dumbbell className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">Equipment Locker</CardTitle>
                <CardDescription>
                  Manage your available equipment for personalized workout
                  recommendations.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          {/* Secondary Feature 4 - AI Coach */}
          <Link href="/coach/ai">
            <Card className="border-2 bg-card/50 backdrop-blur-md cursor-pointer transition-all hover:shadow-lg hover:border-primary/50">
              <CardHeader className="p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <UserCog className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">AI Coach</CardTitle>
                <CardDescription>
                  Select and configure your personal AI Coach to guide your
                  fitness journey.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </section>
  );
}
