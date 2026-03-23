/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Auth and onboarding funnel: sign-ins/sign-ups by day, funnel counts, OAuth vs email, TTFKA.
 */

import type { FirebaseSignupStats } from '@/lib/firebase/admin';
import {
  isFirebaseConfigured,
  listUsersForDateRange,
} from '@/lib/firebase/admin';
import { getSupabaseServer, getSupabaseServiceRole } from '../server';

export interface AuthFunnelStats {
  signUpsByDay: { date: string; count: number }[];
  signInsByDay: { date: string; count: number }[];
  funnel: {
    visit: number;
    signUp: number;
    emailConfirmed: number;
    firstAction: number;
  };
  oauthVsEmail: { oauth: number; email: number };
  /** Time-to-first-key-action buckets (ms-based). Marketing/builder stream: anchor=account_signup_complete, key=first timer_session_complete|hub_timer_launch_1. */
  ttfkaDistributionMarketing: {
    under15m: number;
    '15mTo1h': number;
    '1hTo24h': number;
    '1dTo7d': number;
    '7dPlus': number;
    never: number;
  };
  onboardingDropOff?: { step: string; completed: number; dropped: number }[];
  handoff?: {
    firebaseSignups: number;
    attributedSignups: number;
    signUpsByDay?: { date: string; count: number }[];
  } | null;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getAuthFunnelStats(days: number): Promise<AuthFunnelStats> {
  const supabase = getSupabaseServer();
  const toDate = new Date();
  const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);
  const fromIso = fromDate.toISOString();
  const toIso = toDate.toISOString();

  const signUpsByDayMap = new Map<string, number>();
  let funnelSignUp = 0;
  let funnelEmailConfirmed = 0;
  let oauthCount = 0;
  let emailCount = 0;

  // Auth: listUsers requires service role. Degrade gracefully when key is missing so
  // events-based stats (sign-ins, TTFKA, etc.) still work.
  let supabaseAdmin: ReturnType<typeof getSupabaseServiceRole> | null = null;
  try {
    supabaseAdmin = getSupabaseServiceRole();
  } catch {
    // SUPABASE_SERVICE_ROLE_KEY missing; skip auth-admin listUsers, continue with partial stats
  }

  if (supabaseAdmin) {
    const perPage = 1000;
    let page = 1;
    let hasMore = true;
    while (hasMore) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) {
        if (import.meta.env.DEV || import.meta.env.PUBLIC_ENABLE_ERROR_LOGGING === 'true') {
          console.error('[getAuthFunnelStats] listUsers error:', error);
        }
        break;
      }
      const users = data?.users ?? [];
      for (const u of users) {
        const createdAt = (u as { created_at?: string }).created_at;
        if (!createdAt) continue;
        const created = new Date(createdAt);
        if (created < fromDate || created > toDate) continue;
        funnelSignUp += 1;
        const key = dateKey(created);
        signUpsByDayMap.set(key, (signUpsByDayMap.get(key) ?? 0) + 1);
        const emailConfirmed = !!(u as { email_confirmed_at?: string | null }).email_confirmed_at;
        if (emailConfirmed) funnelEmailConfirmed += 1;
        const identities = (u as { identities?: Array<{ provider?: string }> }).identities ?? [];
        const isOAuth = identities.some(
          (i) => i?.provider && i.provider !== 'email' && i.provider !== 'password'
        );
        if (isOAuth) oauthCount += 1;
        else emailCount += 1;
      }
      hasMore = users.length === perPage;
      page += 1;
    }
  }

  let signUpsByDay = Array.from(signUpsByDayMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Sign-ins by day: analytics_funnel_events account_login_complete
  const { data: loginRows } = await supabase
    .from('analytics_funnel_events')
    .select('timestamp')
    .eq('event_name', 'account_login_complete')
    .gte('timestamp', fromIso)
    .lte('timestamp', toIso)
    .limit(5000);

  const signInsByDayMap = new Map<string, number>();
  for (const row of loginRows ?? []) {
    const ts = (row as { timestamp: string }).timestamp;
    const key = ts.slice(0, 10);
    signInsByDayMap.set(key, (signInsByDayMap.get(key) ?? 0) + 1);
  }
  const signInsByDay = Array.from(signInsByDayMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // OAuth vs email from events (override or supplement auth): account_signup_complete / account_login_complete properties
  const { data: methodRows } = await supabase
    .from('analytics_funnel_events')
    .select('properties')
    .in('event_name', ['account_signup_complete', 'account_login_complete'])
    .gte('timestamp', fromIso)
    .lte('timestamp', toIso)
    .limit(5000);

  let oauthFromEvents = 0;
  let emailFromEvents = 0;
  for (const row of methodRows ?? []) {
    const method = (row.properties as { method?: string })?.method ?? '';
    if (method === 'oauth') oauthFromEvents += 1;
    else if (method === 'email') emailFromEvents += 1;
  }
  if (oauthFromEvents > 0 || emailFromEvents > 0) {
    oauthCount = oauthFromEvents;
    emailCount = emailFromEvents;
  }

  // Firebase override: hub uses Firebase Auth; when configured, use it for signups (source of truth)
  let firebaseStats: FirebaseSignupStats | null = null;
  if (isFirebaseConfigured()) {
    firebaseStats = await listUsersForDateRange(days);
    if (firebaseStats && firebaseStats.totalCount > 0) {
      signUpsByDay = firebaseStats.signUpsByDay;
      funnelSignUp = firebaseStats.totalCount;
      funnelEmailConfirmed = firebaseStats.emailVerifiedCount;
      oauthCount = firebaseStats.oauthCount;
      emailCount = firebaseStats.emailCount;
    }
  }

  // Funnel visit: distinct visitors from web_events in range
  const { data: visitRows } = await supabase
    .from('web_events')
    .select('session_id, user_id')
    .gte('occurred_at', fromIso)
    .lte('occurred_at', toIso)
    .limit(10000);

  const visitSet = new Set<string>();
  for (const row of visitRows ?? []) {
    const v =
      (row as { user_id?: string | null; session_id?: string | null }).user_id ??
      (row as { session_id?: string | null }).session_id;
    if (v) visitSet.add(String(v));
  }
  const funnelVisit = visitSet.size;

  // Funnel firstAction: distinct user_id with timer_session_complete or hub_timer_launch_1
  const { data: keyEventRows } = await supabase
    .from('analytics_funnel_events')
    .select('user_id')
    .in('event_name', ['timer_session_complete', 'hub_timer_launch_1'])
    .gte('timestamp', fromIso)
    .lte('timestamp', toIso)
    .not('user_id', 'is', null);

  const firstActionUsers = new Set(
    (keyEventRows ?? []).map((r) => (r as { user_id: string }).user_id).filter(Boolean)
  );

  // TTFKA: users with account_signup_complete in range -> first key event timestamp
  const { data: signupEvents } = await supabase
    .from('analytics_funnel_events')
    .select('user_id, timestamp')
    .eq('event_name', 'account_signup_complete')
    .gte('timestamp', fromIso)
    .lte('timestamp', toIso)
    .not('user_id', 'is', null);

  const signupByUser = new Map<string, number>();
  for (const row of signupEvents ?? []) {
    const uid = (row as { user_id: string }).user_id;
    const ts = new Date((row as { timestamp: string }).timestamp).getTime();
    if (!signupByUser.has(uid) || ts < signupByUser.get(uid)!) {
      signupByUser.set(uid, ts);
    }
  }

  // First key event per user for TTFKA; limit 10k may undercount if key events exceed that globally.
  const { data: firstKeyEvents } = await supabase
    .from('analytics_funnel_events')
    .select('user_id, timestamp')
    .in('event_name', ['timer_session_complete', 'hub_timer_launch_1'])
    .not('user_id', 'is', null)
    .order('timestamp', { ascending: true })
    .limit(10000);

  const firstKeyByUser = new Map<string, number>();
  for (const row of firstKeyEvents ?? []) {
    const uid = (row as { user_id: string }).user_id;
    const ts = new Date((row as { timestamp: string }).timestamp).getTime();
    if (!firstKeyByUser.has(uid) || ts < firstKeyByUser.get(uid)!) {
      firstKeyByUser.set(uid, ts);
    }
  }

  const MS_15M = 15 * 60 * 1000;
  const MS_1H = 60 * 60 * 1000;
  const MS_24H = 24 * MS_1H;
  const MS_7D = 7 * MS_24H;

  const ttfkaDistributionMarketing = {
    under15m: 0,
    '15mTo1h': 0,
    '1hTo24h': 0,
    '1dTo7d': 0,
    '7dPlus': 0,
    never: 0,
  };

  for (const [uid, signupTs] of signupByUser) {
    const firstTs = firstKeyByUser.get(uid);
    if (firstTs == null) {
      ttfkaDistributionMarketing.never += 1;
      continue;
    }
    const deltaMs = firstTs - signupTs;
    if (deltaMs < MS_15M) ttfkaDistributionMarketing.under15m += 1;
    else if (deltaMs < MS_1H) ttfkaDistributionMarketing['15mTo1h'] += 1;
    else if (deltaMs < MS_24H) ttfkaDistributionMarketing['1hTo24h'] += 1;
    else if (deltaMs < MS_7D) ttfkaDistributionMarketing['1dTo7d'] += 1;
    else ttfkaDistributionMarketing['7dPlus'] += 1;
  }

  // Onboarding drop-off: distinct session_id per WorkoutPlanBuilder step (from analytics_funnel_events).
  // Plain ASCII only; GitHub “hidden/bidi Unicode” warning was verified as false positive.
  const onboardingEventNames = [
    'onboarding_builder_started',
    'onboarding_builder_step_1_completed',
    'onboarding_builder_step_2_completed',
    'onboarding_builder_preview_shown',
    'onboarding_create_account_clicked',
    'account_signup_complete',
  ] as const;
  const stepLabels: Record<(typeof onboardingEventNames)[number], string> = {
    onboarding_builder_started: 'Started',
    onboarding_builder_step_1_completed: 'Step 1',
    onboarding_builder_step_2_completed: 'Step 2',
    onboarding_builder_preview_shown: 'Preview',
    onboarding_create_account_clicked: 'Create account',
    account_signup_complete: 'Account created',
  };
  const stepCounts: number[] = [];
  for (const eventName of onboardingEventNames) {
    const { data: rows } = await supabase
      .from('analytics_funnel_events')
      .select('session_id')
      .eq('event_name', eventName)
      .gte('timestamp', fromIso)
      .lte('timestamp', toIso)
      .not('session_id', 'is', null);
    const sessionIds = new Set(
      (rows ?? []).map((r) => (r as { session_id: string }).session_id).filter(Boolean)
    );
    stepCounts.push(sessionIds.size);
  }
  const onboardingDropOff: { step: string; completed: number; dropped: number }[] = [];
  let prev = 0;
  onboardingEventNames.forEach((name, i) => {
    const completed = stepCounts[i] ?? 0;
    const dropped = Math.max(0, prev - completed);
    onboardingDropOff.push({ step: stepLabels[name], completed, dropped });
    prev = completed;
  });

  const handoff = isFirebaseConfigured()
    ? {
        firebaseSignups: firebaseStats?.totalCount ?? 0,
        attributedSignups: stepCounts[5] ?? 0,
        signUpsByDay: firebaseStats?.signUpsByDay ?? [],
      }
    : null;

  // When Handoff is configured, "Account created" row uses Handoff data for continuity
  if (handoff != null && onboardingDropOff.length > 0) {
    const createAccountClicked = stepCounts[4] ?? 0;
    const accountCreatedIdx = onboardingDropOff.length - 1;
    onboardingDropOff[accountCreatedIdx] = {
      step: stepLabels.account_signup_complete,
      completed: handoff.firebaseSignups,
      dropped: Math.max(0, createAccountClicked - handoff.firebaseSignups),
    };
  }

  return {
    signUpsByDay,
    signInsByDay,
    funnel: {
      visit: funnelVisit,
      signUp: funnelSignUp,
      emailConfirmed: funnelEmailConfirmed,
      firstAction: firstActionUsers.size,
    },
    oauthVsEmail: { oauth: oauthCount, email: emailCount },
    ttfkaDistributionMarketing,
    onboardingDropOff,
    handoff,
  };
}
