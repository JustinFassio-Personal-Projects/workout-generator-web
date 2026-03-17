"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2 } from "lucide-react";

// ============================================
// Types
// ============================================

export interface CoachTierCardProps {
  id: string;
  name: string;
  price: string;
  features: string[];
  cta: string;
  popular?: boolean;
  imagePlaceholder?: string;
  onSubscribe: (tierId: string) => void;
}

// ============================================
// Component
// ============================================

export function CoachTierCard({
  id,
  name,
  price,
  features,
  cta,
  popular = false,
  imagePlaceholder,
  onSubscribe,
}: CoachTierCardProps) {
  return (
    <Card
      className={`relative flex flex-col border-2 transition-all duration-300 hover:shadow-2xl ${
        popular
          ? "border-complementary shadow-xl scale-105"
          : "border-border/50"
      }`}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-complementary px-4 py-1 text-xs font-bold text-complementary-foreground">
          MOST POPULAR
        </div>
      )}

      {/* Landscape Image */}
      {imagePlaceholder && (
        <div className="relative w-full h-48 overflow-hidden rounded-t-lg">
          {/* Placeholder for landscape image */}
          <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/20 to-complementary/30 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary/40">{name}</span>
          </div>
          {/* Uncomment when images are available:
          <Image
            src={imagePlaceholder}
            alt={`${name} coaching`}
            fill
            className="object-cover"
          />
          */}
        </div>
      )}

      <CardHeader className="p-8">
        <CardTitle className="text-2xl">{name}</CardTitle>
        <div className="mt-4 flex items-baseline justify-center gap-1">
          <span className="text-5xl font-bold">${price}</span>
          <span className="text-muted-foreground">/mo</span>
        </div>
      </CardHeader>

      <CardContent className="p-8 pt-0 flex-1 flex flex-col">
        <Separator className="mb-8" />
        <ul className="space-y-4 mb-8 flex-1">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-center justify-center gap-3 text-sm font-medium"
            >
              <CheckCircle2 className="h-4 w-4 text-primary" />
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter className="p-8 pt-0">
        <Button
          variant={popular ? "default" : "outline"}
          className="w-full rounded-full h-12 font-bold"
          onClick={() => onSubscribe(id)}
        >
          {cta}
        </Button>
      </CardFooter>
    </Card>
  );
}
