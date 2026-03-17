"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BoardCard } from "./BoardCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";
import type { BoardBundle } from "@/services/board";

interface BoardSectionProps {
  bundle: BoardBundle | null;
  loading: boolean;
  error: string | null;
}

export function BoardSection({ bundle, loading, error }: BoardSectionProps) {
  // Don't render if loading, error, or no posts
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">The Board</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    // Silently fail on error - don't break dashboard
    logger.error("BoardSection error", error, { component: "BoardSection" });
    return null;
  }

  if (!bundle || (bundle.posts.length === 0 && !bundle.banner)) {
    // No posts to show
    return null;
  }

  // Show max 3-4 cards
  const displayPosts = bundle.posts.slice(0, 3);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">The Board</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/board" className="text-sm">
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayPosts.map((post) => (
            <BoardCard key={post.id} post={post} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
