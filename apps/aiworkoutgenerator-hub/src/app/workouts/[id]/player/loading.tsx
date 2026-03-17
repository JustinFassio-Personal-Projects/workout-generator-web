import { Skeleton } from "@/components/ui/skeleton";

export default function WorkoutPlayerLoading() {
  return (
    <div className="container mx-auto py-8 max-w-4xl px-4">
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Safety toggle skeleton */}
        <Skeleton className="h-16 w-full rounded-full" />

        {/* Phase navigation skeleton */}
        <div className="flex gap-4">
          <Skeleton className="h-12 flex-1" />
          <Skeleton className="h-12 flex-1" />
          <Skeleton className="h-12 flex-1" />
        </div>

        {/* Exercise tabs skeleton */}
        <div className="flex gap-2 overflow-x-auto">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-32 rounded-full" />
          ))}
        </div>

        {/* Exercise content skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
