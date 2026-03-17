"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUser } from "@/lib/auth";

// ============================================
// Coach Tier Data
// ============================================

const coachTiers = [
  {
    id: "coach",
    name: "Coach",
    price: "99",
    features: ["Live Classes", "1-on-1 Coaching", "Program Design"],
    cta: "Start with Coach",
    popular: false,
    imagePlaceholder:
      "/images/coach/san_diego_core_fitness_mb_coach-justin.jpeg",
  },
  {
    id: "coach_pro",
    name: "Coach Pro",
    price: "199",
    features: ["2x Coaching Sessions", "Nutrition Design", "Priority Support"],
    cta: "Upgrade to Coach Pro",
    popular: true,
    imagePlaceholder:
      "/images/coach/coach_justin_profile_one_on_one_training.png",
  },
];

// ============================================
// Component
// ============================================

export default function CoachPage() {
  const router = useRouter();
  const { user } = useUser();

  const handleSubscribe = (tierId: string) => {
    if (!user) {
      router.push(`/login?redirect=/coach`);
      return;
    }
    router.push(`/pricing#tier-${tierId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-7xl">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Hero Section */}
        <section className="mb-16">
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12">
            {/* Portrait Image */}
            <div className="flex-shrink-0">
              <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-full overflow-hidden border-4 border-primary/20 shadow-lg">
                <Image
                  src="/images/coach/coach_justin_profile_San_Diego.JPG"
                  alt="Justin Fassio"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>

            {/* Bio Content */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Work with <span className="text-primary">Justin Fassio</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-6">
                Training people since 1996. Real-world coaching experience from
                military units to fitness businesses.
              </p>

              {/* Credentials */}
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">
                      TACP (Tactical Air Control Party)
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Fitness became readiness
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">
                      MFT/UFPM at Fort Hood (3rd ASOG)
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Built safe, scalable training systems
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">San Diego Core Fitness</p>
                    <p className="text-sm text-muted-foreground">
                      Real-world training lab
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">GymGo + FitNimbus</p>
                    <p className="text-sm text-muted-foreground">
                      Fitness tech infrastructure
                    </p>
                  </div>
                </div>
              </div>

              {/* Trust Statement */}
              <p className="text-lg font-medium text-foreground italic">
                &ldquo;The best training is what people can sustain.&rdquo;
              </p>
            </div>
          </div>
        </section>

        {/* Coach Tier Cards */}
        <section>
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Choose Your <span className="text-primary">Coaching Plan</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get hands-on help with progression, feedback, and accountability.
              All coaching is delivered by Justin.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {coachTiers.map((tier) => (
              <Card
                key={tier.id}
                className={`relative flex flex-col border-2 transition-all duration-300 hover:shadow-2xl ${
                  tier.popular
                    ? "border-complementary shadow-xl scale-105"
                    : "border-border/50"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-complementary px-4 py-1 text-xs font-bold text-complementary-foreground">
                    MOST POPULAR
                  </div>
                )}

                {/* Landscape Image */}
                <div className="relative w-full aspect-video overflow-hidden rounded-t-lg">
                  {tier.imagePlaceholder ? (
                    <>
                      <Image
                        src={tier.imagePlaceholder}
                        alt={`${tier.name} coaching`}
                        fill
                        className="object-cover"
                        style={{
                          objectPosition:
                            tier.id === "coach_pro"
                              ? "center top"
                              : "center bottom",
                        }}
                      />
                      {/* Tier name overlay text */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-4xl md:text-5xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                          {tier.name}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/20 to-complementary/30 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary/40">
                        {tier.name}
                      </span>
                    </div>
                  )}
                </div>

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
                    {tier.features.map((feature) => (
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
                    variant={tier.popular ? "default" : "outline"}
                    className="w-full rounded-full h-12 font-bold"
                    onClick={() => handleSubscribe(tier.id)}
                  >
                    {tier.cta}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        {/* Additional Info */}
        <section className="mt-16 text-center">
          <p className="text-sm text-muted-foreground mb-2">
            All coaching plans include a 7-day free trial. Cancel anytime.
          </p>
          <p className="text-sm text-muted-foreground">
            Want to learn more about Justin?{" "}
            <Link
              href="/founder-story"
              className="text-primary underline hover:text-primary/80"
            >
              Read his full story
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
