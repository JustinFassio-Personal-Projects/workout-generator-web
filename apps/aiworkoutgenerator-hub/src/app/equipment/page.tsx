"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useUser } from "@/lib/auth";
import { AppPageHeader } from "@/components/app";
import { useOnboardingStatus } from "@/hooks/useUserProfile";
import { ProfileService } from "@/services/profile/ProfileService";
import { EquipmentSelector } from "@/components/shared/EquipmentSelector";
import { Button } from "@/components/ui/button";
import type { FitnessLevel } from "@/types/firestore";

export default function EquipmentPage() {
  const { user, loading: authLoading } = useUser();
  const { completed, loading: profileLoading } = useOnboardingStatus();
  const router = useRouter();

  const [equipmentCategories, setEquipmentCategories] = useState<string[]>([]);
  const [availableEquipment, setAvailableEquipment] = useState<string[]>([]);
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel | undefined>(
    undefined
  );
  const [profileLoadingState, setProfileLoadingState] = useState(true);
  const [saving, setSaving] = useState(false);

  // Store original values to detect changes
  const [originalCategories, setOriginalCategories] = useState<string[]>([]);
  const [originalEquipment, setOriginalEquipment] = useState<string[]>([]);

  // Redirect if not authenticated or onboarding not completed
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (!profileLoading && !completed) {
      router.push("/onboarding");
    }
  }, [user, authLoading, completed, profileLoading, router]);

  // Load user profile equipment selections
  useEffect(() => {
    if (!user || authLoading || profileLoading) {
      return;
    }

    let active = true;
    setProfileLoadingState(true);

    (async () => {
      try {
        const profile = await ProfileService.getUserProfile(user.uid);
        if (!active) return;

        if (profile) {
          // Ensure equipment_access is always an array (handle legacy string values)
          const categories = Array.isArray(profile.equipment_access)
            ? profile.equipment_access
            : [];
          const equipment = Array.isArray(profile.available_equipment)
            ? profile.available_equipment
            : [];

          setEquipmentCategories(categories);
          setAvailableEquipment(equipment);
          setOriginalCategories([...categories]);
          setOriginalEquipment([...equipment]);
          setFitnessLevel(profile.fitness_level);
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
        if (active) {
          toast.error("Failed to load equipment", {
            description:
              "Could not load your equipment selections. Please try again.",
            duration: 5000,
          });
        }
      } finally {
        if (active) {
          setProfileLoadingState(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [user, authLoading, profileLoading]);

  // Calculate if there are changes by comparing arrays
  const hasChanges = (() => {
    if (profileLoadingState) return false;

    // Compare categories (order-independent)
    const categoriesChanged =
      equipmentCategories.length !== originalCategories.length ||
      !equipmentCategories.every((cat) => originalCategories.includes(cat)) ||
      !originalCategories.every((cat) => equipmentCategories.includes(cat));

    // Compare equipment (order-independent)
    const equipmentChanged =
      availableEquipment.length !== originalEquipment.length ||
      !availableEquipment.every((eq) => originalEquipment.includes(eq)) ||
      !originalEquipment.every((eq) => availableEquipment.includes(eq));

    return categoriesChanged || equipmentChanged;
  })();

  const handleSave = async () => {
    if (!user) {
      toast.error("Not authenticated", {
        description: "Please log in to save your equipment selections.",
        duration: 5000,
      });
      return;
    }

    setSaving(true);
    try {
      await ProfileService.updateUserProfile(user.uid, {
        equipment_access: equipmentCategories,
        available_equipment: availableEquipment,
      });

      // Update original values after successful save
      setOriginalCategories([...equipmentCategories]);
      setOriginalEquipment([...availableEquipment]);

      toast.success("Equipment saved", {
        description:
          "Your equipment selections have been updated successfully.",
        duration: 3000,
      });
    } catch (error) {
      console.error("Failed to save equipment:", error);
      toast.error("Failed to save equipment", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please try again.",
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCategoriesChange = (categories: string[]) => {
    setEquipmentCategories(categories);
  };

  const handleEquipmentChange = (equipment: string[]) => {
    setAvailableEquipment(equipment);
  };

  // Loading states
  if (authLoading || profileLoading || profileLoadingState) {
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
      <AppPageHeader backHref="/dashboard" backLabel="Back to Dashboard" />
      <div className="space-y-6">
        {/* Header with navigation */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Equipment Locker</h1>
            <p className="text-muted-foreground mt-2">
              Manage your available equipment and categories to get personalized
              workout recommendations.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/profile">Profile</Link>
          </Button>
        </div>

        <EquipmentSelector
          equipmentCategories={equipmentCategories}
          availableEquipment={availableEquipment}
          onEquipmentCategoriesChange={handleCategoriesChange}
          onAvailableEquipmentChange={handleEquipmentChange}
          showTitle={true}
          fitnessLevel={fitnessLevel}
        />

        <div className="flex items-center justify-end pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="min-w-[120px]"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
