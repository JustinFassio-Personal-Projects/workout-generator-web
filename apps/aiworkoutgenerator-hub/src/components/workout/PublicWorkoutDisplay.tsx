"use client";

import Link from "next/link";
import {
  Clock,
  Flame,
  Dumbbell,
  Zap,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PublicExerciseCard } from "./PublicExerciseCard";
import type { TrainerWorkout } from "@/types/firestore";

interface PublicWorkoutDisplayProps {
  workout: TrainerWorkout;
}

/**
 * Read-only public workout display component.
 * Shows a snapshot of the completed workout with all exercises, sets, images, and Coach Explain.
 */
export function PublicWorkoutDisplay({ workout }: PublicWorkoutDisplayProps) {
  if (!workout.sections || workout.sections.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <p className="text-lg mb-4">No workout sections available.</p>
          <Button asChild>
            <Link href="https://aiworkoutgenerator.com">Go to Homepage</Link>
          </Button>
        </div>
      </div>
    );
  }

  const completedExercisesCount = workout.sections.reduce(
    (count, section) =>
      count +
      (section.exercises?.filter((ex) => ex.completed === true).length || 0),
    0
  );
  const totalExercisesCount = workout.sections.reduce(
    (count, section) => count + (section.exercises?.length || 0),
    0
  );

  const getSectionIcon = (type: string) => {
    switch (type) {
      case "Warmup":
        return Flame;
      case "Main Workout":
        return Dumbbell;
      case "Finisher":
        return Zap;
      case "Cooldown":
        return CheckCircle2;
      default:
        return Dumbbell;
    }
  };

  const getSectionColor = (type: string) => {
    switch (type) {
      case "Warmup":
        return "bg-yellow-500/20 border-yellow-500/30 text-yellow-400";
      case "Main Workout":
        return "bg-blue-500/20 border-blue-500/30 text-blue-400";
      case "Finisher":
        return "bg-orange-500/20 border-orange-500/30 text-orange-400";
      case "Cooldown":
        return "bg-emerald-500/20 border-emerald-500/30 text-emerald-400";
      default:
        return "bg-slate-700/50 border-slate-600 text-slate-300";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <main className="max-w-5xl mx-auto w-full p-4 space-y-8 py-8">
        {/* Header */}
        <header className="bg-slate-900/40 backdrop-blur-md border border-slate-700 rounded-xl px-4 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2 flex-wrap">
              <Dumbbell className="w-5 h-5 text-orange-500" /> Workout Plan
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {workout.title}
              {workout.focus && ` • ${workout.focus}`}
              {workout.trainerName && ` • Designed by ${workout.trainerName}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              variant={
                workout.difficulty === "advanced"
                  ? "destructive"
                  : workout.difficulty === "intermediate"
                    ? "default"
                    : "secondary"
              }
              className="text-xs"
            >
              {workout.difficulty}
            </Badge>
          </div>
        </header>

        {/* Intro with CTA */}
        <section className="bg-slate-900/40 backdrop-blur-md rounded-xl p-6 border border-slate-700">
          <p className="text-slate-300 leading-relaxed text-sm mb-4">
            This athlete completed a challenging workout session. Below
            you&apos;ll see the full workout plan they followed, including all
            exercises, sets, and training insights.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-slate-700">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>{workout.totalDuration} min</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Flame className="w-4 h-4 text-orange-500" />
                <span>{workout.estimatedCalories} kcal</span>
              </div>
              {totalExercisesCount > 0 && (
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    {completedExercisesCount}/{totalExercisesCount} exercises
                  </span>
                </div>
              )}
            </div>
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 text-white"
              asChild
            >
              <Link href="https://aiworkoutgenerator.com">
                Create Your Own Workout
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        </section>

        {/* Trainer Notes */}
        {workout.trainerNotes && (
          <section className="bg-slate-900/40 backdrop-blur-md rounded-xl p-6 border border-slate-700">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg shrink-0">
                <CheckCircle2 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm uppercase mb-1">
                  Trainer&apos;s Note
                </h4>
                <p className="text-slate-300 text-sm italic">
                  &quot;{workout.trainerNotes}&quot;
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Workout Sections */}
        <div className="space-y-8">
          {workout.sections.map((section, sectionIdx) => {
            const SectionIcon = getSectionIcon(section.type);
            const sectionColor = getSectionColor(section.type);
            const sectionExercises = section.exercises || [];
            const completedInSection = sectionExercises.filter(
              (ex) => ex.completed === true
            ).length;

            return (
              <section
                key={`${section.type}-${sectionIdx}`}
                className="bg-slate-900/40 backdrop-blur-md rounded-xl p-6 border border-slate-700"
              >
                {/* Section Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg border ${sectionColor} shrink-0`}
                    >
                      <SectionIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">
                        {section.type}
                      </h2>
                      {section.durationEstimate && (
                        <p className="text-sm text-slate-400">
                          {section.durationEstimate}
                        </p>
                      )}
                    </div>
                  </div>
                  {sectionExercises.length > 0 && (
                    <Badge
                      variant="outline"
                      className="border-slate-700 text-slate-300"
                    >
                      {completedInSection}/{sectionExercises.length} completed
                    </Badge>
                  )}
                </div>

                {/* Exercises */}
                {sectionExercises.length === 0 ? (
                  <div className="text-center text-slate-400 py-8 text-sm">
                    No exercises in this section.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sectionExercises.map((exercise, exerciseIdx) => (
                      <PublicExerciseCard
                        key={`${exercise.name}-${exerciseIdx}`}
                        exercise={exercise}
                      />
                    ))}
                  </div>
                )}

                {/* Section CTA (between sections, not after last) */}
                {sectionIdx < workout.sections.length - 1 && (
                  <div className="mt-6 pt-6 border-t border-slate-700">
                    <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800 text-center">
                      <p className="text-sm text-slate-300 mb-3">
                        Want workouts like this?
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                        asChild
                      >
                        <Link href="https://aiworkoutgenerator.com">
                          Get Started Free
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* Personalization Card */}
        {workout.personalization && workout.personalization.length > 0 && (
          <div className="bg-slate-900/40 backdrop-blur-md rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-500/20 p-3 rounded-xl">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  Personalized For This Athlete
                </h3>
                <p className="text-slate-400 text-sm">
                  How this workout was adapted to their profile
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {workout.personalization.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl"
                >
                  <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                    {item.attribute}
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {item.adjustment}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Final CTA */}
        <section className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-8 text-white text-center shadow-2xl">
          <h2 className="text-2xl font-bold mb-3">
            Ready to Start Your Fitness Journey?
          </h2>
          <p className="text-orange-100 mb-6 text-base max-w-2xl mx-auto">
            Get personalized AI-generated workouts tailored to your goals,
            equipment, and fitness level. Start your fitness journey today with
            a free trial.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-orange-600 hover:bg-white/90 h-12 px-8 text-base font-semibold shadow-lg"
              asChild
            >
              <Link href="https://aiworkoutgenerator.com">
                Get Started Free
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/50 text-white hover:bg-white/10 h-12 px-8 text-base font-semibold"
              asChild
            >
              <Link href="https://aiworkoutgenerator.com">Learn More</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
