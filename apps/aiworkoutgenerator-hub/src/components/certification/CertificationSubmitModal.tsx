"use client";

import { useState } from "react";
import { Shield, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCertificationActions } from "@/hooks/useCertification";
import type { CertificationQuestionnaire } from "@/types/firestore";

interface CertificationSubmitModalProps {
  workoutId: string;
  workoutTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Step 1: Primary hesitation options
const HESITATION_OPTIONS = [
  {
    value: "safety_concern",
    label: "Safety Concern: The movements or combinations feel risky/dangerous",
  },
  {
    value: "logic_gap",
    label: "Logic Gap: The exercise order or pairing doesn't make sense",
  },
  {
    value: "intensity_mismatch",
    label: "Intensity Mismatch: Looks too easy or too hard for my level",
  },
  {
    value: "equipment_confusion",
    label: "Equipment Confusion: I'm not sure how to set this up",
  },
  {
    value: "sanity_check",
    label: "Sanity Check: Just want a human stamp of approval before starting",
  },
];

// Step 2: Logic error options
const LOGIC_ERROR_OPTIONS = [
  "Equipment Hallucination: Included gear I don't have (ignored my profile)",
  "Injury Conflict: Suggests movements that aggravate my active injuries",
  "Impossible Transition: Can't move between stations fast enough",
  "Rep Scheme Glitch: Reps/Sets look random or impossible",
  "No Logic Errors: The logistics look accurate to my profile",
];

// Step 2: Pacing assessment options
const PACING_OPTIONS = [
  { value: "feasible", label: "Feasible: Looks perfect for my time slot" },
  {
    value: "overloaded",
    label: "Overloaded: Volume is too high; I'll never finish in time",
  },
  {
    value: "underloaded",
    label: "Underloaded: Too short; I'll finish way too early",
  },
  {
    value: "rest_issue",
    label: "Rest Period Issue: Rest times are unrealistic for this intensity",
  },
];

// Step 3: Visual flag options
const VISUAL_FLAG_OPTIONS = [
  "Unsafe Joint Angle: The image depicts a dangerous range of motion",
  "Incorrect Grip/Stance: The hand/foot placement shown is wrong for this lift",
  "Equipment Glitch: The equipment looks distorted or incorrect",
  "Missing Safety Cues: Image lacks necessary spotting or safety setup",
  "Visuals look accurate",
];

type Step = 1 | 2 | 3;

/**
 * Multi-step modal for submitting a workout for trainer certification.
 */
export function CertificationSubmitModal({
  workoutId,
  workoutTitle,
  open,
  onOpenChange,
  onSuccess,
}: CertificationSubmitModalProps) {
  const { submit, isSubmitting } = useCertificationActions();

  const [step, setStep] = useState<Step>(1);
  // Step 1: Gut Check
  const [primaryHesitation, setPrimaryHesitation] = useState("");
  const [aiHallucinationReport, setAiHallucinationReport] = useState("");
  // Step 2: Logic & Logistics Audit
  const [logicErrors, setLogicErrors] = useState<string[]>([]);
  const [pacingAssessment, setPacingAssessment] = useState("");
  // Step 3: Image Certification
  const [visualFlags, setVisualFlags] = useState<string[]>([]);
  const [visualCorrectionRequest, setVisualCorrectionRequest] = useState("");

  const resetForm = () => {
    setStep(1);
    setPrimaryHesitation("");
    setAiHallucinationReport("");
    setLogicErrors([]);
    setPacingAssessment("");
    setVisualFlags([]);
    setVisualCorrectionRequest("");
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onOpenChange(false);
    }
  };

  const handleLogicErrorToggle = (item: string) => {
    setLogicErrors((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]
    );
  };

  const handleVisualFlagToggle = (flag: string) => {
    setVisualFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag]
    );
  };

  // Validation: Step 1 requires hesitation selection (textarea optional)
  const canProceedStep1 = !!primaryHesitation;
  // Validation: Step 2 requires pacing assessment (logic errors optional)
  // Logic errors are optional feedback - users can indicate no errors or skip entirely
  const canProceedStep2 = !!pacingAssessment;
  // Validation: Step 3 visual flags are optional (label says "select all that apply")
  // Users can proceed without selecting flags if visuals are acceptable
  const canProceedStep3 = true;

  const handleSubmit = async () => {
    const questionnaire: CertificationQuestionnaire = {
      primary_hesitation: primaryHesitation,
      ai_hallucination_report: aiHallucinationReport.trim(),
      logic_errors: logicErrors,
      pacing_assessment: pacingAssessment,
      visual_flags: visualFlags,
      visual_correction_request: visualCorrectionRequest.trim() || undefined,
    };

    const result = await submit(workoutId, questionnaire);

    if (result.success) {
      toast.success("Workout submitted for certification!", {
        description: "A trainer will review your workout shortly.",
      });
      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } else {
      toast.error("Failed to submit", {
        description: result.error || "Please try again.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-yellow-400" />
            Submit for Coach Review and Certification
          </DialogTitle>
          <DialogDescription>
            Submit &quot;{workoutTitle}&quot; for trainer review. Step {step} of
            3.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Step 1: Gut Check */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hesitation">
                  What is your primary hesitation with this AI draft?
                </Label>
                <Select
                  value={primaryHesitation}
                  onValueChange={setPrimaryHesitation}
                >
                  <SelectTrigger
                    id="hesitation"
                    className="focus:ring-yellow-400 focus:border-yellow-400"
                  >
                    <SelectValue placeholder="Select your primary concern" />
                  </SelectTrigger>
                  <SelectContent>
                    {HESITATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hallucination-report">
                  AI Hallucination Report and Specific Concerns
                </Label>
                <Textarea
                  id="hallucination-report"
                  placeholder="Did the AI suggest a weird movement, ignore a previous constraint, or invent a variation you don't recognize? Tell the trainer specifically what feels 'off' about this generation."
                  value={aiHallucinationReport}
                  onChange={(e) => setAiHallucinationReport(e.target.value)}
                  rows={4}
                  className="focus-visible:ring-yellow-400 focus-visible:border-yellow-400"
                />
              </div>
            </div>
          )}

          {/* Step 2: Logic & Logistics Audit */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Flag specific AI Logic Errors (select all that apply)
                </Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {LOGIC_ERROR_OPTIONS.map((item, index) => {
                    const baseId = item
                      .toLowerCase()
                      .replace(/[^a-z0-9]/g, "-");
                    const checkboxId = `logic-error-${baseId}-${index}`;
                    return (
                      <label
                        key={item}
                        htmlFor={checkboxId}
                        className="flex items-start gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50 focus-within:ring-2 focus-within:ring-yellow-400 focus-within:ring-offset-2"
                      >
                        <Checkbox
                          id={checkboxId}
                          checked={logicErrors.includes(item)}
                          onCheckedChange={() => handleLogicErrorToggle(item)}
                          aria-label={`Select ${item}`}
                          className="border-yellow-400 data-[state=checked]:bg-yellow-400 data-[state=checked]:text-yellow-900 focus-visible:ring-yellow-400 mt-0.5"
                        />
                        <span className="text-sm">{item}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pacing">Pacing and Volume Assessment</Label>
                <Select
                  value={pacingAssessment}
                  onValueChange={setPacingAssessment}
                >
                  <SelectTrigger
                    id="pacing"
                    className="focus:ring-yellow-400 focus:border-yellow-400"
                  >
                    <SelectValue placeholder="How does the workout volume look?" />
                  </SelectTrigger>
                  <SelectContent>
                    {PACING_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 3: Image Certification */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Visual Anatomy and Form Flags (select all that apply)
                </Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {VISUAL_FLAG_OPTIONS.map((flag, index) => {
                    const baseId = flag
                      .toLowerCase()
                      .replace(/[^a-z0-9]/g, "-");
                    const checkboxId = `visual-flag-${baseId}-${index}`;
                    return (
                      <label
                        key={flag}
                        htmlFor={checkboxId}
                        className="flex items-start gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50 focus-within:ring-2 focus-within:ring-yellow-400 focus-within:ring-offset-2"
                      >
                        <Checkbox
                          id={checkboxId}
                          checked={visualFlags.includes(flag)}
                          onCheckedChange={() => handleVisualFlagToggle(flag)}
                          aria-label={`Select ${flag}`}
                          className="border-yellow-400 data-[state=checked]:bg-yellow-400 data-[state=checked]:text-yellow-900 focus-visible:ring-yellow-400 mt-0.5"
                        />
                        <span className="text-sm">{flag}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="visual-correction">
                  Visual Correction Request (optional)
                </Label>
                <Textarea
                  id="visual-correction"
                  placeholder="Which specific exercise image needs a human re-shoot or manual correction? (e.g., 'The squat depth in the image for Step 3 looks physically impossible')."
                  value={visualCorrectionRequest}
                  onChange={(e) => setVisualCorrectionRequest(e.target.value)}
                  rows={3}
                  className="focus-visible:ring-yellow-400 focus-visible:border-yellow-400"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-0">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep((s) => (s - 1) as Step)}
              disabled={isSubmitting}
              aria-label="Go back to previous step"
            >
              <ChevronLeft className="w-4 h-4 mr-1" aria-hidden="true" />
              Back
            </Button>
          )}

          <div className="flex-1" />

          {step < 3 ? (
            <Button
              type="button"
              onClick={() => setStep((s) => (s + 1) as Step)}
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2)
              }
              aria-label="Go to next step"
              className="bg-yellow-400 text-yellow-900 hover:bg-yellow-500 border-yellow-400"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" aria-hidden="true" />
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canProceedStep3 || isSubmitting}
                    aria-label="Submit workout for certification"
                    className="bg-yellow-400 text-yellow-900 hover:bg-yellow-500 border-yellow-400"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2
                          className="w-4 h-4 mr-2 animate-spin"
                          aria-hidden="true"
                        />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Shield
                          className="w-4 h-4 mr-2 text-yellow-900"
                          aria-hidden="true"
                        />
                        Submit for Review
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-sm">
                    Review and certification can take 24-72 hours as this is a
                    careful review by Coach Justin personally.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
