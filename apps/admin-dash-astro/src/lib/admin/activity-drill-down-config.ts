/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Registry: which Hub adoption rows open the activity journey explorer and how list/timeline APIs map.
 */

/** Align fields with Firestore `user_activity_logs` rows returned by journey APIs. */
export type ActivityLogRow = {
  id: string;
  timestamp: string;
  action: string;
  user_id: string | null;
  /** From API enrichment (e.g. workout-journey list_starts + user_profiles). */
  user_display_name?: string | null;
  session_id: string | null;
  resource_id: string | null;
  workout_attempt_id: string | null;
  generation_id: string | null;
  details: Record<string, unknown>;
};

export type DrillDownListKind =
  | { type: 'workout_journey_starts' }
  | { type: 'activity_journey_list'; action: string };

export type DrillDownTimelineKind =
  | { type: 'workout_attempt_timeline' }
  | { type: 'generation_id_timeline' }
  | { type: 'session_id_timeline' }
  | { type: 'none' }
  | { type: 'per_row' };

/** Resolved target for View journey (attempt, generation funnel, or session scope). */
export type ActivityTimelineTarget =
  | { kind: 'attempt'; id: string }
  | { kind: 'generation_id'; id: string }
  | { kind: 'session_id'; id: string };

export interface DrillDownConfig {
  eventName: string;
  enabled: boolean;
  browseLabel: string;
  explorerTitle: string;
  listDescription: string;
  emptyHint: string;
  list: DrillDownListKind;
  timeline: DrillDownTimelineKind;
  defaultListLimit: number;
  getTimelineId: (row: ActivityLogRow) => string | null;
  /**
   * When `timeline.type === 'per_row'`, use this to pick API + id per list row.
   * For other timeline types, optional override is ignored; use getTimelineId + timeline instead.
   */
  resolveTimelineTarget?: (row: ActivityLogRow) => ActivityTimelineTarget | null;
  showSurfaceColumn: boolean;
  showGenerationIdColumn: boolean;
  showAttemptIdColumn: boolean;
  showSessionIdColumn: boolean;
  /** Hub user_profiles display name column (list API must enrich). */
  showUserDisplayNameColumn: boolean;
}

/** List actions allowed for `GET .../activity-journey?list=1&action=` — derived from enabled registry rows. */
export function getActivityJourneyListActions(): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const c of CONFIGS) {
    if (!c.enabled || c.list.type !== 'activity_journey_list') continue;
    const a = c.list.action;
    if (!seen.has(a)) {
      seen.add(a);
      out.push(a);
    }
  }
  return out;
}

/** Stable DOM id for scroll-into-view from adoption table rows. */
export const ACTIVITY_JOURNEY_EXPLORER_ELEMENT_ID = 'activity-journey-explorer';

const CONFIGS: DrillDownConfig[] = [
  {
    eventName: 'workout:start',
    enabled: true,
    browseLabel: 'Browse journeys',
    explorerTitle: 'Workout started — journey explorer',
    listDescription:
      'Recent workout:start events. Rows with a top-level workout_attempt_id can use View journey to see ordered open → start → complete (and other) rows for that attempt.',
    emptyHint:
      'This list may include workout:start rows without a top-level workout_attempt_id from mixed or legacy clients; those rows cannot open View journey. If counts stay at zero, confirm users are on a build that logs starts from all three players and that Firestore composite indexes are deployed (see FIRESTORE_INDEXES_RETENTION.md).',
    list: { type: 'workout_journey_starts' },
    timeline: { type: 'workout_attempt_timeline' },
    defaultListLimit: 50,
    getTimelineId: (row) => {
      const v = row.workout_attempt_id?.trim();
      return v && v.length > 0 ? v : null;
    },
    showSurfaceColumn: true,
    showGenerationIdColumn: false,
    showAttemptIdColumn: true,
    showSessionIdColumn: false,
    showUserDisplayNameColumn: true,
  },
  {
    eventName: 'workout:generate',
    enabled: true,
    browseLabel: 'Browse journeys',
    explorerTitle: 'Workout generated — journey explorer',
    listDescription:
      'Recent workout:generate events. Choose View journey to see ordered funnel rows tied by generation_id (generate → open → start → complete) when the hub logged correlation.',
    emptyHint:
      'The list uses recent workout:generate rows. View journey requires a top-level generation_id on the row (newer hub builds). Deploy the (generation_id, timestamp) composite index for timelines (see FIRESTORE_INDEXES_RETENTION.md).',
    list: { type: 'activity_journey_list', action: 'workout:generate' },
    timeline: { type: 'generation_id_timeline' },
    defaultListLimit: 50,
    getTimelineId: (row) => {
      const v = row.generation_id?.trim();
      return v && v.length > 0 ? v : null;
    },
    showSurfaceColumn: false,
    showGenerationIdColumn: true,
    showAttemptIdColumn: false,
    showSessionIdColumn: false,
    showUserDisplayNameColumn: false,
  },
  {
    eventName: 'workout:open',
    enabled: true,
    browseLabel: 'Browse activity',
    explorerTitle: 'Workout opened — activity explorer',
    listDescription:
      'Recent workout:open events. View journey uses generation_id when present (funnel), otherwise workout_attempt_id (player attempt), when logged on the row.',
    emptyHint:
      'Uses the same action + timestamp index as other lists. Timelines need generation_id and/or workout_attempt_id on the row and deployed composites (see FIRESTORE_INDEXES_RETENTION.md).',
    list: { type: 'activity_journey_list', action: 'workout:open' },
    timeline: { type: 'per_row' },
    defaultListLimit: 50,
    getTimelineId: () => null,
    resolveTimelineTarget: (row) => {
      const g = row.generation_id?.trim();
      if (g) return { kind: 'generation_id', id: g };
      const a = row.workout_attempt_id?.trim();
      if (a) return { kind: 'attempt', id: a };
      return null;
    },
    showSurfaceColumn: true,
    showGenerationIdColumn: true,
    showAttemptIdColumn: true,
    showSessionIdColumn: true,
    showUserDisplayNameColumn: false,
  },
  {
    eventName: 'workout:complete',
    enabled: true,
    browseLabel: 'Browse activity',
    explorerTitle: 'Workout completed — activity explorer',
    listDescription:
      'Recent workout:complete events for inspection (user, workout resource, session). View journey is not defined for this action.',
    emptyHint:
      'List-only drill-down: no correlation timeline. Confirm hub sends session_id and resource_id when you need to trace rows.',
    list: { type: 'activity_journey_list', action: 'workout:complete' },
    timeline: { type: 'none' },
    defaultListLimit: 50,
    getTimelineId: () => null,
    showSurfaceColumn: true,
    showGenerationIdColumn: false,
    showAttemptIdColumn: false,
    showSessionIdColumn: true,
    showUserDisplayNameColumn: false,
  },
  {
    eventName: 'recipe:view',
    enabled: true,
    browseLabel: 'Browse activity',
    explorerTitle: 'Recipe viewed — activity explorer',
    listDescription: 'Recent recipe:view events (list-only; no journey correlation on this action).',
    emptyHint: 'Uses list query on action + timestamp. No View journey for this adoption row.',
    list: { type: 'activity_journey_list', action: 'recipe:view' },
    timeline: { type: 'none' },
    defaultListLimit: 50,
    getTimelineId: () => null,
    showSurfaceColumn: false,
    showGenerationIdColumn: false,
    showAttemptIdColumn: false,
    showSessionIdColumn: true,
    showUserDisplayNameColumn: false,
  },
  {
    eventName: 'app:session_start',
    enabled: true,
    browseLabel: 'Browse journeys',
    explorerTitle: 'Session started — journey explorer',
    listDescription:
      'Recent app:session_start events. View journey loads all user_activity_logs rows with the same top-level session_id (oldest first) when present.',
    emptyHint:
      'Requires session_id on log rows and the (session_id, timestamp) composite index for timelines. Session scope can include many actions; interpret with care in shared-client scenarios.',
    list: { type: 'activity_journey_list', action: 'app:session_start' },
    timeline: { type: 'session_id_timeline' },
    defaultListLimit: 50,
    getTimelineId: (row) => {
      const v = row.session_id?.trim();
      return v && v.length > 0 ? v : null;
    },
    showSurfaceColumn: false,
    showGenerationIdColumn: false,
    showAttemptIdColumn: false,
    showSessionIdColumn: true,
    showUserDisplayNameColumn: false,
  },
];

const byEvent = new Map(CONFIGS.map((c) => [c.eventName, c]));

export function getDrillDownConfig(eventName: string): DrillDownConfig | undefined {
  return byEvent.get(eventName);
}

export function getEnabledDrillDowns(): DrillDownConfig[] {
  return CONFIGS.filter((c) => c.enabled);
}

/** Maps a list row to a timeline fetch target for View journey (or null). */
export function resolveRowTimelineTarget(
  config: DrillDownConfig,
  row: ActivityLogRow
): ActivityTimelineTarget | null {
  if (config.timeline.type === 'none') return null;
  if (config.timeline.type === 'per_row') {
    return config.resolveTimelineTarget?.(row) ?? null;
  }
  const id = config.getTimelineId(row)?.trim();
  if (!id) return null;
  switch (config.timeline.type) {
    case 'workout_attempt_timeline':
      return { kind: 'attempt', id };
    case 'generation_id_timeline':
      return { kind: 'generation_id', id };
    case 'session_id_timeline':
      return { kind: 'session_id', id };
    default:
      return null;
  }
}
