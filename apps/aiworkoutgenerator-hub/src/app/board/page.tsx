"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useUser } from "@/lib/auth";
import { useSubscription } from "@/hooks/useSubscription";
import { useUserProfile } from "@/hooks/useUserProfile";
import { BoardService } from "@/services/board/BoardService";
import { BoardCard } from "@/components/board/BoardCard";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";
import type { BoardPostType, BoardPost } from "@/types/board";

export default function BoardPage() {
  const { user, loading: authLoading } = useUser();
  const { tier, status, loading: subLoading } = useSubscription();
  const { profile, loading: profileLoading } = useUserProfile();
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<BoardPostType | "all">(
    "all"
  );

  // Derive loading state from dependencies and subscription status
  const loading =
    authLoading || subLoading || profileLoading || subscriptionLoading;

  // Set up real-time listener for all posts (bypasses frequency filters)
  useEffect(() => {
    // Wait for all dependencies to finish loading
    if (authLoading || subLoading || profileLoading) {
      return;
    }

    // Set loading and error state before setting up subscription
    // This is necessary to indicate we're starting an async operation
    // The state is updated in the subscription callback when data arrives
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null);

    setSubscriptionLoading(true);

    // Set up real-time listener for candidate posts
    const unsubscribe = BoardService.subscribeToCandidatePosts(
      (candidatePosts: BoardPost[]) => {
        try {
          // Process posts for board page (no targeting/frequency filters)
          const allPosts = BoardService.processAllPostsForBoard(candidatePosts);
          setPosts(allPosts);
          setSubscriptionLoading(false);
          setError(null);
        } catch (err) {
          logger.error(
            "Error processing board posts from real-time update",
            err,
            {
              userId: user?.uid || null,
            }
          );
          setError(
            err instanceof Error ? err.message : "Failed to process board posts"
          );
          setPosts([]);
          setSubscriptionLoading(false);
        }
      },
      (err) => {
        logger.error("Error in board posts real-time listener", err, {
          userId: user?.uid || null,
        });
        setError(err.message || "Failed to load board posts");
        setPosts([]);
        setSubscriptionLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user, tier, status, profile, authLoading, subLoading, profileLoading]);

  // Filter by type if selected
  const filteredPosts =
    selectedType === "all"
      ? posts
      : posts.filter((post) => {
          // Handle null/undefined post_type - only filter if post_type exists and matches
          // If post_type is null/undefined, exclude from filtered results (unless "all")
          const postType = post.post_type;
          return postType === selectedType;
        });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 max-w-6xl px-4">
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">The Board</h1>
              <p className="text-muted-foreground mt-2">
                Product updates, how-tos, events, offers, announcements,
                features, warnings, tips, and workout of the day
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>

          {loading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
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
          ) : error ? (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground mb-2">
                  Failed to load posts. Please try again later.
                </p>
                {process.env.NODE_ENV === "development" && (
                  <p className="text-center text-xs text-muted-foreground">
                    Error: {error}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Tabs
              value={selectedType}
              onValueChange={(v) => {
                setSelectedType(v as BoardPostType | "all");
              }}
            >
              <div className="w-full overflow-x-auto">
                <TabsList className="inline-flex w-max min-w-full sm:min-w-0">
                  <TabsTrigger
                    value="all"
                    className="flex-shrink-0 whitespace-nowrap"
                  >
                    All
                  </TabsTrigger>
                  <TabsTrigger
                    value="product_update"
                    className="flex-shrink-0 whitespace-nowrap"
                  >
                    Updates
                  </TabsTrigger>
                  <TabsTrigger
                    value="how_to"
                    className="flex-shrink-0 whitespace-nowrap"
                  >
                    How-Tos
                  </TabsTrigger>
                  <TabsTrigger
                    value="event"
                    className="flex-shrink-0 whitespace-nowrap"
                  >
                    Events
                  </TabsTrigger>
                  <TabsTrigger
                    value="offer"
                    className="flex-shrink-0 whitespace-nowrap"
                  >
                    Offers
                  </TabsTrigger>
                  <TabsTrigger
                    value="announcement"
                    className="flex-shrink-0 whitespace-nowrap"
                  >
                    Announcements
                  </TabsTrigger>
                  <TabsTrigger
                    value="feature"
                    className="flex-shrink-0 whitespace-nowrap"
                  >
                    Features
                  </TabsTrigger>
                  <TabsTrigger
                    value="warning"
                    className="flex-shrink-0 whitespace-nowrap"
                  >
                    Warnings
                  </TabsTrigger>
                  <TabsTrigger
                    value="tip"
                    className="flex-shrink-0 whitespace-nowrap"
                  >
                    Tips
                  </TabsTrigger>
                  <TabsTrigger
                    value="wod"
                    className="flex-shrink-0 whitespace-nowrap"
                  >
                    WOD
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value={selectedType} className="mt-6">
                {filteredPosts.length === 0 ? (
                  <Card>
                    <CardContent className="py-8">
                      <p className="text-center text-muted-foreground mb-2">
                        No posts found for this filter.
                      </p>
                      {process.env.NODE_ENV === "development" && (
                        <p className="text-center text-xs text-muted-foreground">
                          Debug: Fetched {posts.length} total posts
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredPosts.map((post) => (
                      <BoardCard key={post.id} post={post} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
