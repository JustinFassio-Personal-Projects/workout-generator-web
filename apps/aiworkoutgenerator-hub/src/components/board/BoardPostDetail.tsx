/* eslint-disable react-hooks/static-components */
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { X, Pin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBoardActions } from "@/hooks/useBoardActions";
import { BoardService } from "@/services/board/BoardService";
import { MarkdownContent } from "./MarkdownContent";
import { getBoardIcon } from "@/lib/board-icons";
import {
  getAccentColor,
  getAccentBorderColor,
  getAccentGlowColor,
  getAccentTextColor,
} from "@/lib/board-colors";
import { logger } from "@/lib/logger";
import type { BoardPost } from "@/types/board";

interface BoardPostDetailProps {
  post: BoardPost;
}

export function BoardPostDetail({ post }: BoardPostDetailProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const { updateState, logEvent } = useBoardActions();
  const router = useRouter();

  // Get icon component (must be before early returns for hooks rules)
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

  // Helper function to detect absolute URLs
  const isAbsoluteUrl = (url: string): boolean => {
    return /^https?:\/\//i.test(url);
  };

  // Check if CTA should be shown (both fields must exist)
  const shouldShowCTA = post.cta_text && post.cta_url;

  const handleDismiss = async () => {
    setIsDismissed(true);
    try {
      await updateState(post.id, "dismiss");
      await logEvent(post.id, "dismiss", "detail");
    } catch (error) {
      logger.error("Error dismissing post", error, {
        component: "BoardPostDetail",
        postId: post.id,
      });
      setIsDismissed(false);
    }
  };

  const handleCtaClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!post.cta_url) return;

    // Log click event (fire-and-forget, non-blocking)
    // logEvent handles errors internally and doesn't throw, so no try-catch needed
    logEvent(post.id, "click", "detail").catch(() => {
      // Silently fail - event logging shouldn't block navigation
    });

    // Handle relative paths with router for client-side navigation
    if (post.cta_url.startsWith("/")) {
      e.preventDefault();
      router.push(post.cta_url);
    }
    // Absolute URLs will use default anchor behavior (opens in new tab)
  };

  if (isDismissed) {
    return null;
  }

  return (
    <Card
      className="border rounded-lg"
      style={{
        borderColor: borderColor || undefined,
        boxShadow: glowColor ? `0 0 8px ${glowColor}` : undefined,
      }}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 flex items-start gap-3">
            {Icon && (
              <div className="shrink-0 mt-1">
                <Icon className="h-6 w-6" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <CardTitle
                  className="text-2xl"
                  style={{ color: accentColor || undefined }}
                >
                  {post.title}
                </CardTitle>
                {BoardService.isPinned(post) && (
                  <Badge variant="secondary" className="gap-1">
                    <Pin className="h-3 w-3" />
                    <span>Pinned</span>
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {post.dismissible && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleDismiss}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {post.summary && (
          <p className="text-muted-foreground">{post.summary}</p>
        )}

        {/* Body (markdown) */}
        {post.body ? (
          <MarkdownContent content={post.body} />
        ) : (
          process.env.NODE_ENV === "development" && (
            <p className="text-xs text-muted-foreground italic">
              [No body content for this post]
            </p>
          )
        )}

        {/* CTA Button - only render if both cta_text and cta_url exist */}
        {shouldShowCTA && (
          <div>
            <Button
              asChild
              style={{
                backgroundColor: accentColor || undefined,
                borderColor: borderColor || undefined,
                color: accentColor
                  ? getAccentTextColor(post.accent) || "#FFFFFF"
                  : undefined,
              }}
            >
              <a
                href={post.cta_url}
                onClick={handleCtaClick}
                target={
                  post.cta_url && isAbsoluteUrl(post.cta_url)
                    ? "_blank"
                    : undefined
                }
                rel={
                  post.cta_url && isAbsoluteUrl(post.cta_url)
                    ? "noopener noreferrer"
                    : undefined
                }
              >
                {post.cta_text}
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
