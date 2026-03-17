"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, UserCog, CheckCircle2, Home } from "lucide-react";
import { useUser } from "@/lib/auth";
import { useOnboardingStatus, useUserProfile } from "@/hooks/useUserProfile";
import { ProfileService } from "@/services/profile/ProfileService";
import { useTrainers } from "@/hooks/useTrainers";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AICoachOption {
  id: string;
  name: string;
  description: string;
  specialty: string;
}

export default function AICoachPage() {
  const { user, loading: authLoading } = useUser();
  const { completed, loading: profileLoading } = useOnboardingStatus();
  const { profile } = useUserProfile();
  const { trainers, loading: trainersLoading } = useTrainers();
  const router = useRouter();

  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Map trainers from database to AICoachOption format
  const aiCoachOptions = useMemo<AICoachOption[]>(() => {
    return trainers.map((trainer) => {
      const primaryFocus = trainer.focuses.find((f) => f.isPrimary);
      const specialty =
        primaryFocus?.name || trainer.tagline || "General Fitness";

      return {
        id: trainer.id,
        name: trainer.name,
        description: trainer.description || trainer.tagline,
        specialty,
      };
    });
  }, [trainers]);

  // Redirect if not authenticated or onboarding not completed
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (!profileLoading && !completed) {
      router.push("/onboarding");
    }
  }, [user, authLoading, completed, profileLoading, router]);

  // Load current AI coach selection
  useEffect(() => {
    if (!user || authLoading || profileLoading) {
      return;
    }

    // Set loading to false once profile loading completes, even if profile is null
    // This prevents the page from being stuck in loading state
    const currentCoach = profile?.selected_ai_coach || null;
    setSelectedCoachId(currentCoach);
    setLoading(false);
  }, [user, authLoading, profileLoading, profile]);

  const handleSelectCoach = useCallback(
    async (coachId: string) => {
      if (!user) {
        toast.error("Not authenticated", {
          description: "Please log in to select an AI Coach.",
          duration: 5000,
        });
        return;
      }

      // If already selected, don't save again
      if (selectedCoachId === coachId) {
        return;
      }

      setSaving(true);
      try {
        await ProfileService.updateUserProfile(user.uid, {
          selected_ai_coach: coachId,
        });

        setSelectedCoachId(coachId);
        const selectedCoach = aiCoachOptions.find((c) => c.id === coachId);
        toast.success("AI Coach selected", {
          description: `You've selected ${selectedCoach?.name || "your coach"}. Your workouts will now be personalized by this coach.`,
          duration: 3000,
        });
      } catch (error) {
        logger.error("Failed to save AI Coach selection", error, {
          coachId,
          userId: user.uid,
        });
        toast.error("Failed to save selection", {
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred. Please try again.",
          duration: 5000,
        });
      } finally {
        setSaving(false);
      }
    },
    [user, selectedCoachId, aiCoachOptions]
  );

  // Loading states
  if (authLoading || profileLoading || loading || trainersLoading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  // Redirect will happen
  if (!user || !completed) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl px-4">
      <div className="space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">AI Coach</h1>
            <p className="text-muted-foreground mt-2">
              Select and configure your personal AI Coach to guide your fitness
              journey. Your coach will personalize workouts based on your
              preferences and goals.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Link>
          </Button>
        </div>

        {/* Coach Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aiCoachOptions.length === 0 ? (
            <div className="col-span-2 text-center py-8">
              <p className="text-muted-foreground mb-4">
                No coaches available. Please check back later.
              </p>
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => router.push("/dashboard")}
                >
                  Return to Dashboard
                </Button>
              </div>
            </div>
          ) : (
            aiCoachOptions.map((coach) => {
              const isSelected = selectedCoachId === coach.id;
              return (
                <Card
                  key={coach.id}
                  className={`relative border-2 transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-lg"
                      : "border-border hover:border-primary/50 hover:shadow-md"
                  }`}
                  onClick={() => !saving && handleSelectCoach(coach.id)}
                >
                  {isSelected && (
                    <div className="absolute top-4 right-4">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                  <CardHeader className="p-6">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <UserCog className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-xl">{coach.name}</CardTitle>
                    <CardDescription className="text-sm font-medium text-primary/80 mt-1">
                      {coach.specialty}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <p className="text-sm text-muted-foreground">
                      {coach.description}
                    </p>
                    {isSelected && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs font-medium text-primary">
                          Currently Selected
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {selectedCoachId && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm text-muted-foreground">
              Your selected AI Coach will personalize your workout generation
              and provide guidance tailored to your fitness goals.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
