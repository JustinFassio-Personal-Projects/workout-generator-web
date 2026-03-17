"use client";

import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Welcome to AI Workout Generator
          </CardTitle>
          <CardDescription className="text-center">
            Sign in or create an account to start your journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="h-96" />}>
            <AuthForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
