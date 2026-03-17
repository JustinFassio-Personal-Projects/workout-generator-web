"use client";

import { useState } from "react";
import {
  Clock,
  UserCheck,
  MessageSquare,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CertificationStatusBadge } from "./CertificationStatusBadge";
import { CertificationMessagesSheet } from "./CertificationMessagesSheet";
import {
  useCertificationStatus,
  useCertificationMessages,
  useCertificationActions,
} from "@/hooks/useCertification";

interface CertificationStatusCardProps {
  workoutId: string;
  workoutTitle: string;
}

/**
 * Card displaying certification status with actions.
 * Shows timeline, trainer info, and quick actions.
 */
export function CertificationStatusCard({
  workoutId,
  workoutTitle,
}: CertificationStatusCardProps) {
  const { status, summary, loading } = useCertificationStatus(workoutId);
  const { unreadCount } = useCertificationMessages(workoutId);
  const { cancel, isCancelling } = useCertificationActions();

  const [messagesOpen, setMessagesOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // Show loading skeleton while fetching status
  if (loading) {
    return (
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-24" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't render if not in certification process
  if (!summary || status === "none") {
    return null;
  }

  const canCancel =
    status === "pending" ||
    status === "in_review" ||
    status === "changes_requested";

  const handleCancel = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent AlertDialog from auto-closing
    const result = await cancel(workoutId);
    if (result.success) {
      toast.success("Certification cancelled", {
        description:
          "Your certification request has been cancelled successfully.",
      });
      setCancelDialogOpen(false);
    } else {
      toast.error("Failed to cancel", {
        description: result.error || "Please try again.",
      });
      // Keep dialog open on error so user can try again
    }
  };

  return (
    <>
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              Certification Status
            </CardTitle>
            <CertificationStatusBadge status={status} size="sm" />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Timeline */}
          <div className="space-y-3">
            {/* Submitted */}
            <TimelineItem
              icon={Clock}
              title="Submitted"
              time={summary.requestedAt}
              isComplete={true}
            />

            {/* Assigned */}
            {(status === "in_review" ||
              status === "changes_requested" ||
              status === "certified" ||
              status === "rejected") && (
              <TimelineItem
                icon={UserCheck}
                title={`Assigned to ${summary.assignedTrainerName || "Trainer"}`}
                time={summary.assignedAt}
                isComplete={true}
              />
            )}

            {/* Changes Requested */}
            {status === "changes_requested" && (
              <TimelineItem
                icon={AlertCircle}
                title="Changes Requested"
                subtitle="Please check messages for trainer feedback"
                isComplete={true}
                variant="warning"
              />
            )}

            {/* Certified */}
            {status === "certified" && (
              <TimelineItem
                icon={CheckCircle2}
                title="Certified!"
                time={summary.certifiedAt}
                subtitle={summary.certificationNotes}
                isComplete={true}
                variant="success"
              />
            )}

            {/* Rejected */}
            {status === "rejected" && (
              <TimelineItem
                icon={X}
                title="Not Approved"
                subtitle={
                  summary.certificationNotes ||
                  "Please check messages for details"
                }
                isComplete={true}
                variant="error"
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setMessagesOpen(true)}
              aria-label={`Open messages${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
            >
              <MessageSquare className="w-4 h-4 mr-2" aria-hidden="true" />
              Messages
              {unreadCount > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </Button>

            {canCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCancelDialogOpen(true)}
                disabled={isCancelling}
                aria-label="Cancel certification request"
              >
                <X className="w-4 h-4 mr-1" aria-hidden="true" />
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Messages Sheet */}
      <CertificationMessagesSheet
        workoutId={workoutId}
        workoutTitle={workoutTitle}
        open={messagesOpen}
        onOpenChange={setMessagesOpen}
      />

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Certification?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the certification request for this
              workout? You can submit it again later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>
              Keep Request
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? "Cancelling..." : "Yes, Cancel"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Timeline Item Component
interface TimelineItemProps {
  icon: typeof Clock;
  title: string;
  time?: Date;
  subtitle?: string;
  isComplete: boolean;
  variant?: "default" | "success" | "warning" | "error";
}

function TimelineItem({
  icon: Icon,
  title,
  time,
  subtitle,
  isComplete,
  variant = "default",
}: TimelineItemProps) {
  const variantStyles = {
    default: "text-primary",
    success: "text-green-600",
    warning: "text-orange-600",
    error: "text-red-600",
  };

  return (
    <div className="flex items-start gap-3">
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isComplete ? "bg-primary/10" : "bg-muted"
        }`}
      >
        <Icon className={`w-4 h-4 ${variantStyles[variant]}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{title}</p>
        {time && (
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(time, { addSuffix: true })}
          </p>
        )}
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
