"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BoardService } from "@/services/board/BoardService";
import { useBoardActions } from "@/hooks/useBoardActions";
import { BoardPostDetail } from "@/components/board/BoardPostDetail";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { logger } from "@/lib/logger";
import type { BoardPost } from "@/types/board";

export default function BoardPostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params?.id as string;
  const { logEvent } = useBoardActions();
  const [post, setPost] = useState<BoardPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoggedClick, setHasLoggedClick] = useState(false);

  // Fetch post by ID (bypasses frequency filters)
  useEffect(() => {
    // Validate postId parameter
    if (!postId || postId.trim().length === 0) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[BoardPostPage] Invalid postId parameter:", postId);
      }
      setError("Invalid post ID");
      setLoading(false);
      return;
    }

    const fetchPost = async () => {
      try {
        setLoading(true);
        setError(null);

        if (process.env.NODE_ENV === "development") {
          console.log(`[BoardPostPage] Fetching post with ID: "${postId}"`);
        }

        const fetchedPost = await BoardService.getPostById(postId);

        if (process.env.NODE_ENV === "development") {
          console.log(`[BoardPostPage] Fetched post:`, {
            found: !!fetchedPost,
            id: fetchedPost?.id,
            title: fetchedPost?.title,
            status: fetchedPost?.status,
            schema_version: fetchedPost?.schema_version,
            hasBody: !!fetchedPost?.body,
            bodyLength: fetchedPost?.body?.length || 0,
            bodyPreview: fetchedPost?.body?.substring(0, 100) || "no body",
          });
        }

        if (!fetchedPost) {
          setError(
            "Post not found. It may have been deleted, is not published yet, or has expired."
          );
        } else {
          setPost(fetchedPost);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        logger.error("Error fetching board post", error, { postId });

        if (process.env.NODE_ENV === "development") {
          console.error("[BoardPostPage] Error details:", {
            postId,
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
          });
        }

        // Distinguish between different error types
        if (
          errorMessage.includes("permission") ||
          errorMessage.includes("permissions")
        ) {
          setError("You don't have permission to view this post.");
        } else if (
          errorMessage.includes("network") ||
          errorMessage.includes("fetch")
        ) {
          setError(
            "Network error. Please check your connection and try again."
          );
        } else {
          setError("Failed to load post. Please try again later.");
        }
        setPost(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [postId]);

  // Log impression on mount and update state
  useEffect(() => {
    if (post && !hasLoggedClick) {
      const updateImpression = async () => {
        try {
          await Promise.all([
            logEvent(post.id, "impression", "detail"),
            // Note: updateState requires auth, so we check if user exists
            // For now, just log event - state update happens via banner/section
          ]);
          setHasLoggedClick(true);
        } catch (error) {
          logger.error("Error logging impression", error, {
            postId: post.id,
            surface: "detail",
          });
        }
      };
      updateImpression();
    }
  }, [post, hasLoggedClick, logEvent]);

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl px-4">
        <Skeleton className="h-10 w-32 mb-4" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="py-8 space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-32 w-full mt-4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!post && !loading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl px-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Card className="mt-4">
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground mb-2">
              {error || "Post not found."}
            </p>
            {process.env.NODE_ENV === "development" && postId && (
              <p className="text-center text-xs text-muted-foreground mt-2">
                Post ID: {postId}
              </p>
            )}
            <div className="mt-4 text-center">
              <Button variant="outline" onClick={() => router.push("/board")}>
                View All Posts
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl px-4">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>
      <div className="mt-6">{post && <BoardPostDetail post={post} />}</div>
    </div>
  );
}
