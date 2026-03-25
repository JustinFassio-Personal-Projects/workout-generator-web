"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type MouseEvent,
} from "react";
import dynamic from "next/dynamic";
import { Timestamp } from "firebase/firestore";
import { ACTIONS } from "react-joyride";
import type {
  EventData as JoyrideEventData,
  Props as JoyrideProps,
  Step as JoyrideStep,
  TooltipRenderProps,
} from "react-joyride";
import { toast } from "sonner";

import type { UserProfile } from "@/types/firestore";
import type { WorkoutTourAnchor } from "./WorkoutDisplay";
import {
  trackWorkoutDetailsTourCompleted,
  trackWorkoutDetailsTourDeferredMobile,
  trackWorkoutDetailsTourDismissed,
  trackWorkoutDetailsTourStarted,
  trackWorkoutDetailsTourStepCompleted,
  trackWorkoutDetailsTourStepViewed,
  trackWorkoutDetailsTourTargetMissing,
  type WorkoutDetailsTourStepId,
} from "@/lib/workout-details-tour-analytics";
import {
  isWorkoutDetailsTourAutoLaunchEligible,
  WORKOUT_DETAILS_TOUR_SCRIPT_VERSION,
} from "@/lib/workout-details-tour-version";

const Joyride = dynamic<JoyrideProps>(
  () => import("react-joyride").then((m) => m.Joyride),
  { ssr: false }
);

const DESKTOP_TOUR_MEDIA_QUERY = "(min-width: 1024px)";

function subscribeDesktopViewport(callback: () => void) {
  const mq = window.matchMedia(DESKTOP_TOUR_MEDIA_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getDesktopViewportSnapshot() {
  return window.matchMedia(DESKTOP_TOUR_MEDIA_QUERY).matches;
}

function getDesktopViewportServerSnapshot() {
  return false;
}

type WorkoutOnboardingProps = {
  workoutId: string;
  tourAnchor: WorkoutTourAnchor | null;
  profile: UserProfile | null;
  profileLoading: boolean;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  /** Notifies parent when the Joyride run state changes (for TooltipProvider tuning, etc.). */
  onRunChange?: (running: boolean) => void;
  /** When true, skip the one-time auto-launch (e.g. post-generate review intro modal is open). */
  suppressAutoLaunch?: boolean;
};

const STEP_IDS: WorkoutDetailsTourStepId[] = [
  "ai-edit",
  "add-exercise",
  "order-check",
  "select-image",
  "coach-info",
];

function selectorForStepId(stepId: WorkoutDetailsTourStepId): string {
  return `[data-tour="${stepId}"]`;
}

function getStepIdForIndex(
  index: number | null | undefined
): WorkoutDetailsTourStepId | "unknown" {
  if (index == null) return "unknown";
  return STEP_IDS[index] ?? "unknown";
}

function stopTourForMissingTarget(
  stepId: WorkoutDetailsTourStepId | "unknown",
  stepIndex: number,
  source: "listener_retry" | "joyride_error"
): void {
  trackWorkoutDetailsTourTargetMissing(stepId, stepIndex, source);
  toast.error(
    "Tour step is unavailable. The tour was paused—you can keep editing your workout."
  );
}

type JoyrideCloseStyles = CSSProperties & {
  color?: string;
  height?: number | string;
  width?: number | string;
};

/** Matches react-joyride's default close control (X) so styling stays consistent. */
function JoyrideTooltipCloseGlyph({
  closeProps,
  styles: closeStyles,
}: {
  closeProps: TooltipRenderProps["closeProps"] & { children?: unknown };
  styles: JoyrideCloseStyles;
}) {
  const { children, ...restClose } = closeProps;
  void children;
  const { color, height, width, ...style } = closeStyles;
  return (
    <button
      data-testid="button-close"
      style={style}
      type="button"
      {...restClose}
    >
      <svg
        height={typeof height === "number" ? `${height}px` : height}
        preserveAspectRatio="xMidYMid"
        version="1.1"
        viewBox="0 0 18 18"
        width={typeof width === "number" ? `${width}px` : width}
        xmlns="http://www.w3.org/2000/svg"
      >
        <g>
          <path
            d="M8.13911129,9.00268191 L0.171521827,17.0258467 C-0.0498027049,17.248715 -0.0498027049,17.6098394 0.171521827,17.8327545 C0.28204354,17.9443526 0.427188206,17.9998706 0.572051765,17.9998706 C0.71714958,17.9998706 0.862013139,17.9443526 0.972581703,17.8327545 L9.0000937,9.74924618 L17.0276057,17.8327545 C17.1384085,17.9443526 17.2832721,17.9998706 17.4281356,17.9998706 C17.5729992,17.9998706 17.718097,17.9443526 17.8286656,17.8327545 C18.0499901,17.6098862 18.0499901,17.2487618 17.8286656,17.0258467 L9.86135722,9.00268191 L17.8340066,0.973848225 C18.0553311,0.750979934 18.0553311,0.389855532 17.8340066,0.16694039 C17.6126821,-0.0556467968 17.254037,-0.0556467968 17.0329467,0.16694039 L9.00042166,8.25611765 L0.967006424,0.167268345 C0.745681892,-0.0553188426 0.387317931,-0.0553188426 0.165993399,0.167268345 C-0.0553311331,0.390136635 -0.0553311331,0.751261038 0.165993399,0.974176179 L8.13920499,9.00268191 L8.13911129,9.00268191 Z"
            fill={color}
          />
        </g>
      </svg>
    </button>
  );
}

const WorkoutDetailsTourAdvanceContext = createContext<
  ((stepIndex: number) => void) | undefined
>(undefined);

function WorkoutDetailsTourTooltip(props: TooltipRenderProps) {
  const onAdvanceStep = useContext(WorkoutDetailsTourAdvanceContext);
  const { closeProps, index, isLastStep, skipProps, step, tooltipProps } =
    props;
  const { buttons, content, styles, title } = step;

  const handleNextTool = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onAdvanceStep?.(index);
  };

  const nextLabel = isLastStep ? "Finish tour" : "Next tool";

  const showFooter = buttons.some(
    (b) => b === "back" || b === "primary" || b === "skip"
  );

  const ariaProps = title
    ? {
        "aria-labelledby": "joyride-tooltip-title",
        "aria-describedby": "joyride-tooltip-content",
      }
    : {
        "aria-label":
          typeof content === "string" ? content : "Workout editor tour step",
        "aria-describedby": "joyride-tooltip-content",
      };

  return (
    <div
      key="JoyrideTooltip"
      className="react-joyride__tooltip"
      data-joyride-step={index}
      {...(step.id != null ? { "data-joyride-id": step.id } : {})}
      style={styles.tooltip}
      {...tooltipProps}
      {...ariaProps}
    >
      <div style={styles.tooltipContainer}>
        {title ? (
          <h4 id="joyride-tooltip-title" style={styles.tooltipTitle}>
            {title}
          </h4>
        ) : null}
        <div id="joyride-tooltip-content" style={styles.tooltipContent}>
          {content}
        </div>
      </div>
      {showFooter ? (
        <div style={styles.tooltipFooter}>
          <div style={styles.tooltipFooterSpacer}>
            {buttons.includes("skip") && !isLastStep ? (
              <button
                aria-live="off"
                data-testid="button-skip"
                style={styles.buttonSkip}
                type="button"
                {...skipProps}
              />
            ) : null}
          </div>
          <button
            aria-label={nextLabel}
            data-action="next-tool"
            data-testid="button-next-tool"
            onClick={handleNextTool}
            style={styles.buttonPrimary}
            title={nextLabel}
            type="button"
          >
            {nextLabel}
          </button>
        </div>
      ) : null}
      {buttons.includes("close") ? (
        <JoyrideTooltipCloseGlyph
          closeProps={closeProps}
          styles={styles.buttonClose as JoyrideCloseStyles}
        />
      ) : null}
    </div>
  );
}

export function WorkoutOnboarding({
  workoutId,
  tourAnchor,
  profile,
  profileLoading,
  updateProfile,
  onRunChange,
  suppressAutoLaunch = false,
}: WorkoutOnboardingProps) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const startedRef = useRef(false);
  const tourStartedAtRef = useRef<number | null>(null);
  const viewedStepsRef = useRef<Set<number>>(new Set());
  const mobileDeferralTrackedRef = useRef(false);
  /** Prevents re-running the initial auto-launch when `run` flips false mid-tour (e.g. Joyride target error during DOM churn). */
  const tourAutoLaunchedRef = useRef(false);
  const lastTourWorkoutIdRef = useRef<string | null>(null);

  const desktopViewport = useSyncExternalStore(
    subscribeDesktopViewport,
    getDesktopViewportSnapshot,
    getDesktopViewportServerSnapshot
  );

  const baseEligible = useMemo(() => {
    if (profileLoading) return false;
    if (!profile) return false;
    if (!workoutId) return false;
    if (!tourAnchor) return false;
    if (!isWorkoutDetailsTourAutoLaunchEligible(profile)) return false;
    return true;
  }, [profileLoading, profile, workoutId, tourAnchor]);

  const eligible = baseEligible && desktopViewport;

  useEffect(() => {
    if (
      !baseEligible ||
      desktopViewport ||
      !workoutId ||
      mobileDeferralTrackedRef.current
    ) {
      return;
    }
    mobileDeferralTrackedRef.current = true;
    trackWorkoutDetailsTourDeferredMobile(workoutId);
  }, [baseEligible, desktopViewport, workoutId]);

  useEffect(() => {
    mobileDeferralTrackedRef.current = false;
  }, [workoutId]);

  useEffect(() => {
    onRunChange?.(run);
  }, [run, onRunChange]);

  useEffect(() => {
    if (!eligible) {
      document.documentElement.removeAttribute(
        "data-workout-details-tour-active"
      );
      return;
    }
    if (run) {
      document.documentElement.setAttribute(
        "data-workout-details-tour-active",
        "true"
      );
    } else {
      document.documentElement.removeAttribute(
        "data-workout-details-tour-active"
      );
    }
    return () => {
      document.documentElement.removeAttribute(
        "data-workout-details-tour-active"
      );
    };
  }, [eligible, run]);

  const steps = useMemo<JoyrideStep[]>(
    () => [
      {
        target: selectorForStepId("ai-edit"),
        content: "Try AI Edit to refine this exercise.",
        disableBeacon: true,
      },
      {
        target: selectorForStepId("add-exercise"),
        content: "Use Add to insert a new exercise before or after this one.",
        disableBeacon: true,
      },
      {
        target: selectorForStepId("order-check"),
        content:
          "Run an Order check to verify the exercise position looks safe.",
        disableBeacon: true,
      },
      {
        target: selectorForStepId("select-image"),
        content:
          "Choose Image lets you pick a demonstration image for this exercise.",
        disableBeacon: true,
      },
      {
        target: selectorForStepId("coach-info"),
        content:
          "Coach Explain generates a deeper breakdown for this exercise.",
        disableBeacon: true,
      },
    ],
    []
  );

  useEffect(() => {
    if (!eligible) {
      queueMicrotask(() => {
        setRun(false);
        setReady(false);
      });
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 20;

    const check = () => {
      if (cancelled) return;
      const el = document.querySelector(selectorForStepId("ai-edit"));
      if (el) {
        setReady(true);
        return;
      }
      attempts += 1;
      if (attempts >= maxAttempts) {
        setReady(false);
        return;
      }
      requestAnimationFrame(check);
    };

    requestAnimationFrame(check);
    return () => {
      cancelled = true;
    };
  }, [eligible]);

  useEffect(() => {
    if (lastTourWorkoutIdRef.current !== workoutId) {
      lastTourWorkoutIdRef.current = workoutId;
      tourAutoLaunchedRef.current = false;
    }
  }, [workoutId]);

  // Auto-start once per eligible session / workout — do NOT depend on `run`. If `run`
  // goes false mid-tour (Joyride target error while lists remount), we must not reset
  // stepIndex to 0 or users loop back to AI Edit after Add exercise.
  useEffect(() => {
    if (!eligible) {
      tourAutoLaunchedRef.current = false;
      return;
    }
    if (!ready) return;
    if (suppressAutoLaunch) return;
    if (tourAutoLaunchedRef.current) return;

    tourAutoLaunchedRef.current = true;
    queueMicrotask(() => {
      setStepIndex(0);
      viewedStepsRef.current = new Set();
      startedRef.current = false;
      setRun(true);
    });
  }, [eligible, ready, suppressAutoLaunch]);

  useEffect(() => {
    if (!run) return;
    if (!tourAnchor) return;
    if (startedRef.current) return;
    startedRef.current = true;
    tourStartedAtRef.current = Date.now();
    trackWorkoutDetailsTourStarted({
      workoutId,
      anchorSectionIndex: tourAnchor.sectionIdx,
      anchorExerciseIndex: tourAnchor.exerciseIdx,
    });
  }, [run, workoutId, tourAnchor]);

  useEffect(() => {
    if (!run) return;
    const stepId = STEP_IDS[stepIndex];
    if (stepId === undefined) return;
    if (viewedStepsRef.current.has(stepIndex)) return;
    viewedStepsRef.current.add(stepIndex);
    trackWorkoutDetailsTourStepViewed(stepId, stepIndex);
  }, [run, stepIndex]);

  /**
   * Joyride's default scroll uses scrollTop + scrollOffset and often aligns the
   * target to the top of the scroll container, which hides steps below the fold.
   * We skip built-in scrolling and center the active target vertically instead.
   */
  useEffect(() => {
    if (!run || !eligible) return;
    const stepId = STEP_IDS[stepIndex];
    if (stepId === undefined) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 45;

    const tryScroll = () => {
      if (cancelled) return;
      const el = document.querySelector(
        selectorForStepId(stepId)
      ) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({
          behavior: stepIndex === 0 ? "smooth" : "auto",
          block: "center",
          inline: "nearest",
        });
        return;
      }
      attempts += 1;
      if (attempts >= maxAttempts) return;
      requestAnimationFrame(tryScroll);
    };

    requestAnimationFrame(tryScroll);
    return () => {
      cancelled = true;
    };
  }, [run, eligible, stepIndex]);

  const advanceAfterStepAction = useCallback(
    (completedStepIndex: number) => {
      const lastIdx = STEP_IDS.length - 1;
      const stepId = STEP_IDS[completedStepIndex];
      if (!stepId) return;

      if (completedStepIndex < lastIdx) {
        trackWorkoutDetailsTourStepCompleted(
          stepId,
          completedStepIndex,
          completedStepIndex + 1
        );
        setStepIndex(completedStepIndex + 1);
        return;
      }

      trackWorkoutDetailsTourStepCompleted(
        stepId,
        completedStepIndex,
        completedStepIndex + 1
      );
      setRun(false);

      const startedAt = tourStartedAtRef.current;
      const durationSeconds =
        startedAt != null
          ? Math.round((Date.now() - startedAt) / 1000)
          : undefined;

      void (async () => {
        try {
          await updateProfile({
            workout_details_tour_completed: true,
            workout_details_tour_completed_at: Timestamp.now(),
            workout_details_tour_completed_script_version:
              WORKOUT_DETAILS_TOUR_SCRIPT_VERSION,
          });
          trackWorkoutDetailsTourCompleted(workoutId, durationSeconds);
        } catch (e) {
          const msg =
            e instanceof Error ? e.message : "Failed to save tour completion";
          toast.error(msg);
        }
      })();
    },
    [updateProfile, workoutId]
  );

  useEffect(() => {
    if (!run || !eligible) return;
    const stepId = STEP_IDS[stepIndex];
    if (stepId === undefined) return;

    const capturedIndex = stepIndex;
    let cancelled = false;
    let rafId: number | null = null;
    let removeClick: (() => void) | null = null;

    const cleanupAttach = () => {
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      removeClick?.();
      removeClick = null;
    };

    let attempts = 0;
    const maxAttempts = 40;

    const tryResolve = () => {
      if (cancelled) return;
      const el = document.querySelector(
        selectorForStepId(stepId)
      ) as HTMLElement | null;
      if (el) {
        const onClick = () => {
          if (cancelled) return;
          requestAnimationFrame(() => {
            if (cancelled) return;
            advanceAfterStepAction(capturedIndex);
          });
        };
        el.addEventListener("click", onClick, { once: true });
        removeClick = () => el.removeEventListener("click", onClick);
        return;
      }

      attempts += 1;
      if (attempts >= maxAttempts) {
        const sid = getStepIdForIndex(capturedIndex);
        stopTourForMissingTarget(sid, capturedIndex, "listener_retry");
        setRun(false);
        return;
      }
      rafId = requestAnimationFrame(tryResolve);
    };

    tryResolve();

    return () => {
      cancelled = true;
      cleanupAttach();
    };
  }, [run, eligible, stepIndex, advanceAfterStepAction]);

  const dismiss = useCallback(
    async (reason: string, index: number | null | undefined) => {
      setRun(false);
      const stepId = getStepIdForIndex(index);
      trackWorkoutDetailsTourDismissed(stepId, index ?? -1, reason);

      try {
        await updateProfile({
          workout_details_tour_dismissed: true,
          workout_details_tour_dismissed_at: Timestamp.now(),
          workout_details_tour_dismissed_script_version:
            WORKOUT_DETAILS_TOUR_SCRIPT_VERSION,
        });
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "Failed to dismiss onboarding tour";
        toast.error(msg);
      }
    },
    [updateProfile]
  );

  const handleJoyrideCallback = useCallback(
    (data: JoyrideEventData) => {
      const { action, index, type } = data;

      if (action === ACTIONS.SKIP) {
        void dismiss("skip_button", index);
        return;
      }
      if (action === ACTIONS.CLOSE) {
        void dismiss("close_button", index);
        return;
      }

      if (type === "error:target_not_found" || type === "error") {
        const i = index ?? stepIndex;
        const sid = getStepIdForIndex(i);
        stopTourForMissingTarget(sid, i, "joyride_error");
        setRun(false);
      }
    },
    [dismiss, stepIndex]
  );

  if (!eligible) return null;

  return (
    <WorkoutDetailsTourAdvanceContext.Provider value={advanceAfterStepAction}>
      <Joyride
        steps={steps}
        run={run}
        stepIndex={stepIndex}
        continuous={false}
        tooltipComponent={WorkoutDetailsTourTooltip}
        locale={{
          skip: "Skip tour",
          close: "Close tour",
        }}
        options={{
          zIndex: 10000,
          primaryColor: "hsl(82.7,77.9%,55.5%)",
          buttons: ["skip", "close"],
          closeButtonAction: "skip",
          overlayClickAction: false,
          blockTargetInteraction: false,
          showProgress: false,
          dismissKeyAction: "close",
          disableFocusTrap: true,
          skipScroll: true,
          // After Add exercise, lists remount; give Joyride time before target_not_found.
          targetWaitTimeout: 4000,
        }}
        onEvent={(data) => handleJoyrideCallback(data)}
      />
    </WorkoutDetailsTourAdvanceContext.Provider>
  );
}
