"use client";

import { useUser } from "@/lib/auth";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { FeatureFAQSection } from "@/components/landing/FeatureFAQSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { useSubscription } from "@/hooks/useSubscription";

export default function Home() {
  const { user, loading } = useUser();
  const { isSubscriber, loading: subLoading } = useSubscription();
  const showPricing = !user || subLoading ? true : !isSubscriber;

  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/10 selection:text-primary overflow-x-hidden">
      <LandingHeader user={user} loading={loading} showPricing={showPricing} />

      <main className="flex-1">
        <HeroSection user={user} />
        <FeaturesSection user={user} />
        <FeatureFAQSection user={user} />
        <HowItWorksSection user={user} />
        {showPricing && <PricingSection user={user} />}
        <FinalCTASection user={user} />
      </main>

      <LandingFooter />
    </div>
  );
}
