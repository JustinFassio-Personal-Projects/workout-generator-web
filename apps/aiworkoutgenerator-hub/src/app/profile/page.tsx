"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUser } from "@/lib/auth";
import { AppPageHeader } from "@/components/app";
import { useOnboardingStatus } from "@/hooks/useUserProfile";
import { useReplayWorkoutDetailsTour } from "@/hooks/useReplayWorkoutDetailsTour";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ProfileDetailsForm } from "@/components/profile/ProfileDetailsForm";
import { ProfileWaiverView } from "@/components/profile/ProfileWaiverView";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProfilePage() {
  const { user, loading: authLoading } = useUser();
  const {
    completed,
    loading: profileLoading,
    updateProfile,
  } = useOnboardingStatus();
  const { busy: replayBusy, replay: replayWorkoutDetailsTour } =
    useReplayWorkoutDetailsTour(updateProfile);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (!profileLoading && !completed) {
      router.push("/onboarding");
    }
  }, [user, authLoading, completed, profileLoading, router]);

  if (authLoading || profileLoading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!user || !completed) {
    return null; // Redirect will happen
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl px-4">
      <AppPageHeader backHref="/dashboard" backLabel="Back to Dashboard" />
      <div className="space-y-6">
        {/* Header with navigation */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Profile</h1>
            <p className="text-muted-foreground mt-2">
              Manage your profile information, preferences, and equipment.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/equipment">Equipment</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Workout editor tour</CardTitle>
            <CardDescription>
              Replay the guided tour that appears when you edit a workout on
              desktop. You can also use{" "}
              <span className="font-medium text-foreground">
                Replay guided tour
              </span>{" "}
              at the top of any workout&apos;s edit page.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="secondary"
              disabled={replayBusy}
              onClick={() => void replayWorkoutDetailsTour("profile_manual")}
            >
              {replayBusy ? "Resetting…" : "Replay tour"}
            </Button>
            <Button
              variant="link"
              className="h-auto p-0 text-muted-foreground"
              asChild
            >
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="waiver">Waiver</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <ProfileForm />
          </TabsContent>

          <TabsContent value="details" className="mt-6">
            <ProfileDetailsForm />
          </TabsContent>

          <TabsContent value="waiver" className="mt-6">
            <ProfileWaiverView userId={user.uid} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
