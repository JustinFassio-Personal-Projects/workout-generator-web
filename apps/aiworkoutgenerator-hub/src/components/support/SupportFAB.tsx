"use client";

import { useState, useCallback, useRef } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SupportCenter } from "./SupportCenter";
import { useUser } from "@/lib/auth";

// ============================================
// Component
// ============================================

export function SupportFAB() {
  const [open, setOpen] = useState(false);
  const { user, loading: authLoading } = useUser();

  // Capture metadata when dialog opens (not on submit)
  // Use ref to store metadata without triggering re-renders
  const capturedMetadataRef = useRef<{
    source_url: string;
    device_type: "mobile" | "desktop" | "tablet";
    utm_params: Record<string, string>;
  } | null>(null);

  // Capture metadata when dialog opens
  const handleOpenChange = useCallback((newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && !capturedMetadataRef.current) {
      // Capture metadata when dialog opens
      capturedMetadataRef.current = {
        source_url: typeof window !== "undefined" ? window.location.href : "",
        device_type:
          typeof window !== "undefined"
            ? window.innerWidth < 768
              ? "mobile"
              : window.innerWidth < 1024
                ? "tablet"
                : "desktop"
            : "desktop",
        utm_params:
          typeof window !== "undefined"
            ? (() => {
                const params = new URLSearchParams(window.location.search);
                const utmParams: Record<string, string> = {};
                const utmKeys = [
                  "utm_source",
                  "utm_medium",
                  "utm_campaign",
                  "utm_term",
                  "utm_content",
                ];
                for (const key of utmKeys) {
                  const value = params.get(key);
                  if (value) utmParams[key] = value;
                }
                return utmParams;
              })()
            : {},
      };
    } else if (!newOpen) {
      // Reset when dialog closes
      capturedMetadataRef.current = null;
    }
  }, []);

  // Only show FAB if user is authenticated
  if (authLoading || !user) {
    return null;
  }

  return (
    <>
      {/* Floating Action Button */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => handleOpenChange(true)}
              size="icon"
              className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
              aria-label="Help / Feedback"
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <div>
              <div className="font-semibold">Help / Feedback</div>
              <div className="text-xs text-muted-foreground">
                Goes to Justin (real human)
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Support Center */}
      <SupportCenter open={open} onOpenChange={handleOpenChange} />
    </>
  );
}
