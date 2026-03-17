"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Share2,
  Copy,
  Check,
  Globe,
  Lock,
  FileText,
  Dumbbell,
} from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ShareService,
  type ShareOption,
  type ShareStatus,
} from "@/services/share";
import { getPublicSummaryUrl } from "@/lib/share-config";

interface ShareModalProps {
  summaryId: string;
  workoutId: string;
  workoutTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareModal({
  summaryId,
  workoutId,
  workoutTitle,
  open,
  onOpenChange,
}: ShareModalProps) {
  const [shareOption, setShareOption] = useState<ShareOption>("summary_only");
  const [shareStatus, setShareStatus] = useState<ShareStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load current share status when modal opens
  const loadShareStatus = useCallback(async () => {
    if (!open || !summaryId) return;

    setIsLoading(true);
    try {
      const status = await ShareService.getShareStatus(summaryId, workoutId);
      setShareStatus(status);

      // Set default option based on current status
      if (status.workoutIsPublic && status.summaryIsPublic) {
        setShareOption("summary_and_workout");
      } else {
        setShareOption("summary_only");
      }
    } catch (error) {
      console.error("Failed to load share status:", error);
      toast.error("Failed to load share status");
    } finally {
      setIsLoading(false);
    }
  }, [open, summaryId, workoutId]);

  useEffect(() => {
    loadShareStatus();
  }, [loadShareStatus]);

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const isPublic = shareStatus?.summaryIsPublic || false;
  const shareUrl = getPublicSummaryUrl(summaryId);

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const result = await ShareService.publish(
        shareOption,
        summaryId,
        workoutId
      );

      if (result.success) {
        toast.success("Content shared successfully!", {
          description: "Your share link is ready to copy.",
        });
        await loadShareStatus();
      } else {
        toast.error("Failed to share", {
          description: result.error,
        });
      }
    } catch (error) {
      console.error("Failed to publish:", error);
      toast.error("Failed to share content");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    setIsPublishing(true);
    try {
      // Unpublish both if workout was public
      const result = await ShareService.unpublish(
        summaryId,
        shareStatus?.workoutIsPublic ? workoutId : undefined
      );

      if (result.success) {
        toast.success("Content is now private", {
          description: "The share link will no longer work.",
        });
        await loadShareStatus();
      } else {
        toast.error("Failed to make private", {
          description: result.error,
        });
      }
    } catch (error) {
      console.error("Failed to unpublish:", error);
      toast.error("Failed to make content private");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy:", error);
      toast.error("Failed to copy link");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-orange-500" />
            Share Workout
          </DialogTitle>
          <DialogDescription>
            Share &quot;{workoutTitle}&quot; with friends and family.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading...
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Current Status */}
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              {isPublic ? (
                <>
                  <Globe className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-600">
                    Currently shared publicly
                  </span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Currently private
                  </span>
                </>
              )}
            </div>

            {/* Share Options (only show when not already public) */}
            {!isPublic && (
              <div className="space-y-4">
                <Label className="text-sm font-medium">
                  What would you like to share?
                </Label>
                <RadioGroup
                  value={shareOption}
                  onValueChange={(value) =>
                    setShareOption(value as ShareOption)
                  }
                  className="space-y-3"
                >
                  {/* Option 1: Summary Only */}
                  <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer">
                    <RadioGroupItem
                      value="summary_only"
                      id="summary_only"
                      className="mt-1"
                    />
                    <Label
                      htmlFor="summary_only"
                      className="flex-1 cursor-pointer space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-orange-500" />
                        <span className="font-medium">Session Report Only</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Share your workout completion summary, stats, and notes.
                        The detailed workout plan stays private.
                      </p>
                    </Label>
                  </div>

                  {/* Option 2: Summary + Workout */}
                  <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors cursor-pointer">
                    <RadioGroupItem
                      value="summary_and_workout"
                      id="summary_and_workout"
                      className="mt-1"
                    />
                    <Label
                      htmlFor="summary_and_workout"
                      className="flex-1 cursor-pointer space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <Dumbbell className="w-4 h-4 text-orange-500" />
                        <span className="font-medium">
                          Session Report & Workout
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Share both your session report and the full workout
                        plan. Others can see all exercises and details.
                      </p>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Share URL (only show when public) */}
            {isPublic && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Share Link</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 rounded bg-muted text-xs break-all">
                    {shareUrl}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {shareStatus?.workoutIsPublic
                    ? "Both session report and workout are shared."
                    : "Only the session report is shared."}
                </p>
              </div>
            )}

            {/* Public Profile Coming Soon */}
            <div className="pt-2 border-t border-muted">
              <p className="text-xs text-muted-foreground text-center">
                <span className="font-medium">Public Member Profiles</span>
                {" — "}
                <a
                  href="https://aiworkoutgenerator.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-500 hover:text-orange-600 underline underline-offset-2"
                >
                  Coming soon to aiworkoutgenerator.com
                </a>
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {isPublic ? (
            <>
              <Button
                variant="outline"
                onClick={handleUnpublish}
                disabled={isPublishing}
                className="sm:flex-1"
              >
                {isPublishing ? "Updating..." : "Make Private"}
              </Button>
              <Button
                onClick={handleCopyLink}
                disabled={isPublishing}
                className="sm:flex-1"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPublishing}
                className="sm:flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePublish}
                disabled={isPublishing || isLoading}
                className="sm:flex-1"
              >
                {isPublishing ? "Sharing..." : "Share"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
