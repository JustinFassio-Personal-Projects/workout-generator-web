"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StepHeader } from "./StepHeader";
import { SupportWizard } from "./SupportWizard";
import { SubmitSuccess } from "./SubmitSuccess";
import { CoachUpsellCard } from "./CoachUpsellCard";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useUser } from "@/lib/auth";
import { useSubscription } from "@/hooks/useSubscription";
import {
  collectSupportContext,
  detectDeviceType,
  extractUTMParams,
  extractWorkoutContext,
} from "@/lib/support-utils";
import { trackSupportOpened, trackSupportSubmitted } from "@/lib/analytics";
import type {
  CreateSupportTicketRequest,
  CreateSupportTicketResponse,
  SupportRequestType,
  SupportImpact,
} from "@/types/support";
import {
  SUPPORT_CENTER_COPY,
  SUPPORT_TYPE_OPTIONS,
} from "@/lib/support-constants";
import { toast } from "sonner";

// ============================================
// Types
// ============================================

interface SupportCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType?: SupportRequestType;
  initialWorkoutId?: string;
}

// ============================================
// Component
// ============================================

export function SupportCenter({
  open,
  onOpenChange,
  initialType,
  initialWorkoutId,
}: SupportCenterProps) {
  const isMobile = useIsMobile();
  const { user } = useUser();
  const subscription = useSubscription();
  interface FormDataState {
    type?: SupportRequestType;
    impact?: SupportImpact;
    workoutFeedback?: import("@/types/support").WorkoutFeedbackData;
    bugReport?: import("@/types/support").BugReportData;
    billing?: import("@/types/support").BillingData;
    feature?: import("@/types/support").FeatureIdeaData;
    coaching?: import("@/types/support").CoachingData;
    question?: import("@/types/support").QuestionData;
  }

  const [formData, setFormData] = useState<FormDataState>({
    type: initialType,
    workoutFeedback: initialWorkoutId ? { workoutId: initialWorkoutId } : {},
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showCoachUpsell, setShowCoachUpsell] = useState(false);
  const workoutContextRef = useRef<ReturnType<
    typeof extractWorkoutContext
  > | null>(null);

  // Track when dialog opens
  useEffect(() => {
    if (open) {
      trackSupportOpened();
    }
  }, [open]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        type: initialType,
        workoutFeedback: initialWorkoutId
          ? { workoutId: initialWorkoutId }
          : {},
      });
      setSubmitted(false);
      setShowCoachUpsell(false);
      workoutContextRef.current = null;
    }
  }, [open, initialType, initialWorkoutId]);

  const handleWorkoutContextChange = useCallback(
    (context: ReturnType<typeof extractWorkoutContext> | null) => {
      workoutContextRef.current = context;
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!user || !formData.type || !formData.impact) return;

    setSubmitting(true);

    try {
      // Collect context
      const context = collectSupportContext();
      if (workoutContextRef.current) {
        Object.assign(context, workoutContextRef.current);
      }

      // Use the type selection label as the subject for backend compatibility
      const typeOption = SUPPORT_TYPE_OPTIONS.find(
        (opt) => opt.value === formData.type
      );
      const subject = typeOption?.label || formData.type || "Support Request";

      // Build request based on type
      let request: CreateSupportTicketRequest;

      switch (formData.type) {
        case "workout_feedback":
          request = {
            type: "workout_feedback",
            // Impact is optional for workout_feedback (default to "minor" if not provided)
            impact: formData.impact || "minor",
            user_id: user.uid,
            workoutFeedback: formData.workoutFeedback || {},
            context,
            metadata: {
              source: "website",
              source_url:
                typeof window !== "undefined" ? window.location.href : "",
              device_type: detectDeviceType(),
              subscription_tier: subscription.tier
                ? String(subscription.tier)
                : undefined,
              utm_params: extractUTMParams(),
            },
            website: "", // Honeypot
            subject, // Use type selection label
          };
          break;
        case "bug":
          request = {
            type: "bug",
            impact: formData.impact,
            user_id: user.uid,
            bugReport: formData.bugReport || {
              whatHappened: "",
              stepsToReproduce: "",
              expectedVsActual: "",
            },
            context,
            metadata: {
              source: "website",
              source_url:
                typeof window !== "undefined" ? window.location.href : "",
              device_type: detectDeviceType(),
              subscription_tier: subscription.tier
                ? String(subscription.tier)
                : undefined,
              utm_params: extractUTMParams(),
            },
            website: "",
            subject, // Use type selection label
          };
          break;
        case "billing":
          request = {
            type: "billing",
            impact: formData.impact,
            user_id: user.uid,
            billing: formData.billing || {
              issueType: "upgrade_downgrade",
              description: "",
            },
            context,
            metadata: {
              source: "website",
              source_url:
                typeof window !== "undefined" ? window.location.href : "",
              device_type: detectDeviceType(),
              subscription_tier: subscription.tier
                ? String(subscription.tier)
                : undefined,
              utm_params: extractUTMParams(),
            },
            website: "",
            subject, // Use type selection label
          };
          break;
        case "feature":
          request = {
            type: "feature",
            impact: formData.impact,
            user_id: user.uid,
            feature: formData.feature || { featureName: "", whyHelpful: "" },
            context,
            metadata: {
              source: "website",
              source_url:
                typeof window !== "undefined" ? window.location.href : "",
              device_type: detectDeviceType(),
              subscription_tier: subscription.tier
                ? String(subscription.tier)
                : undefined,
              utm_params: extractUTMParams(),
            },
            website: "",
            subject, // Use type selection label
          };
          break;
        case "coaching":
          request = {
            type: "coaching",
            impact: formData.impact,
            user_id: user.uid,
            coaching: formData.coaching || {
              whatNeedHelpWith: "",
              currentChallenges: "",
            },
            context,
            metadata: {
              source: "website",
              source_url:
                typeof window !== "undefined" ? window.location.href : "",
              device_type: detectDeviceType(),
              subscription_tier: subscription.tier
                ? String(subscription.tier)
                : undefined,
              utm_params: extractUTMParams(),
            },
            website: "",
            subject, // Use type selection label
          };
          break;
        case "question":
          request = {
            type: "question",
            impact: formData.impact,
            user_id: user.uid,
            question: formData.question || { topic: "", question: "" },
            context,
            metadata: {
              source: "website",
              source_url:
                typeof window !== "undefined" ? window.location.href : "",
              device_type: detectDeviceType(),
              subscription_tier: subscription.tier
                ? String(subscription.tier)
                : undefined,
              utm_params: extractUTMParams(),
            },
            website: "",
            subject, // Use type selection label
          };
          break;
        default:
          throw new Error("Invalid support request type");
      }

      // Log request for debugging (development only)
      if (process.env.NODE_ENV === "development") {
        console.log("Submitting support request:", {
          type: request.type,
          impact: request.impact,
          hasSubject: !!request.subject,
          subject: request.subject,
          hasWorkoutFeedback:
            request.type === "workout_feedback"
              ? !!request.workoutFeedback
              : false,
          hasBugReport: request.type === "bug" ? !!request.bugReport : false,
          hasBilling: request.type === "billing" ? !!request.billing : false,
          hasFeature: request.type === "feature" ? !!request.feature : false,
          hasCoaching: request.type === "coaching" ? !!request.coaching : false,
          hasQuestion: request.type === "question" ? !!request.question : false,
        });
      }

      const response = await fetch("/api/support/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      let result: CreateSupportTicketResponse;
      let responseText: string = "";

      try {
        responseText = await response.text();
        if (!responseText || responseText.trim() === "") {
          console.error("Empty response from server", {
            status: response.status,
            statusText: response.statusText,
          });
          toast.error("Failed to submit", {
            description: "Empty response from server. Please try again.",
            duration: 5000,
          });
          return;
        }
        result = JSON.parse(responseText);
      } catch (jsonError) {
        console.error("Failed to parse response JSON:", {
          error: jsonError,
          responseText: responseText || "Could not read response",
          status: response.status,
          statusText: response.statusText,
        });
        toast.error("Failed to submit", {
          description: "Invalid response from server. Please try again.",
          duration: 5000,
        });
        return;
      }

      if (!response.ok) {
        // Log the full error for debugging - use separate console.error calls to avoid serialization issues
        console.error("=== Support submission error ===");
        console.error("Status:", response.status);
        console.error("Status text:", response.statusText);
        console.error("Response text length:", responseText?.length || 0);
        console.error(
          "Response text (first 500 chars):",
          responseText?.substring(0, 500) || "empty"
        );
        console.error("Parsed result:", result);
        console.error("Result type:", typeof result);
        console.error(
          "Result keys:",
          result ? Object.keys(result) : "null/undefined"
        );
        console.error("Result error field:", result?.error);
        console.error("Result success field:", result?.success);
        console.error("Request subject:", request.subject);
        console.error("Request type:", request.type);
        console.error("Request keys:", Object.keys(request));

        // Handle rate limiting
        if (result?.retryAfter) {
          const minutes = Math.ceil(result.retryAfter / 60);
          const seconds = result.retryAfter % 60;
          let timeMessage = "";
          if (minutes > 0) {
            timeMessage = `${minutes} minute${minutes !== 1 ? "s" : ""}`;
            if (seconds > 0) {
              timeMessage += ` and ${seconds} second${seconds !== 1 ? "s" : ""}`;
            }
          } else {
            timeMessage = `${seconds} second${seconds !== 1 ? "s" : ""}`;
          }
          toast.error("Rate limit exceeded", {
            description: `You've reached the limit. Please try again in ${timeMessage}.`,
            duration: 8000,
          });
        } else {
          // Extract error message from result
          let errorMessage = "An error occurred. Please try again.";

          if (result?.error) {
            errorMessage = result.error;
          } else if (typeof result === "string") {
            errorMessage = result;
          } else {
            // Try to extract error from raw response text
            // responseText is guaranteed to be non-empty here (checked earlier)
            try {
              const parsed = JSON.parse(responseText);
              errorMessage = parsed.error || parsed.message || errorMessage;
            } catch {
              // If not JSON, use the response text itself (truncated)
              errorMessage =
                responseText.length > 200
                  ? `${responseText.substring(0, 200)}...`
                  : responseText;
            }
          }

          // Filter out subject-related errors since we're providing it
          const isSubjectError = errorMessage.toLowerCase().includes("subject");

          if (isSubjectError) {
            console.error(
              "Subject error from backend - this should not happen:",
              {
                subject: request.subject,
                type: request.type,
                errorMessage,
                fullRequest: request,
              }
            );
            toast.error("Backend configuration error", {
              description:
                "The support system is misconfigured. Please contact support directly.",
              duration: 8000,
            });
          } else {
            toast.error("Failed to submit", {
              description: errorMessage,
              duration: 5000,
            });
          }
        }
        return;
      }

      // Success
      trackSupportSubmitted(
        formData.type,
        formData.impact ||
          (formData.type === "workout_feedback" ? "minor" : undefined),
        subscription.tier || undefined
      );

      setSubmitted(true);

      // Show coach upsell for workout feedback or coaching requests
      // This provides a natural upsell opportunity after users submit feedback
      if (
        formData.type === "workout_feedback" ||
        formData.type === "coaching"
      ) {
        setShowCoachUpsell(true);
      }

      toast.success("Submitted successfully!", {
        description: "We'll get back to you soon.",
        duration: 3000,
      });
    } catch (error) {
      toast.error("Failed to submit", {
        description:
          error instanceof Error
            ? error.message
            : "Network error. Please try again.",
        duration: 5000,
      });
    } finally {
      setSubmitting(false);
    }
  }, [user, formData, subscription.tier]);

  const handleCoachUpsellSeeOptions = () => {
    // Navigate to coach page
    window.location.href = "/coach";
  };

  const handleCoachUpsellDismiss = () => {
    setShowCoachUpsell(false);
  };

  const content = (
    <div className="space-y-6">
      {!submitted ? (
        <>
          <StepHeader />
          <SupportWizard
            initialType={initialType}
            initialWorkoutId={initialWorkoutId}
            formData={formData}
            onFormDataChange={setFormData}
            onSubmit={handleSubmit}
            disabled={submitting}
            onWorkoutContextChange={handleWorkoutContextChange}
          />
        </>
      ) : (
        <>
          <SubmitSuccess
            email={user?.email || undefined}
            followUpOk={
              formData.type === "workout_feedback" &&
              formData.workoutFeedback?.followUpOk
            }
          />
          {showCoachUpsell && (
            <CoachUpsellCard
              onSeeOptions={handleCoachUpsellSeeOptions}
              onDismiss={handleCoachUpsellDismiss}
            />
          )}
        </>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[92vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{SUPPORT_CENTER_COPY.title}</SheetTitle>
            <SheetDescription>{SUPPORT_CENTER_COPY.subhead}</SheetDescription>
          </SheetHeader>
          <div className="mt-4">{content}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{SUPPORT_CENTER_COPY.title}</DialogTitle>
          <DialogDescription>{SUPPORT_CENTER_COPY.subhead}</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
