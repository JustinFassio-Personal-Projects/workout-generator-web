"use client";

import { useState, useRef, useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type {
  SupportTicketCategory,
  SupportTicketPriority,
} from "@/types/support";

// ============================================
// Constants
// ============================================

const CATEGORY_OPTIONS: Array<{
  value: SupportTicketCategory;
  label: string;
}> = [
  { value: "billing", label: "Billing" },
  { value: "technical", label: "Technical Issue" },
  { value: "feature_request", label: "Feature Request" },
  { value: "bug", label: "Bug Report" },
  { value: "other", label: "Other" },
];

const PRIORITY_OPTIONS: Array<{
  value: SupportTicketPriority;
  label: string;
}> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

// ============================================
// Types
// ============================================

interface FormData {
  subject: string;
  description: string;
  category: SupportTicketCategory | "";
  priority: SupportTicketPriority | "";
  website: string; // Honeypot
}

interface FormErrors {
  subject?: string;
  description?: string;
  category?: string;
  priority?: string;
}

interface SupportTicketFormProps {
  userId: string;
  onSubmit: (data: {
    subject: string;
    description: string;
    category: SupportTicketCategory;
    priority: SupportTicketPriority;
    user_id: string;
  }) => Promise<{ success: boolean; error?: string; retryAfter?: number }>;
  onSuccess?: () => void;
}

// ============================================
// Helper Functions
// ============================================

/**
 * Parse error message to identify field-specific errors
 */
function parseFieldError(error: string): {
  field?: keyof FormErrors;
  message: string;
} {
  const lowerError = error.toLowerCase();

  if (lowerError.includes("subject")) {
    return { field: "subject", message: error };
  }
  if (lowerError.includes("description")) {
    return { field: "description", message: error };
  }
  if (lowerError.includes("category")) {
    return { field: "category", message: error };
  }
  if (lowerError.includes("priority")) {
    return { field: "priority", message: error };
  }
  return { message: error };
}

/**
 * Validate form data client-side
 */
function validateForm(data: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.subject || data.subject.trim().length < 5) {
    errors.subject = "Subject must be at least 5 characters";
  } else if (data.subject.length > 200) {
    errors.subject = "Subject must be no more than 200 characters";
  }

  if (!data.description || data.description.trim().length < 10) {
    errors.description = "Description must be at least 10 characters";
  } else if (data.description.length > 5000) {
    errors.description = "Description must be no more than 5000 characters";
  }

  if (!data.category) {
    errors.category = "Please select a category";
  }

  if (!data.priority) {
    errors.priority = "Please select a priority";
  }

  return errors;
}

// ============================================
// Component
// ============================================

export function SupportTicketForm({
  userId,
  onSubmit,
  onSuccess,
}: SupportTicketFormProps) {
  const [form, setForm] = useState<FormData>({
    subject: "",
    description: "",
    category: "",
    priority: "",
    website: "", // Honeypot - always empty
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setErrors({});

    // Validate form
    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Check honeypot
    if (form.website.trim() !== "") {
      // Silently reject spam
      return;
    }

    setSubmitting(true);

    try {
      const result = await onSubmit({
        subject: form.subject.trim(),
        description: form.description.trim(),
        category: form.category as SupportTicketCategory,
        priority: form.priority as SupportTicketPriority,
        user_id: userId,
      });

      if (result.success) {
        // Show success message
        toast.success("Support ticket submitted successfully!", {
          description: "We'll get back to you soon.",
          duration: 3000,
        });

        // Reset form
        setForm({
          subject: "",
          description: "",
          category: "",
          priority: "",
          website: "",
        });
        setErrors({});

        // Call onSuccess callback after a short delay to show success message
        if (onSuccess) {
          timeoutRef.current = setTimeout(() => {
            onSuccess();
          }, 2000);
        }
      } else {
        // Handle errors
        if (result.retryAfter) {
          const minutes = Math.ceil(result.retryAfter / 60);
          const seconds = result.retryAfter % 60;
          let timeMessage = "";
          if (minutes > 0) {
            timeMessage = `${minutes} minute${minutes !== 1 ? "s" : ""}`;
            if (seconds > 0) {
              timeMessage += ` and ${seconds} second${seconds !== 1 ? "s" : ""}`;
            }
          } else {
            timeMessage = `${seconds} second${seconds !== 1 ? "s" : ""}`;
          }
          toast.error("Rate limit exceeded", {
            description: `You've reached the limit of 5 tickets per hour. Please try again in ${timeMessage}.`,
            duration: 8000,
          });
        } else if (result.error) {
          const fieldError = parseFieldError(result.error);
          if (fieldError.field) {
            setErrors({ [fieldError.field]: fieldError.message });
          } else {
            toast.error("Failed to submit ticket", {
              description: fieldError.message,
              duration: 5000,
            });
          }
        }
      }
    } catch (error) {
      toast.error("Failed to submit ticket", {
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        duration: 5000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      {/* Honeypot field */}
      <input
        type="text"
        name="website"
        autoComplete="off"
        tabIndex={-1}
        style={{ position: "absolute", left: "-9999px" }}
        aria-hidden="true"
        value={form.website}
        onChange={(e) => setForm({ ...form, website: e.target.value })}
      />

      {/* Subject */}
      <div className="space-y-2">
        <Label htmlFor="subject">
          Subject <span className="text-destructive">*</span>
        </Label>
        <Input
          id="subject"
          value={form.subject}
          onChange={(e) => {
            setForm({ ...form, subject: e.target.value });
            if (errors.subject) setErrors({ ...errors, subject: undefined });
          }}
          disabled={submitting}
          placeholder="Brief description of your issue"
          maxLength={200}
          aria-describedby={errors.subject ? "subject-error" : "subject-help"}
          aria-invalid={!!errors.subject}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <div>
            {errors.subject && (
              <span
                id="subject-error"
                className="text-destructive"
                role="alert"
              >
                {errors.subject}
              </span>
            )}
            {!errors.subject && (
              <span id="subject-help">
                {form.subject.length}/200 characters
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">
          Description <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => {
            setForm({ ...form, description: e.target.value });
            if (errors.description)
              setErrors({ ...errors, description: undefined });
          }}
          disabled={submitting}
          placeholder="Please provide as much detail as possible..."
          rows={6}
          maxLength={5000}
          aria-describedby={
            errors.description ? "description-error" : "description-help"
          }
          aria-invalid={!!errors.description}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <div>
            {errors.description && (
              <span
                id="description-error"
                className="text-destructive"
                role="alert"
              >
                {errors.description}
              </span>
            )}
            {!errors.description && (
              <span id="description-help">
                {form.description.length}/5000 characters
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Category and Priority */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">
            Category <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.category}
            onValueChange={(value) => {
              setForm({ ...form, category: value as SupportTicketCategory });
              if (errors.category)
                setErrors({ ...errors, category: undefined });
            }}
            disabled={submitting}
          >
            <SelectTrigger id="category" aria-invalid={!!errors.category}>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <span className="text-xs text-destructive" role="alert">
              {errors.category}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">
            Priority <span className="text-destructive">*</span>
          </Label>
          <Select
            value={form.priority}
            onValueChange={(value) => {
              setForm({ ...form, priority: value as SupportTicketPriority });
              if (errors.priority)
                setErrors({ ...errors, priority: undefined });
            }}
            disabled={submitting}
          >
            <SelectTrigger id="priority" aria-invalid={!!errors.priority}>
              <SelectValue placeholder="Select a priority" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.priority && (
            <span className="text-xs text-destructive" role="alert">
              {errors.priority}
            </span>
          )}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Ticket"}
        </Button>
      </div>
    </form>
  );
}
