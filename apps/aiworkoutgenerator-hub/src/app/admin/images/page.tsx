"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Star,
  Trash2,
  RefreshCw,
  Loader2,
  CheckCircle,
  ImageIcon,
  BarChart3,
  ShieldX,
  AlertCircle,
} from "lucide-react";

import { useUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  listMasterImages,
  getImagesPendingReview,
  updateQualityScore,
  deleteMasterImage,
  getMasterImageStats,
} from "@/services/image/MasterImageService";
import type { MasterExerciseImage } from "@/types/firestore";

type ViewMode = "all" | "pending";

export default function AdminImagesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);
  const [images, setImages] = useState<MasterExerciseImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("pending");
  const [stats, setStats] = useState<{
    totalImages: number;
    reviewedImages: number;
    averageQualityScore: number | null;
  } | null>(null);
  const [selectedImage, setSelectedImage] =
    useState<MasterExerciseImage | null>(null);
  const [deleteConfirmImage, setDeleteConfirmImage] =
    useState<MasterExerciseImage | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Check if user is admin using Firebase Auth custom claims
  // SECURITY: Uses custom claims which users cannot modify, unlike Firestore documents
  const checkAdminRole = useCallback(async () => {
    if (!user) return false;

    try {
      // Force refresh to get latest custom claims
      const tokenResult = await user.getIdTokenResult(true);
      const role = tokenResult.claims.role as string | undefined;
      return role === "admin" || role === "super_admin";
    } catch (error) {
      console.error("Error checking admin role:", error);
      return false;
    }
  }, [user]);

  // Fetch images based on view mode
  const fetchImages = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const result =
        viewMode === "pending"
          ? await getImagesPendingReview(100)
          : await listMasterImages({ limitCount: 100 });
      setImages(result);
    } catch (error) {
      console.error("Error fetching images:", error);
      setFetchError("Failed to load images. Please try again.");
      toast.error("Failed to load images");
    } finally {
      setLoading(false);
    }
  }, [viewMode]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const result = await getMasterImageStats();
      setStats(result);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  // Check admin role when user changes
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    // Verify admin role using custom claims before allowing access
    const verifyAdmin = async () => {
      const adminStatus = await checkAdminRole();
      setIsAdmin(adminStatus);
      setAdminCheckComplete(true);

      if (adminStatus) {
        fetchImages();
        fetchStats();
      }
    };

    verifyAdmin();
  }, [user, authLoading, router, checkAdminRole, fetchImages, fetchStats]);

  const handleRateImage = async (image: MasterExerciseImage, score: number) => {
    if (!user) return;

    setActionLoading(true);
    try {
      await updateQualityScore(image.exercise_name, score, user.uid);
      toast.success(`Rated "${image.exercise_name}" ${score}/5`);

      // Update local state
      setImages((prev) =>
        prev.map((img) =>
          img.id === image.id ? { ...img, quality_score: score } : img
        )
      );

      // If in pending view, remove the rated image
      if (viewMode === "pending") {
        setImages((prev) => prev.filter((img) => img.id !== image.id));
      }

      fetchStats();
    } catch (error) {
      console.error("Error rating image:", error);
      toast.error("Failed to rate image");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!deleteConfirmImage) return;

    setActionLoading(true);
    try {
      await deleteMasterImage(deleteConfirmImage.exercise_name, true);
      toast.success(`Deleted "${deleteConfirmImage.exercise_name}"`);

      // Update local state
      setImages((prev) =>
        prev.filter((img) => img.id !== deleteConfirmImage.id)
      );
      setDeleteConfirmImage(null);
      fetchStats();
    } catch (error) {
      console.error("Error deleting image:", error);
      toast.error("Failed to delete image");
    } finally {
      setActionLoading(false);
    }
  };

  // Show loading while checking auth or admin status
  if (authLoading || !adminCheckComplete) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show access denied for non-admin users
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-md">
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldX className="h-16 w-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-6">
              This page is restricted to administrators only.
            </p>
            <Button onClick={() => router.push("/dashboard")}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading while fetching images (after admin check passed)
  if (loading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show error state if images failed to load
  if (fetchError) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-md">
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mb-4" />
            <h1 className="text-2xl font-bold mb-2">Failed to Load Images</h1>
            <p className="text-muted-foreground mb-6">{fetchError}</p>
            <Button onClick={fetchImages}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Master Image Library</h1>
          <p className="text-muted-foreground mt-1">
            Review and manage AI-generated exercise images
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={viewMode}
            onValueChange={(v) => setViewMode(v as ViewMode)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="all">All Images</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchImages}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{stats.totalImages}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Reviewed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-2xl font-bold">
                  {stats.reviewedImages}
                </span>
                <span className="text-sm text-muted-foreground">
                  (
                  {stats.totalImages > 0
                    ? Math.round(
                        (stats.reviewedImages / stats.totalImages) * 100
                      )
                    : 0}
                  %)
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg. Quality Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-yellow-500" />
                <span className="text-2xl font-bold">
                  {stats.averageQualityScore !== null
                    ? stats.averageQualityScore.toFixed(1)
                    : "—"}
                </span>
                <span className="text-sm text-muted-foreground">/ 5</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Image Grid */}
      {images.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">No images found</h3>
            <p className="text-muted-foreground">
              {viewMode === "pending"
                ? "All images have been reviewed."
                : "No master images have been created yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {images.map((image) => (
            <Card
              key={image.id}
              className="group overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div
                className="relative aspect-square cursor-pointer"
                onClick={() => setSelectedImage(image)}
              >
                <Image
                  src={image.image_url}
                  alt={image.exercise_name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </div>
              <CardContent className="p-4">
                <h3
                  className="font-medium truncate"
                  title={image.exercise_name}
                >
                  {image.exercise_name}
                </h3>
                <div className="flex items-center justify-between mt-3">
                  {/* Quality Score */}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        onClick={() => handleRateImage(image, score)}
                        disabled={actionLoading}
                        className="p-0.5 hover:scale-110 transition-transform disabled:opacity-50"
                        title={`Rate ${score}/5`}
                      >
                        <Star
                          className={`h-4 w-4 ${
                            image.quality_score !== null &&
                            image.quality_score !== undefined &&
                            score <= image.quality_score
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground/50"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteConfirmImage(image)}
                    disabled={actionLoading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {image.quality_score !== null && (
                  <Badge variant="secondary" className="mt-2">
                    Reviewed
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Image Preview Dialog */}
      <Dialog
        open={selectedImage !== null}
        onOpenChange={() => setSelectedImage(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedImage?.exercise_name}</DialogTitle>
            <DialogDescription>
              Master image for exercise demonstrations
            </DialogDescription>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
              <div className="relative aspect-square max-h-[60vh] overflow-hidden rounded-lg">
                <Image
                  src={selectedImage.image_url}
                  alt={selectedImage.exercise_name}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Prompt used:</span>
                  <p className="text-muted-foreground mt-1">
                    {selectedImage.prompt_used || "Not recorded"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <span className="font-medium">Quality Score:</span>{" "}
                    {selectedImage.quality_score !== null
                      ? `${selectedImage.quality_score}/5`
                      : "Not rated"}
                  </div>
                  <div>
                    <span className="font-medium">Source:</span> master library
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedImage(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmImage !== null}
        onOpenChange={() => setDeleteConfirmImage(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Master Image</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the master image for{" "}
              <strong>{deleteConfirmImage?.exercise_name}</strong>? This will
              also remove the image from storage.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmImage(null)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteImage}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
