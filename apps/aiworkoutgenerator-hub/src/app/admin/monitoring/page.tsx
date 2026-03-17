"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  AlertCircle,
  ShieldX,
  Loader2,
  RefreshCw,
  Bell,
} from "lucide-react";

import { useUser, getIdToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const SENTRY_ISSUES_URL =
  "https://ai-workout-generator.sentry.io/issues/?project=4510706421923840";
const SENTRY_ALERTS_URL =
  "https://ai-workout-generator.sentry.io/alerts/rules/";

type SentryIssueSummary = {
  id: string;
  title: string;
  count: string;
  lastSeen: string;
  permalink: string;
  shortId?: string;
};

export default function AdminMonitoringPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);
  const [issues, setIssues] = useState<SentryIssueSummary[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issuesConfigured, setIssuesConfigured] = useState<boolean | null>(
    null
  );
  const [issuesError, setIssuesError] = useState<string | null>(null);

  const checkAdminRole = useCallback(async () => {
    if (!user) return false;
    try {
      const tokenResult = await user.getIdTokenResult(true);
      const role = tokenResult.claims.role as string | undefined;
      return role === "admin" || role === "super_admin";
    } catch (error) {
      console.error("Error checking admin role:", error);
      return false;
    }
  }, [user]);

  const fetchIssues = useCallback(async () => {
    if (!user) return;
    setIssuesLoading(true);
    setIssuesError(null);
    try {
      const token = await getIdToken();
      const response = await fetch("/api/admin/sentry/issues", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.status === 503) {
        const data = await response.json().catch(() => ({}));
        setIssuesConfigured(data.configured === false ? false : null);
        setIssues([]);
        return;
      }

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setIssuesError(data.error || "Failed to load recent issues.");
        setIssues([]);
        return;
      }

      const data = await response.json();
      setIssuesConfigured(true);
      setIssues(data.issues ?? []);
    } catch (error) {
      console.error("Error fetching Sentry issues:", error);
      setIssuesError("Failed to load recent issues. Try again.");
      setIssues([]);
    } finally {
      setIssuesLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    const verifyAdmin = async () => {
      const adminStatus = await checkAdminRole();
      setIsAdmin(adminStatus);
      setAdminCheckComplete(true);

      if (adminStatus) {
        fetchIssues();
      }
    };

    verifyAdmin();
  }, [user, authLoading, router, checkAdminRole, fetchIssues]);

  if (authLoading || !adminCheckComplete) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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

  const formatLastSeen = (iso: string) => {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold">Monitoring</h1>
          <p className="text-muted-foreground mt-1">
            Sentry error tracking and alerts
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-muted-foreground text-sm">
              Open Sentry to view issues, create alerts, and manage
              notifications.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild variant="default">
                <a
                  href={SENTRY_ISSUES_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Open Sentry Issues
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
              <Button asChild variant="outline">
                <a
                  href={SENTRY_ALERTS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Open Sentry Alerts
                  <ExternalLink className="h-4 w-4 ml-2" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-row items-center justify-between">
              <CardTitle>Recent issues</CardTitle>
              <Button
                variant="outline"
                size="icon"
                onClick={fetchIssues}
                disabled={issuesLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${issuesLoading ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm mb-4">
              Recent errors from the javascript-nextjs project. Configure
              SENTRY_AUTH_TOKEN, SENTRY_ORG, and SENTRY_PROJECT at runtime to
              load issues here.
            </p>
            {issuesLoading &&
              issues.length === 0 &&
              issuesConfigured !== false && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}

            {!issuesLoading && issuesConfigured === false && (
              <p className="text-muted-foreground py-6 text-center text-sm">
                Configure SENTRY_AUTH_TOKEN, SENTRY_ORG, and SENTRY_PROJECT at
                runtime to see recent issues here.
              </p>
            )}

            {issuesError && !issuesLoading && (
              <div className="flex flex-col items-center justify-center py-6 gap-4">
                <p className="text-destructive text-sm">{issuesError}</p>
                <Button variant="outline" onClick={fetchIssues}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            )}

            {!issuesLoading &&
              issuesConfigured === true &&
              issues.length === 0 &&
              !issuesError && (
                <p className="text-muted-foreground py-6 text-center text-sm">
                  No recent issues.
                </p>
              )}

            {!issuesLoading && issues.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Last seen</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell className="font-medium max-w-[320px] truncate">
                        {issue.title}
                      </TableCell>
                      <TableCell>{issue.count}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatLastSeen(issue.lastSeen)}
                      </TableCell>
                      <TableCell>
                        <Button asChild variant="ghost" size="sm">
                          <a
                            href={issue.permalink}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
