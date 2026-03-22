"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, ScrollText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WaiverService } from "@/services/waiver";
import { DEFAULT_WAIVER_TEXT } from "@/lib/waiver/default-waiver-text";
import type { LiabilityWaiver, UserWaiverAgreement } from "@/types/firestore";
import { formatTimestamp } from "@/lib/utils/timestamp";

function createFallbackWaiver(): LiabilityWaiver {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: "fallback",
    version: "1.0.0",
    version_hash: "",
    title: "Liability Waiver and Terms of Service",
    content: DEFAULT_WAIVER_TEXT,
    is_active: true,
    created_by: "system",
    created_at: { seconds: now } as LiabilityWaiver["created_at"],
    updated_at: { seconds: now } as LiabilityWaiver["updated_at"],
    effective_date: { seconds: now } as LiabilityWaiver["effective_date"],
  };
}

interface ProfileWaiverViewProps {
  userId: string;
}

export function ProfileWaiverView({ userId }: ProfileWaiverViewProps) {
  const [waiver, setWaiver] = useState<LiabilityWaiver | null | undefined>(
    undefined
  );
  const [agreement, setAgreement] = useState<Pick<
    UserWaiverAgreement,
    "waiver_version" | "created_at"
  > | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      try {
        const waiverData = await WaiverService.getActiveWaiverVersion();

        if (cancelled) return;

        setWaiver(waiverData ?? null);

        if (waiverData) {
          try {
            const agreementData =
              await WaiverService.checkUserAgreement(userId);
            if (cancelled) return;
            if (agreementData) {
              setAgreement({
                waiver_version: agreementData.waiver_version,
                created_at: agreementData.created_at,
              });
            } else {
              setAgreement(null);
            }
          } catch {
            if (cancelled) return;
            setAgreement(null);
          }
        } else {
          setAgreement(null);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load waiver");
        // Use fallback so user can at least view the waiver content
        setWaiver(createFallbackWaiver());
        setAgreement(null);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (waiver === undefined && !error) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading liability waiver…
        </CardContent>
      </Card>
    );
  }

  if (waiver === null && !error) {
    return (
      <Card className="border-amber-500/50 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            Waiver Unavailable
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No active liability waiver is available at the moment. Please try
            again later or contact support if this persists.
          </p>
        </CardContent>
      </Card>
    );
  }

  // waiver is set (from API or fallback when error occurred)
  const waiverContent = waiver?.content || DEFAULT_WAIVER_TEXT;

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Could not load from server. Showing offline copy.
          </div>
        )}
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="h-5 w-5" />
          Liability Waiver & Terms of Service
        </CardTitle>
        {waiver && (
          <p className="text-sm text-muted-foreground">
            Version {waiver.version} • Effective{" "}
            {formatTimestamp(waiver.effective_date)}
          </p>
        )}
        {agreement && (
          <p className="flex items-center gap-2 text-sm text-green-600 dark:text-green-500">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            You agreed to version {agreement.waiver_version} on{" "}
            {formatTimestamp(agreement.created_at)}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div
          className="border rounded-lg p-6 bg-muted/30 max-h-[500px] overflow-y-auto text-sm leading-relaxed"
          style={{ scrollbarWidth: "thin" }}
        >
          <div className="whitespace-pre-wrap font-mono text-xs sm:text-sm">
            {waiverContent}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
