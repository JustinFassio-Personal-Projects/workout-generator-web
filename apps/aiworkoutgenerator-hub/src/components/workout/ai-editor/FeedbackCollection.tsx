"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ThumbsUp, ThumbsDown, Star, MessageSquare } from "lucide-react";
import { AIExerciseService } from "@/services/ai-exercise-service";

interface FeedbackCollectionProps {
  editId: string;
  workoutId: string;
  sectionIndex: number;
  exerciseIndex: number;
  onSuccess?: () => void;
}

/**
 * Component to collect user feedback (rating and optional feedback text) for an AI edit.
 */
export function FeedbackCollection({
  editId,
  workoutId,
  sectionIndex,
  exerciseIndex,
  onSuccess,
}: FeedbackCollectionProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleRatingSelect = useCallback((selectedRating: number) => {
    setRating(selectedRating);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!rating) {
      toast.error("Please select a rating");
      return;
    }

    setLoading(true);
    try {
      await AIExerciseService.submitEditRating(
        workoutId,
        sectionIndex,
        exerciseIndex,
        editId,
        rating,
        feedbackText.trim() || null
      );

      setSubmitted(true);
      toast.success("Thank you for your feedback!");
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      console.error("Error submitting feedback:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to submit feedback. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [
    rating,
    feedbackText,
    workoutId,
    sectionIndex,
    exerciseIndex,
    editId,
    onSuccess,
  ]);

  if (submitted) {
    return (
      <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
        <CardHeader>
          <CardTitle className="text-sm text-green-700 dark:text-green-400">
            Thank you for your feedback!
          </CardTitle>
          <CardDescription className="text-xs text-green-600 dark:text-green-500">
            Your rating has been recorded and helps us improve the AI exercise
            editor.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">How was this edit?</CardTitle>
        <CardDescription className="text-sm">
          Your feedback helps us improve the AI exercise editor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rating Selection - Thumbs Up/Down */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Rating</Label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => handleRatingSelect(5)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                rating === 5
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
              aria-label="Thumbs up - Good"
              aria-pressed={rating === 5}
            >
              <ThumbsUp
                className={`h-5 w-5 ${rating === 5 ? "text-primary" : "text-muted-foreground"}`}
              />
              <span className="text-sm font-medium">Good</span>
            </button>
            <button
              type="button"
              onClick={() => handleRatingSelect(1)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                rating === 1
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : "border-border hover:border-destructive/50 hover:bg-muted/50"
              }`}
              aria-label="Thumbs down - Needs improvement"
              aria-pressed={rating === 1}
            >
              <ThumbsDown
                className={`h-5 w-5 ${rating === 1 ? "text-destructive" : "text-muted-foreground"}`}
              />
              <span className="text-sm font-medium">Needs Improvement</span>
            </button>
          </div>

          {/* Star Rating Alternative */}
          <div className="flex items-center gap-2 pt-2">
            <Label className="text-xs text-muted-foreground">
              Or rate 1-5:
            </Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => handleRatingSelect(star)}
                  className={`transition-all ${
                    rating && rating >= star
                      ? "text-yellow-500"
                      : "text-muted-foreground hover:text-yellow-400"
                  }`}
                  aria-label={`Rate ${star} stars`}
                  aria-pressed={rating === star}
                >
                  <Star
                    className={`h-5 w-5 ${
                      rating && rating >= star ? "fill-current" : ""
                    }`}
                  />
                </button>
              ))}
              {rating && (
                <span className="text-xs text-muted-foreground ml-2">
                  ({rating}/5)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Optional Feedback Text */}
        <div className="space-y-2">
          <Label htmlFor="feedback-text" className="text-sm font-semibold">
            <MessageSquare className="h-4 w-4 inline mr-1" />
            Optional Feedback
          </Label>
          <Textarea
            id="feedback-text"
            placeholder="Tell us more about your experience with this edit (optional)..."
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={loading || !rating}
          className="w-full"
        >
          {loading ? "Submitting..." : "Submit Feedback"}
        </Button>
      </CardContent>
    </Card>
  );
}
