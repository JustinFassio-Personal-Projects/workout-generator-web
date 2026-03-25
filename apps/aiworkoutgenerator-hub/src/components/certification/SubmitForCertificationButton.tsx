"use client";

import Image from "next/image";
import { Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type SubmitForCertificationButtonProps = {
  onOpen: () => void;
};

export function SubmitForCertificationButton({
  onOpen,
}: SubmitForCertificationButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          className="w-full sm:w-auto border-yellow-400/50 animate-breathe-gold-glow"
          onClick={onOpen}
        >
          <Shield className="h-4 w-4 mr-2 text-yellow-400" />
          Submit for Trainer Certification
        </Button>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        className="max-w-sm p-0 bg-popover border"
      >
        <div className="flex gap-3 p-3">
          <div className="relative w-12 h-16 rounded-md overflow-hidden flex-shrink-0">
            <Image
              src="/images/coach/justin-profile-hero-three-quarter.png"
              alt="Coach Justin"
              fill
              className="object-cover"
              sizes="48px"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium mb-1 text-yellow-400">
              Submit for Trainer Certification
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Submit your workout for review and certification. Coach Justin
              will review your workout and make personalized adjustments based
              on your profile, goals, and responses.
            </p>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
