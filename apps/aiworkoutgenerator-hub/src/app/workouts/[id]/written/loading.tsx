import { Skeleton } from "@/components/ui/skeleton";

export default function WrittenWorkoutLoading() {
  return (
    <div className="container mx-auto py-8 max-w-2xl px-4">
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    </div>
  );
}
