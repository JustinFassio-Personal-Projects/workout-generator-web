"use client";

import { useState, useEffect, useRef } from "react";
import type { User } from "firebase/auth";
import { AlertCircle, CheckCircle2, ScrollText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WaiverService } from "@/services/waiver";
import {
  DEFAULT_WAIVER_TEXT,
  WAIVER_CHECKBOX_SECTIONS,
} from "@/lib/waiver/default-waiver-text";
import { calculateVersionHashClient } from "@/lib/waiver/calculateVersionHash";
import type { WaiverAgreementCheckboxes } from "@/types/waiver";
import type { LiabilityWaiver } from "@/types/firestore";
import { formatTimestamp } from "@/lib/utils/timestamp";
import { toast } from "sonner";

interface LiabilityWaiverProps {
  waiver?: LiabilityWaiver | null;
  onAgree: () => void | Promise<void>;
  loading?: boolean;
  userFullName?: string; // Pre-fill from user profile if available
  /** Pass to avoid auth.currentUser timing mismatches (parity with map-images) */
  user?: User | null;
}

export function LiabilityWaiver({
  waiver,
  onAgree,
  loading = false,
  userFullName = "",
  user,
}: LiabilityWaiverProps) {
  const [checkboxes, setCheckboxes] = useState<WaiverAgreementCheckboxes>({
    medical_disclaimer: false,
    assumption_of_risk: false,
    release_of_liability: false,
    arbitration: false,
    ai_disclaimer: false,
    full_terms: false,
  });

  const [fullName, setFullName] = useState(userFullName);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Use provided waiver or default text
  const waiverContent = waiver?.content || DEFAULT_WAIVER_TEXT;

  // Monitor scroll position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const scrollableHeight = scrollHeight - clientHeight;
      const currentScroll = scrollTop;
      const progress =
        scrollableHeight > 0
          ? Math.min(100, (currentScroll / scrollableHeight) * 100)
          : 100;

      setScrollProgress(progress);

      // Consider scrolled to bottom if within 50px of bottom (threshold for better UX)
      const threshold = 50;
      setIsScrolledToBottom(
        currentScroll + clientHeight >= scrollHeight - threshold
      );
    };

    container.addEventListener("scroll", handleScroll);
    // Check initial state
    handleScroll();

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [waiverContent]);

  // Check if all requirements are met
  const allCheckboxesChecked = Object.values(checkboxes).every(
    (checked) => checked
  );
  const fullNameValid = fullName.trim().split(/\s+/).length >= 2;
  const canAgree =
    allCheckboxesChecked && fullNameValid && isScrolledToBottom && !submitting;

  const handleCheckboxChange = (
    key: keyof WaiverAgreementCheckboxes,
    checked: boolean
  ) => {
    setCheckboxes((prev) => ({
      ...prev,
      [key]: checked,
    }));
  };

  const handleSubmit = async () => {
    if (!canAgree || !waiver) return;

    setSubmitting(true);
    try {
      // Calculate hash of the waiver content the user is actually agreeing to
      // LEGAL COMPLIANCE: Send the version and hash to ensure agreement is recorded
      // against the exact waiver version the user read, not the "current active" version
      const versionHash = await calculateVersionHashClient(waiverContent);

      await WaiverService.createWaiverAgreement(
        {
          full_name: fullName.trim(),
          agreement_checkboxes: checkboxes,
          waiver_version: waiver.version,
          waiver_version_hash: versionHash,
        },
        { user: user ?? undefined }
      );

      toast.success("Waiver agreement saved successfully");
      await onAgree();
    } catch (error) {
      console.error("Failed to save waiver agreement:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save waiver agreement. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="h-5 w-5" />
          Liability Waiver & Terms of Service
        </CardTitle>
        {waiver && (
          <p className="text-sm text-muted-foreground mt-1">
            Version {waiver.version} • Effective{" "}
            {formatTimestamp(waiver.effective_date)}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scroll Progress Indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Scroll to read full waiver
            </span>
            <span className="text-muted-foreground">
              {Math.round(scrollProgress)}%
            </span>
          </div>
          <Progress value={scrollProgress} className="h-2" />
        </div>

        {/* Scrollable Waiver Text */}
        <div
          ref={scrollContainerRef}
          className="border rounded-lg p-6 bg-muted/30 max-h-[400px] overflow-y-auto text-sm leading-relaxed"
          style={{
            scrollbarWidth: "thin",
          }}
        >
          <div className="whitespace-pre-wrap font-mono text-xs sm:text-sm">
            {waiverContent}
          </div>
        </div>

        {/* Scroll to Bottom Alert */}
        {!isScrolledToBottom && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please scroll to the bottom of the waiver to continue.
            </AlertDescription>
          </Alert>
        )}

        {/* Checkboxes */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="font-semibold text-base">
            Please confirm your agreement to each section:
          </h3>

          {Object.entries(WAIVER_CHECKBOX_SECTIONS).map(([key, section]) => (
            <div key={key} className="flex items-start gap-3">
              <Checkbox
                id={key}
                checked={checkboxes[key as keyof WaiverAgreementCheckboxes]}
                onCheckedChange={(checked) =>
                  handleCheckboxChange(
                    key as keyof WaiverAgreementCheckboxes,
                    checked === true
                  )
                }
                className="mt-1"
              />
              <Label
                htmlFor={key}
                className="text-sm leading-relaxed cursor-pointer flex-1"
              >
                <span className="font-medium text-muted-foreground text-xs block mb-1">
                  {section.section}
                </span>
                {section.label}
              </Label>
            </div>
          ))}
        </div>

        {/* Full Name Input */}
        <div className="space-y-2 border-t pt-6">
          <Label htmlFor="full-name" className="text-base font-semibold">
            Full Name <span className="text-destructive">*</span>
          </Label>
          <p className="text-sm text-muted-foreground">
            Type your full name to sign this agreement
          </p>
          <Input
            id="full-name"
            type="text"
            placeholder="First Last"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="max-w-md"
          />
          {fullName && !fullNameValid && (
            <p className="text-sm text-destructive">
              Please enter your full name (first and last name)
            </p>
          )}
        </div>

        {/* Requirements Status */}
        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center gap-2 text-sm">
            {allCheckboxesChecked ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            )}
            <span
              className={
                allCheckboxesChecked
                  ? "text-green-600"
                  : "text-muted-foreground"
              }
            >
              All sections agreed to
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {fullNameValid ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            )}
            <span
              className={
                fullNameValid ? "text-green-600" : "text-muted-foreground"
              }
            >
              Full name provided
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {isScrolledToBottom ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            )}
            <span
              className={
                isScrolledToBottom ? "text-green-600" : "text-muted-foreground"
              }
            >
              Waiver read completely
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="border-t pt-6">
          <Button
            onClick={handleSubmit}
            disabled={!canAgree}
            size="lg"
            className="w-full sm:w-auto"
            variant={canAgree ? "default" : "secondary"}
          >
            {submitting
              ? "Saving Agreement..."
              : loading
                ? "Processing..."
                : "I Agree to the Terms and Conditions"}
          </Button>
          {!canAgree && (
            <p className="text-sm text-muted-foreground mt-2">
              Please complete all requirements above to continue.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
