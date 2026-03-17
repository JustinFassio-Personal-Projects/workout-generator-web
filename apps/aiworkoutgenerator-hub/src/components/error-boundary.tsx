"use client";

import * as Sentry from "@sentry/nextjs";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{
    error: Error | null;
    resetError: () => void;
  }>;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  feedbackButtonRef = React.createRef<HTMLButtonElement>();
  _feedbackAttached = false;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    Sentry.captureException(error);
  }

  componentDidUpdate(
    _prevProps: ErrorBoundaryProps,
    prevState: ErrorBoundaryState
  ) {
    if (this.state.hasError && !prevState.hasError) {
      this._feedbackAttached = false;
    }
    if (
      this.state.hasError &&
      !this._feedbackAttached &&
      this.feedbackButtonRef.current
    ) {
      const feedback = Sentry.getFeedback();
      feedback?.attachTo(this.feedbackButtonRef.current);
      this._feedbackAttached = true;
    }
  }

  resetError = () => {
    this._feedbackAttached = false;
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const Fallback = this.props.fallback;
        return (
          <Fallback error={this.state.error} resetError={this.resetError} />
        );
      }

      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>
                An unexpected error occurred. Please try refreshing the page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <div className="rounded-md bg-destructive/10 p-3">
                  <p className="text-sm text-destructive font-mono">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button onClick={this.resetError} variant="outline">
                  Try Again
                </Button>
                <Button onClick={() => window.location.reload()}>
                  Refresh Page
                </Button>
                <Button
                  ref={this.feedbackButtonRef}
                  type="button"
                  variant="outline"
                >
                  Send feedback
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
