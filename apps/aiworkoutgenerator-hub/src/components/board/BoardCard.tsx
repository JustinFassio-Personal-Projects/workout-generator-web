/* eslint-disable react-hooks/static-components */
"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Pin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BoardService } from "@/services/board/BoardService";
import { getBoardIcon } from "@/lib/board-icons";
import {
  getAccentColor,
  getAccentBorderColor,
  getAccentGlowColor,
  getAccentTextColor,
} from "@/lib/board-colors";
import type { BoardPost } from "@/types/board";

interface BoardCardProps {
  post: BoardPost;
}

export function BoardCard({ post }: BoardCardProps) {
  const router = useRouter();
  const Icon = useMemo(() => getBoardIcon(post.icon_key), [post.icon_key]);
  const borderColor = useMemo(
    () => getAccentBorderColor(post.accent),
    [post.accent]
  );
  const glowColor = useMemo(
    () => getAccentGlowColor(post.accent),
    [post.accent]
  );
  const accentColor = useMemo(() => getAccentColor(post.accent), [post.accent]);
  const detailUrl = useMemo(() => `/board/${post.id}`, [post.id]);
  const ctaUrl = useMemo(() => post.cta_url, [post.cta_url]);

  // Handle card click - navigate to detail page
  const handleCardClick = () => {
    router.push(detailUrl);
  };

  // Handle CTA click - prevent card navigation and navigate to CTA URL
  const handleCtaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (ctaUrl) {
      if (ctaUrl.startsWith("/")) {
        router.push(ctaUrl);
      } else {
        window.open(ctaUrl, "_blank", "noopener,noreferrer");
      }
    } else {
      // If no CTA URL, go to detail page
      router.push(detailUrl);
    }
  };

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md border"
      style={{
        borderColor: borderColor || undefined,
        boxShadow: glowColor ? `0 0 8px ${glowColor}` : undefined,
      }}
      onClick={handleCardClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            {Icon && (
              <div className="shrink-0 mt-0.5">
                <Icon className="h-5 w-5" />
              </div>
            )}
            <CardTitle
              className="text-lg"
              style={{ color: accentColor || undefined }}
            >
              {post.title}
            </CardTitle>
          </div>
          {BoardService.isPinned(post) && (
            <Badge variant="secondary" className="gap-1 shrink-0">
              <Pin className="h-3 w-3" />
              <span>Pinned</span>
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-4">
          {post.summary}
        </p>
        {post.cta_text && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleCtaClick}
            className="w-full sm:w-auto"
            style={{
              borderColor: borderColor || undefined,
              backgroundColor: accentColor || undefined,
              color: accentColor
                ? getAccentTextColor(post.accent) || "#FFFFFF"
                : undefined,
            }}
          >
            {post.cta_text}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
