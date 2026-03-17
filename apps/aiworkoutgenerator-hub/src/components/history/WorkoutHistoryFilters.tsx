"use client";

import { Filter, ArrowUpDown, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type {
  WorkoutHistoryFilters as FilterType,
  WorkoutStatus,
  WorkoutFocusFilter,
  DurationFilter,
  DateRangeFilter,
  SortOption,
} from "@/services/history";

interface WorkoutHistoryFiltersProps {
  filters: FilterType;
  onFiltersChange: (filters: FilterType) => void;
  className?: string;
}

const STATUS_OPTIONS: { value: WorkoutStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "completed", label: "Completed" },
  { value: "scheduled", label: "Scheduled" },
  { value: "draft", label: "Draft" },
];

const FOCUS_OPTIONS: { value: WorkoutFocusFilter; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "strength", label: "Strength" },
  { value: "cardio", label: "Cardio" },
  { value: "hiit", label: "HIIT" },
  { value: "flexibility", label: "Flexibility" },
  { value: "yoga", label: "Yoga" },
];

const DURATION_OPTIONS: { value: DurationFilter; label: string }[] = [
  { value: "all", label: "Any Duration" },
  { value: "quick", label: "Quick (<30 min)" },
  { value: "standard", label: "Standard (30-45 min)" },
  { value: "long", label: "Long (>45 min)" },
];

const DATE_RANGE_OPTIONS: { value: DateRangeFilter; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "90d", label: "Last 90 Days" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "duration_asc", label: "Duration (Short to Long)" },
  { value: "duration_desc", label: "Duration (Long to Short)" },
  { value: "difficulty", label: "Difficulty" },
];

function countActiveFilters(filters: FilterType): number {
  let count = 0;
  if (filters.status && filters.status !== "all") count++;
  if (filters.focus && filters.focus !== "all") count++;
  if (filters.duration && filters.duration !== "all") count++;
  if (filters.dateRange && filters.dateRange !== "all") count++;
  return count;
}

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-muted-foreground">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function WorkoutHistoryFilters({
  filters,
  onFiltersChange,
  className,
}: WorkoutHistoryFiltersProps) {
  const activeCount = countActiveFilters(filters);

  const updateFilter = <K extends keyof FilterType>(
    key: K,
    value: FilterType[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      status: "all",
      focus: "all",
      duration: "all",
      dateRange: "all",
      sort: "newest",
    });
  };

  return (
    <div className={className}>
      {/* Desktop Filters - visible on larger screens */}
      <div className="hidden md:flex items-center gap-3 flex-wrap">
        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
          <Select
            value={filters.sort || "newest"}
            onValueChange={(v) => updateFilter("sort", v as SortOption)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <Select
          value={filters.dateRange || "all"}
          onValueChange={(v) => updateFilter("dateRange", v as DateRangeFilter)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status */}
        <Select
          value={filters.status || "all"}
          onValueChange={(v) =>
            updateFilter("status", v as WorkoutStatus | "all")
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Focus */}
        <Select
          value={filters.focus || "all"}
          onValueChange={(v) => updateFilter("focus", v as WorkoutFocusFilter)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {FOCUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Duration */}
        <Select
          value={filters.duration || "all"}
          onValueChange={(v) => updateFilter("duration", v as DurationFilter)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Duration" />
          </SelectTrigger>
          <SelectContent>
            {DURATION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <X className="w-4 h-4 mr-1" />
            Clear ({activeCount})
          </Button>
        )}
      </div>

      {/* Mobile Filters - sheet-based */}
      <div className="flex md:hidden items-center gap-2">
        {/* Sort (always visible on mobile) */}
        <Select
          value={filters.sort || "newest"}
          onValueChange={(v) => updateFilter("sort", v as SortOption)}
        >
          <SelectTrigger className="flex-1">
            <ArrowUpDown className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filter Sheet */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="relative">
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {activeCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>Filter Workouts</SheetTitle>
              <SheetDescription>
                Narrow down your workout history
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <FilterSelect
                label="Date Range"
                value={filters.dateRange || "all"}
                options={DATE_RANGE_OPTIONS}
                onChange={(v) => updateFilter("dateRange", v)}
              />

              <FilterSelect
                label="Status"
                value={filters.status || "all"}
                options={STATUS_OPTIONS}
                onChange={(v) => updateFilter("status", v)}
              />

              <FilterSelect
                label="Workout Type"
                value={filters.focus || "all"}
                options={FOCUS_OPTIONS}
                onChange={(v) => updateFilter("focus", v)}
              />

              <FilterSelect
                label="Duration"
                value={filters.duration || "all"}
                options={DURATION_OPTIONS}
                onChange={(v) => updateFilter("duration", v)}
              />

              {activeCount > 0 && (
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="w-full"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear All Filters
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
