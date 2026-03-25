import { Suspense } from "react";

import { WorkoutDetailsContent } from "./WorkoutDetailsContent";

export default function WorkoutDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 max-w-5xl">
          <div className="text-center text-muted-foreground animate-pulse">
            Loading...
          </div>
        </div>
      }
    >
      <WorkoutDetailsContent />
    </Suspense>
  );
}
