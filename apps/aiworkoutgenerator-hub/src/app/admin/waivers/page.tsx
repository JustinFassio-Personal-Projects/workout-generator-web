"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  RefreshCw,
  Loader2,
  ShieldX,
  AlertCircle,
  Eye,
  CheckCircle2,
} from "lucide-react";

import { useUser } from "@/lib/auth";
import { getIdToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import type { LiabilityWaiver, UserWaiverAgreement } from "@/types/firestore";
import {
  formatTimestamp,
  formatTimestampDateTime,
} from "@/lib/utils/timestamp";

type ViewMode = "waivers" | "agreements";

export default function AdminWaiversPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useUser();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminCheckComplete, setAdminCheckComplete] = useState(false);
  const [waivers, setWaivers] = useState<LiabilityWaiver[]>([]);
  const [agreements, setAgreements] = useState<UserWaiverAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("waivers");
  const [selectedWaiver, setSelectedWaiver] = useState<LiabilityWaiver | null>(
    null
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewAgreementsDialogOpen, setViewAgreementsDialogOpen] =
    useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Create waiver form state
  const [newWaiver, setNewWaiver] = useState({
    version: "",
    title: "",
    content: "",
    is_active: false,
  });

  // Filter state for agreements
  const [agreementFilters, setAgreementFilters] = useState({
    userId: "",
    waiverVersion: "",
  });

  // Check if user is admin
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

  // Fetch waivers
  const fetchWaivers = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setFetchError(null);
    try {
      const token = await getIdToken();
      const response = await fetch("/api/admin/waivers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch waivers");
      }

      const data = await response.json();
      setWaivers(data.waivers || []);
    } catch (error) {
      console.error("Error fetching waivers:", error);
      setFetchError("Failed to load waivers. Please try again.");
      toast.error("Failed to load waivers");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch agreements
  const fetchAgreements = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setFetchError(null);
    try {
      const token = await getIdToken();
      const params = new URLSearchParams();
      if (agreementFilters.userId) {
        params.append("userId", agreementFilters.userId);
      }
      if (agreementFilters.waiverVersion) {
        params.append("waiverVersion", agreementFilters.waiverVersion);
      }

      const response = await fetch(
        `/api/admin/waivers/agreements?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch agreements");
      }

      const data = await response.json();
      setAgreements(data.agreements || []);
    } catch (error) {
      console.error("Error fetching agreements:", error);
      setFetchError("Failed to load agreements. Please try again.");
      toast.error("Failed to load agreements");
    } finally {
      setLoading(false);
    }
  }, [user, agreementFilters]);

  // Check admin role when user changes
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
        fetchWaivers();
      }
    };

    verifyAdmin();
  }, [user, authLoading, router, checkAdminRole, fetchWaivers]);

  // Fetch agreements when view mode changes
  useEffect(() => {
    if (isAdmin && viewMode === "agreements") {
      fetchAgreements();
    }
  }, [isAdmin, viewMode, fetchAgreements]);

  const handleCreateWaiver = async () => {
    if (!user) return;

    setActionLoading(true);
    try {
      const token = await getIdToken();
      const response = await fetch("/api/admin/waivers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newWaiver),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create waiver");
      }

      toast.success(`Waiver ${newWaiver.version} created successfully`);
      setCreateDialogOpen(false);
      setNewWaiver({ version: "", title: "", content: "", is_active: false });
      fetchWaivers();
    } catch (error) {
      console.error("Error creating waiver:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create waiver"
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewAgreements = async (waiver: LiabilityWaiver) => {
    setSelectedWaiver(waiver);
    setAgreementFilters((prev) => ({
      ...prev,
      waiverVersion: waiver.version,
    }));
    setViewAgreementsDialogOpen(true);
    // Fetch agreements for this waiver
    if (user) {
      try {
        const token = await getIdToken();
        const response = await fetch(
          `/api/admin/waivers/agreements?waiverVersion=${waiver.version}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setAgreements(data.agreements || []);
        }
      } catch (error) {
        console.error("Error fetching agreements:", error);
      }
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

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Liability Waiver Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage waiver versions and view user agreements
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={fetchWaivers}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Waiver
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
        <TabsList>
          <TabsTrigger value="waivers">Waiver Versions</TabsTrigger>
          <TabsTrigger value="agreements">User Agreements</TabsTrigger>
        </TabsList>

        {/* Waivers Tab */}
        <TabsContent value="waivers" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : fetchError ? (
            <Card className="border-destructive/50">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="h-16 w-16 text-destructive mb-4" />
                <h2 className="text-xl font-bold mb-2">
                  Failed to Load Waivers
                </h2>
                <p className="text-muted-foreground mb-6">{fetchError}</p>
                <Button onClick={fetchWaivers}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : waivers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-1">No waivers found</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first waiver version to get started.
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Waiver
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {waivers.map((waiver) => (
                <Card key={waiver.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {waiver.title}
                          {waiver.is_active && (
                            <Badge variant="default">Active</Badge>
                          )}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Version {waiver.version} • Created{" "}
                          {formatTimestamp(waiver.created_at)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewAgreements(waiver)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Agreements
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Version Hash:</span>{" "}
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">
                          {waiver.version_hash.substring(0, 16)}...
                        </code>
                      </div>
                      <div>
                        <span className="font-medium">Content Length:</span>{" "}
                        {waiver.content.length} characters
                      </div>
                      <div className="mt-4">
                        <details className="cursor-pointer">
                          <summary className="font-medium text-muted-foreground">
                            View Content
                          </summary>
                          <pre className="mt-2 p-4 bg-muted rounded text-xs overflow-auto max-h-64 whitespace-pre-wrap">
                            {waiver.content}
                          </pre>
                        </details>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Agreements Tab */}
        <TabsContent value="agreements" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="filter-user-id">User ID</Label>
                  <Input
                    id="filter-user-id"
                    placeholder="Filter by user ID"
                    value={agreementFilters.userId}
                    onChange={(e) =>
                      setAgreementFilters((prev) => ({
                        ...prev,
                        userId: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="filter-version">Waiver Version</Label>
                  <Input
                    id="filter-version"
                    placeholder="Filter by version"
                    value={agreementFilters.waiverVersion}
                    onChange={(e) =>
                      setAgreementFilters((prev) => ({
                        ...prev,
                        waiverVersion: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <Button
                onClick={fetchAgreements}
                className="mt-4"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Apply Filters
              </Button>
            </CardContent>
          </Card>

          {/* Agreements Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : agreements.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-1">
                  No agreements found
                </h3>
                <p className="text-muted-foreground">
                  {agreementFilters.userId || agreementFilters.waiverVersion
                    ? "Try adjusting your filters."
                    : "No user agreements have been recorded yet."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>User Agreements ({agreements.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Full Name</TableHead>
                        <TableHead>Version</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agreements.map((agreement) => (
                        <TableRow key={agreement.id}>
                          <TableCell className="font-mono text-xs">
                            {agreement.user_id.substring(0, 8)}...
                          </TableCell>
                          <TableCell>{agreement.full_name}</TableCell>
                          <TableCell>{agreement.waiver_version}</TableCell>
                          <TableCell>
                            {formatTimestampDateTime(agreement.created_at)}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {agreement.ip_address}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Agreed
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Waiver Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Waiver Version</DialogTitle>
            <DialogDescription>
              Create a new liability waiver version. If you mark it as active,
              all other waivers will be deactivated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="waiver-version">Version *</Label>
              <Input
                id="waiver-version"
                placeholder="e.g., 1.0.0"
                value={newWaiver.version}
                onChange={(e) =>
                  setNewWaiver((prev) => ({ ...prev, version: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="waiver-title">Title *</Label>
              <Input
                id="waiver-title"
                placeholder="e.g., Liability Waiver v1.0.0"
                value={newWaiver.title}
                onChange={(e) =>
                  setNewWaiver((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>
            <div>
              <Label htmlFor="waiver-content">Content *</Label>
              <Textarea
                id="waiver-content"
                placeholder="Enter the full waiver text..."
                value={newWaiver.content}
                onChange={(e) =>
                  setNewWaiver((prev) => ({ ...prev, content: e.target.value }))
                }
                rows={20}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="waiver-active"
                checked={newWaiver.is_active}
                onCheckedChange={(checked) =>
                  setNewWaiver((prev) => ({
                    ...prev,
                    is_active: checked === true,
                  }))
                }
              />
              <Label htmlFor="waiver-active" className="cursor-pointer">
                Set as active (will deactivate all other waivers)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateWaiver} disabled={actionLoading}>
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Waiver"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Agreements Dialog */}
      <Dialog
        open={viewAgreementsDialogOpen}
        onOpenChange={setViewAgreementsDialogOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Agreements for {selectedWaiver?.title || "Waiver"}
            </DialogTitle>
            <DialogDescription>
              View all user agreements for this waiver version.
            </DialogDescription>
          </DialogHeader>
          {agreements.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No agreements found for this waiver version.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agreements.map((agreement) => (
                    <TableRow key={agreement.id}>
                      <TableCell className="font-mono text-xs">
                        {agreement.user_id}
                      </TableCell>
                      <TableCell>{agreement.full_name}</TableCell>
                      <TableCell>
                        {formatTimestampDateTime(agreement.created_at)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {agreement.ip_address}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewAgreementsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
