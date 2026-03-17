"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { User } from "firebase/auth";

interface FinalCTASectionProps {
  user: User | null;
}

export function FinalCTASection({ user }: FinalCTASectionProps) {
  return (
    <section className="relative py-24 bg-gradient-to-br from-primary to-complementary overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.15),transparent_70%)]" />
      <div className="container mx-auto px-4 relative text-center">
        <h2 className="text-4xl font-extrabold text-white sm:text-6xl mb-8">
          {user ? "Ready for today’s workout?" : "Ready to Rewrite Your Story?"}
        </h2>
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            size="lg"
            className="bg-white text-primary hover:bg-white/90 h-16 px-12 rounded-full text-xl font-bold shadow-2xl transition-transform hover:scale-105"
            asChild
          >
            <Link href={user ? "/generate" : "/login"}>
              {user ? "Generate Workout" : "Start Your Journey Now"}
            </Link>
          </Button>
          {user && (
            <Button
              size="lg"
              variant="outline"
              className="h-16 px-12 rounded-full text-xl font-bold border-white/50 text-white hover:bg-white/10"
              asChild
            >
              <Link href="/daily-checkin">Daily Check-In</Link>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
