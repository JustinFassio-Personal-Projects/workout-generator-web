"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2 } from "lucide-react";
import type { User } from "firebase/auth";

interface PricingTier {
  name: string;
  price: string;
  features: string[];
  cta: string;
  popular: boolean;
}

const pricingTiers: (PricingTier & { id: string })[] = [
  {
    name: "Starter",
    price: "5.99",
    features: ["10 Workouts/mo", "Limited Tracking"],
    cta: "Get Started",
    popular: false,
    id: "basic",
  },
  {
    name: "Pro",
    price: "19",
    features: ["Unlimited Workouts", "AI Nutritionist", "Full Analytics"],
    cta: "Unlock Pro",
    popular: false,
    id: "pro",
  },
  {
    name: "Elite",
    price: "49",
    features: ["Unlimited Workouts", "Priority Support", "Full Analytics"],
    cta: "Go Elite",
    popular: false,
    id: "elite",
  },
  {
    name: "Coach",
    price: "99",
    features: ["Live Classes", "1-on-1 Coaching", "Program Design"],
    cta: "Work with a Coach",
    popular: false,
    id: "coach",
  },
  {
    name: "Coach Pro",
    price: "199",
    features: ["2x Coaching Sessions", "Nutrition Design", "Priority Support"],
    cta: "Upgrade to Coach Pro",
    popular: true,
    id: "coach_pro",
  },
];

interface PricingSectionProps {
  user: User | null;
}

export function PricingSection({ user }: PricingSectionProps) {
  const title = user ? "Upgrade when you're ready" : "Plans for Every Ambition";
  const subtitle = user
    ? "You're signed in — billing is coming soon. For now, keep generating workouts and refining your profile."
    : null;

  // Split title at last space, handling single-word titles
  const lastSpaceIndex = title.lastIndexOf(" ");
  const titleFirstPart =
    lastSpaceIndex === -1 ? "" : title.substring(0, lastSpaceIndex);
  const titleLastWord =
    lastSpaceIndex === -1 ? title : title.substring(lastSpaceIndex + 1);

  return (
    <section id="pricing" className="py-24 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl mb-6">
          {titleFirstPart && `${titleFirstPart} `}
          <span className="text-primary">{titleLastWord}</span>
        </h2>
        {subtitle && (
          <p className="text-muted-foreground max-w-2xl mx-auto mb-12">
            {subtitle}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8 max-w-7xl mx-auto">
          {pricingTiers.map((tier) => (
            <Card
              key={tier.name}
              className={`relative flex flex-col border-2 transition-all duration-300 hover:shadow-2xl ${tier.popular ? "border-complementary shadow-xl scale-105" : "border-border/50"}`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-complementary px-4 py-1 text-xs font-bold text-complementary-foreground">
                  MOST POPULAR
                </div>
              )}
              <CardHeader className="p-8">
                <CardTitle className="text-2xl">{tier.name}</CardTitle>
                <div className="mt-4 flex items-baseline justify-center gap-1">
                  <span className="text-5xl font-bold">${tier.price}</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-0 flex-1 flex flex-col">
                <Separator className="mb-8" />
                <ul className="space-y-4 mb-8 flex-1">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center justify-center gap-3 text-sm font-medium"
                    >
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={tier.popular ? "default" : "outline"}
                  className="w-full rounded-full h-12 font-bold"
                  asChild
                >
                  <Link
                    href={
                      user
                        ? `/pricing#tier-${tier.id}`
                        : `/signup?plan=${tier.id}`
                    }
                  >
                    {tier.cta}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
