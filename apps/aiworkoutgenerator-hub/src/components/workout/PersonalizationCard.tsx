"use client";

import { User, Sliders } from "lucide-react";
import type { PersonalizationItem } from "@/types/firestore";

interface PersonalizationCardProps {
  personalization: PersonalizationItem[];
}

export function PersonalizationCard({
  personalization,
}: PersonalizationCardProps) {
  if (!personalization || personalization.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 mb-8 bg-gradient-to-br from-card to-card border border-primary/20 rounded-2xl overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <Sliders className="w-32 h-32 text-primary" />
      </div>

      <div className="p-6 md:p-8 relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-primary/10 p-3 rounded-xl">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">
              Personalized For You
            </h3>
            <p className="text-muted-foreground text-sm">
              How we adapted this workout to your profile
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {personalization.map((item, idx) => (
            <div
              key={idx}
              className="bg-muted/50 border border-border/50 p-4 rounded-xl"
            >
              <div className="text-xs font-bold text-primary uppercase tracking-wider mb-1 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                {item.attribute}
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {item.adjustment}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
