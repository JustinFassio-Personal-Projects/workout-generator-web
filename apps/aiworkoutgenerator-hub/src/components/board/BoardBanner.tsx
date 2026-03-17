/* eslint-disable react-hooks/static-components */
"use client";

import { useState, useEffect, useMemo } from "react";
import { X, Pin } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBoardActions } from "@/hooks/useBoardActions";
import { BoardService } from "@/services/board/BoardService";
import { getBoardIcon } from "@/lib/board-icons";
import {
  getAccentColor,
  getAccentBorderColor,
  getAccentGlowColor,
  getAccentTextColor,
} from "@/lib/board-colors";
import { logger } from "@/lib/logger";
import type { BoardPost } from "@/types/board";

interface BoardBannerProps {
  post: BoardPost;
  onDismiss?: () => void;
}

export function BoardBanner({ post, onDismiss }: BoardBannerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const { updateState, logEvent } = useBoardActions();
  const [hasLoggedImpression, setHasLoggedImpression] = useState(false);

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
  const ctaUrl = useMemo(
    () => post.cta_url || `/board/${post.id}`,
    [post.cta_url, post.id]
  );

  // Log impression on mount (debounced) and update state
  useEffect(() => {
    if (!hasLoggedImpression && isVisible) {
      const timer = setTimeout(async () => {
        try {
          await Promise.all([
            logEvent(post.id, "impression", "banner"),
            updateState(post.id, "impression"),
          ]);
          setHasLoggedImpression(true);
        } catch (error) {
          logger.error("Error logging impression", error, {
            component: "BoardBanner",
            postId: post.id,
          });
        }
      }, 500); // 500ms debounce

      return () => clearTimeout(timer);
    }
  }, [post.id, hasLoggedImpression, isVisible, logEvent, updateState]);

  const handleDismiss = async () => {
    setIsVisible(false);
    try {
      await updateState(post.id, "dismiss");
      await logEvent(post.id, "dismiss", "banner");
      onDismiss?.();
    } catch (error) {
      logger.error("Error dismissing banner", error, {
        component: "BoardBanner",
        postId: post.id,
      });
      // Re-show banner if dismiss failed
      setIsVisible(true);
    }
  };

  const handleCtaClick = async () => {
    try {
      await logEvent(post.id, "click", "banner");
    } catch (error) {
      // Don't block navigation on event logging failure
      logger.error("Error logging click", error, {
        component: "BoardBanner",
        postId: post.id,
      });
    }
  };

  if (!isVisible) {
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
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 flex items-start gap-3">
            {Icon && (
              <div className="shrink-0 mt-0.5">
                <Icon className="h-5 w-5" />
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle
                  className="text-lg"
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
              className="h-6 w-6 shrink-0"
              onClick={handleDismiss}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground mb-3">{post.summary}</p>
        {post.cta_text && (
          <Button
            asChild
            size="sm"
            onClick={handleCtaClick}
            style={{
              backgroundColor: accentColor || undefined,
              borderColor: borderColor || undefined,
              color: accentColor
                ? getAccentTextColor(post.accent) || "#FFFFFF"
                : undefined,
            }}
          >
            <Link href={ctaUrl}>{post.cta_text}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
