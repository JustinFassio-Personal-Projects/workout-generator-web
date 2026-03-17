"use client";

import { Dumbbell } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t py-12 bg-muted/30">
      <div className="container mx-auto px-4 text-center text-muted-foreground">
        <div className="flex justify-center items-center gap-2 mb-4">
          <div className="h-6 w-6 rounded-lg bg-primary flex items-center justify-center">
            <Dumbbell className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground">
            AI Workout Generator
          </span>
        </div>
        <p className="text-sm">
          © {new Date().getFullYear()} AI Workout Generator. Built for the
          modern athlete.
        </p>
      </div>
    </footer>
  );
}
