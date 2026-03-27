import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { adminFetch } from '@/lib/supabase/client/admin-fetch';

type CommandCard = {
  id: string;
  title: string;
  owner: 'Marketing' | 'Product' | 'Engineering';
  severity: 'P1' | 'P2' | 'P3';
  signal: string;
  action: string;
  evidencePath: string;
  evidenceLabel: string;
};

type SummaryResponse = {
  generatedAt: string | null;
  narrativeEnabled: boolean;
  narrative: {
    executiveSummary: string;
    cardNarratives: Array<{ id: string; narrative: string }>;
  } | null;
  cards: Array<{
    id: string;
    title: string;
    owner: CommandCard['owner'];
    severity: CommandCard['severity'];
    signal: string;
    action: string;
    evidence: { path: string; label: string };
  }>;
  realtime: {
    unresolvedCount: number;
  };
};

type PipelineRow = {
  uid: string;
  displayLabel: string;
  displayName: string | null;
  growthState: string | null;
  trialEndsAt: string | null;
  leadScore: number;
  scoreVersion: string;
  drivers: Array<{ key: string; label: string; delta: number }>;
  insight: string;
  recommendedTrigger: string;
};

type PipelineResponse = {
  rows: PipelineRow[];
  nextCursor: string | null;
  scoreVersion: string;
};

type FeatureRoiRow = {
  featureKey: string;
  label: string;
  source: 'hub_firestore' | 'supabase_funnel';
  adoptionBucket: 'high' | 'low';
  correlationTier: 'strong' | 'weak' | 'unknown';
  distinctUsers30d: number;
  treatedUsers: number;
  upgradedWithin7d: number;
  upgradeRate: number;
  baselineRate: number;
  directive: string;
  evidence: {
    path: string;
    label: string;
  };
};

type FeatureRoiResponse = {
  generatedAt: string;
  rows: FeatureRoiRow[];
  warnings: string[];
};

type MessagingSuggestion = {
  id: string;
  title: string;
  severity: 'P2' | 'P3';
  rationale: string;
  channel: 'email' | 'push' | 'in_app' | 'experiment';
  segmentHint?: string;
  hypothesis: string;
  primaryMetric: string;
  primaryPage: string;
  messageVariant?: string;
  evidence: { path: string; label: string };
};

type MessagingSuggestionsResponse = {
  generatedAt: string;
  suggestions: MessagingSuggestion[];
  warnings: string[];
  inputsSummary: {
    days: number;
    retentionW1Rate?: number;
    topLandingPath?: string;
    ttfkaNeverRatio?: number;
  };
};

type ExperimentDraft = {
  id: string;
  created_at: string;
  status: string;
  title: string;
  hypothesis: string;
  primary_metric: string;
  primary_page: string;
  linked_suggestion_id: string | null;
};

const FALLBACK_COMMAND_CARDS: CommandCard[] = [
  {
    id: 'marketing-opportunity',
    title: 'Top conversion opportunity',
    owner: 'Marketing',
    severity: 'P2',
    signal: 'Waiting for first daily_brief generation.',
    action: 'Run the batch job to populate Growth Engine directives.',
    evidencePath: '/analytics/details/retention-cohorts',
    evidenceLabel: 'View retention detail',
  },
  {
    id: 'product-friction',
    title: 'Top UX friction point',
    owner: 'Product',
    severity: 'P2',
    signal: 'Waiting for first daily_brief generation.',
    action: 'Run the batch job to populate Growth Engine directives.',
    evidencePath: '/analytics/details/engagement',
    evidenceLabel: 'View engagement detail',
  },
  {
    id: 'engineering-leak',
    title: 'Top revenue leak',
    owner: 'Engineering',
    severity: 'P2',
    signal: 'Waiting for first daily_brief generation.',
    action: 'Run batch + realtime jobs to populate abandonment and reliability directives.',
    evidencePath: '/analytics/details/monetization-dropoff',
    evidenceLabel: 'View monetization drop-off detail',
  },
];

const GrowthEngineView: React.FC = () => {
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pipelineRows, setPipelineRows] = useState<PipelineRow[]>([]);
  const [pipelineLoading, setPipelineLoading] = useState(true);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [pipelineSort, setPipelineSort] = useState<'score_desc' | 'score_asc'>('score_desc');
  const [featureRoiRows, setFeatureRoiRows] = useState<FeatureRoiRow[]>([]);
  const [featureRoiWarnings, setFeatureRoiWarnings] = useState<string[]>([]);
  const [featureRoiLoading, setFeatureRoiLoading] = useState(true);
  const [featureRoiError, setFeatureRoiError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<MessagingSuggestion[]>([]);
  const [suggestionsWarnings, setSuggestionsWarnings] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const [experimentRows, setExperimentRows] = useState<ExperimentDraft[]>([]);
  const [logActionError, setLogActionError] = useState<string | null>(null);
  const [logActionSuccess, setLogActionSuccess] = useState<string | null>(null);
  const [experimentError, setExperimentError] = useState<string | null>(null);
  const [experimentSuccess, setExperimentSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await adminFetch('/api/admin/growth-engine/summary');
        const data = (await response.json()) as SummaryResponse | { error?: string };
        if (!response.ok) {
          throw new Error((data as { error?: string })?.error ?? 'Failed to load growth summary');
        }
        if (!cancelled) {
          setSummary(data as SummaryResponse);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load growth summary');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadExperiments = async () => {
    const response = await adminFetch('/api/admin/growth-engine/experiments?limit=20');
    const data = (await response.json()) as {
      rows?: ExperimentDraft[];
      error?: string;
      schemaReady?: boolean;
    };
    if (!response.ok) {
      throw new Error(data.error ?? 'Failed to load experiment drafts');
    }
    setExperimentRows(data.rows ?? []);
    if (data.schemaReady === false) {
      setExperimentError('Experiment drafts schema is not ready yet. Apply the Phase F migration.');
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setSuggestionsLoading(true);
      setSuggestionsError(null);
      setExperimentError(null);
      try {
        const response = await adminFetch('/api/admin/growth-engine/messaging-suggestions?days=30');
        const data = (await response.json()) as MessagingSuggestionsResponse | { error?: string };
        if (!response.ok) {
          throw new Error((data as { error?: string })?.error ?? 'Failed to load messaging suggestions');
        }
        if (!cancelled) {
          setSuggestions((data as MessagingSuggestionsResponse).suggestions ?? []);
          setSuggestionsWarnings((data as MessagingSuggestionsResponse).warnings ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setSuggestionsError(err instanceof Error ? err.message : 'Failed to load messaging suggestions');
          setSuggestions([]);
          setSuggestionsWarnings([]);
          setExperimentRows([]);
        }
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }

      // Load experiments separately so errors don't get reported as suggestions errors.
      if (cancelled) return;
      try {
        await loadExperiments();
      } catch (err) {
        if (!cancelled) {
          setExperimentError(err instanceof Error ? err.message : 'Failed to load experiment drafts');
          setExperimentRows([]);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setPipelineLoading(true);
      setPipelineError(null);
      try {
        const response = await adminFetch(`/api/admin/growth-engine/pipeline?limit=50&sort=${pipelineSort}`);
        const data = (await response.json()) as PipelineResponse | { error?: string };
        if (!response.ok) {
          throw new Error((data as { error?: string })?.error ?? 'Failed to load growth pipeline');
        }
        if (!cancelled) {
          setPipelineRows((data as PipelineResponse).rows ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setPipelineError(err instanceof Error ? err.message : 'Failed to load growth pipeline');
          setPipelineRows([]);
        }
      } finally {
        if (!cancelled) setPipelineLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [pipelineSort]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setFeatureRoiLoading(true);
      setFeatureRoiError(null);
      try {
        const response = await adminFetch(
          '/api/admin/growth-engine/feature-roi?days=30&correlationWindowDays=90'
        );
        const data = (await response.json()) as FeatureRoiResponse | { error?: string };
        if (!response.ok) {
          throw new Error((data as { error?: string })?.error ?? 'Failed to load feature ROI matrix');
        }
        if (!cancelled) {
          setFeatureRoiRows((data as FeatureRoiResponse).rows ?? []);
          setFeatureRoiWarnings((data as FeatureRoiResponse).warnings ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setFeatureRoiError(err instanceof Error ? err.message : 'Failed to load feature ROI matrix');
          setFeatureRoiRows([]);
          setFeatureRoiWarnings([]);
        }
      } finally {
        if (!cancelled) setFeatureRoiLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = useMemo<CommandCard[]>(() => {
    if (!summary?.cards?.length) return FALLBACK_COMMAND_CARDS;
    return summary.cards.map((card) => ({
      id: card.id,
      title: card.title,
      owner: card.owner,
      severity: card.severity,
      signal: card.signal,
      action: card.action,
      evidencePath: card.evidence.path,
      evidenceLabel: card.evidence.label,
    }));
  }, [summary]);

  const narrativeByCardId = useMemo(() => {
    const list = summary?.narrative?.cardNarratives ?? [];
    return new Map(list.map((c) => [c.id, c.narrative]));
  }, [summary]);

  const showNarrativeConfigHint =
    Boolean(summary?.narrativeEnabled) &&
    !summary?.narrative?.executiveSummary &&
    !loading &&
    !error;

  const matrixCounts = useMemo(() => {
    return {
      highStrong: featureRoiRows.filter((row) => row.adoptionBucket === 'high' && row.correlationTier === 'strong').length,
      highWeak: featureRoiRows.filter((row) => row.adoptionBucket === 'high' && row.correlationTier === 'weak').length,
      lowStrong: featureRoiRows.filter((row) => row.adoptionBucket === 'low' && row.correlationTier === 'strong').length,
      lowWeak: featureRoiRows.filter((row) => row.adoptionBucket === 'low' && row.correlationTier === 'weak').length,
      unknown: featureRoiRows.filter((row) => row.correlationTier === 'unknown').length,
    };
  }, [featureRoiRows]);

  const submitIntervention = async (suggestion: MessagingSuggestion) => {
    setLogActionError(null);
    setLogActionSuccess(null);
    try {
      const response = await adminFetch('/api/admin/growth-engine/interventions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directive_id: suggestion.id,
          directive_type: 'messaging_suggestion',
          channel: suggestion.channel,
          target_type: 'segment',
          notes: suggestion.title,
          metadata: {
            evidence_path: suggestion.evidence.path,
            primary_metric: suggestion.primaryMetric,
          },
        }),
      });
      const data = (await response.json()) as { id?: string; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to log intervention');
      }
      setLogActionSuccess(`Logged intervention ${data.id ?? ''}`.trim());
    } catch (err) {
      setLogActionError(err instanceof Error ? err.message : 'Failed to log intervention');
    }
  };

  const submitExperimentDraft = async (suggestion: MessagingSuggestion) => {
    setExperimentError(null);
    setExperimentSuccess(null);
    try {
      const response = await adminFetch('/api/admin/growth-engine/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: suggestion.title,
          hypothesis: suggestion.hypothesis,
          primary_metric: suggestion.primaryMetric,
          primary_page: suggestion.primaryPage,
          message_variant: suggestion.messageVariant ?? null,
          linked_suggestion_id: suggestion.id,
          metadata: {
            segment_hint: suggestion.segmentHint ?? null,
          },
        }),
      });
      const data = (await response.json()) as {
        id?: string;
        error?: string;
        ok?: boolean;
        schemaReady?: boolean;
      };
      if (!response.ok) {
        throw new Error(data.error ?? 'Failed to create experiment draft');
      }
      if (data.schemaReady === false) {
        throw new Error(data.error ?? 'Experiment drafts schema is not ready');
      }
      setExperimentSuccess(`Created draft ${data.id ?? ''}`.trim());
      await loadExperiments();
    } catch (err) {
      setExperimentError(err instanceof Error ? err.message : 'Failed to create experiment draft');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">Active Growth Engine</h1>
          <p className="mt-1 text-white/60">
            Daily command center for prioritized growth directives.
          </p>
          <p className="mt-2 text-xs text-white/50">
            {loading
              ? 'Loading latest brief...'
              : summary?.generatedAt
                ? `Last updated: ${new Date(summary.generatedAt).toLocaleString()}`
                : 'No brief generated yet'}
          </p>
          {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
        </div>
        <Link
          to="/analytics"
          className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white"
        >
          Back to Analytics
        </Link>
      </div>

      {summary?.narrative?.executiveSummary && (
        <div className="rounded-lg border border-[#ffbf00]/20 bg-[#ffbf00]/5 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#ffbf00]/90">AI narrative</p>
          <p className="text-sm leading-relaxed text-white/90">{summary.narrative.executiveSummary}</p>
        </div>
      )}

      {showNarrativeConfigHint && (
        <p className="text-xs text-white/40">
          Narrative mode is enabled on the server; the latest brief has no AI narrative yet. Ensure{' '}
          <code className="rounded bg-white/10 px-1">GEMINI_API_KEY</code> is set and run the batch job.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {cards.map((card) => (
          <div key={card.id} className="rounded-lg border border-white/10 bg-black/20 p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="font-heading text-xl font-bold">{card.title}</h2>
              <div className="flex items-center gap-2">
                {card.owner === 'Engineering' && (summary?.realtime.unresolvedCount ?? 0) > 0 && (
                  <span className="rounded bg-[#ffbf00]/20 px-2 py-1 text-xs text-[#ffbf00]">
                    {summary?.realtime.unresolvedCount} live alert
                    {(summary?.realtime.unresolvedCount ?? 0) > 1 ? 's' : ''}
                  </span>
                )}
                <span className="rounded bg-white/10 px-2 py-1 text-xs text-white/70">
                  {card.owner} · {card.severity}
                </span>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="mb-1 text-white/60">Signal</p>
                <p className="text-white/90">{card.signal}</p>
              </div>
              <div>
                <p className="mb-1 text-white/60">Recommended action</p>
                <p className="text-white/90">{card.action}</p>
              </div>
              <div>
                <p className="mb-1 text-white/60">Evidence</p>
                <Link to={card.evidencePath} className="text-[#ffbf00] hover:underline">
                  {card.evidenceLabel}
                </Link>
              </div>
              {narrativeByCardId.has(card.id) && (
                <details className="mt-3 rounded border border-white/5 bg-black/30 p-3">
                  <summary className="cursor-pointer text-xs text-white/60">AI narrative</summary>
                  <p className="mt-2 text-sm text-white/80">{narrativeByCardId.get(card.id)}</p>
                </details>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-white/10 bg-black/20 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading text-xl font-bold">Conversion pipeline</h2>
            <p className="text-sm text-white/60">
              Lead scoring table with explainable drivers for outreach prioritization.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="pipeline-sort" className="text-xs text-white/60">
              Sort
            </label>
            <select
              id="pipeline-sort"
              value={pipelineSort}
              onChange={(event) => setPipelineSort(event.target.value === 'score_asc' ? 'score_asc' : 'score_desc')}
              className="rounded border border-white/10 bg-black/40 px-2 py-1 text-xs text-white"
            >
              <option value="score_desc">Score high → low</option>
              <option value="score_asc">Score low → high</option>
            </select>
          </div>
        </div>

        {pipelineLoading && <p className="text-sm text-white/60">Loading pipeline...</p>}
        {pipelineError && <p className="text-sm text-red-300">{pipelineError}</p>}

        {!pipelineLoading && !pipelineError && pipelineRows.length > 0 && (
          <div className="overflow-hidden rounded border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-black/30">
                <tr>
                  <th className="px-3 py-2 text-left text-white/80">User</th>
                  <th className="px-3 py-2 text-left text-white/80">Name</th>
                  <th className="px-3 py-2 text-left text-white/80">State</th>
                  <th className="px-3 py-2 text-left text-white/80">Trial ends</th>
                  <th className="px-3 py-2 text-right text-white/80">Lead score</th>
                  <th className="px-3 py-2 text-left text-white/80">Top drivers</th>
                  <th className="px-3 py-2 text-left text-white/80">Recommended trigger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pipelineRows.map((row) => (
                  <tr key={row.uid}>
                    <td className="px-3 py-2 text-white/80">{row.displayLabel}</td>
                    <td className="px-3 py-2 text-white/80">{row.displayName ?? '—'}</td>
                    <td className="px-3 py-2 text-white/70">{row.growthState ?? 'unknown'}</td>
                    <td className="px-3 py-2 text-white/70">
                      {row.trialEndsAt ? new Date(row.trialEndsAt).toLocaleDateString() : 'n/a'}
                    </td>
                    <td className="px-3 py-2 text-right text-white/90">
                      {row.leadScore}
                      <span className="ml-2 text-xs text-white/50">{row.scoreVersion}</span>
                    </td>
                    <td className="px-3 py-2 text-white/70">
                      <span title={row.drivers.map((driver) => `${driver.label} (${driver.delta >= 0 ? '+' : ''}${driver.delta})`).join('\n')}>
                        {row.drivers
                          .slice(0, 3)
                          .map((driver) => `${driver.label} (${driver.delta >= 0 ? '+' : ''}${driver.delta})`)
                          .join(', ')}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-white/70">{row.recommendedTrigger}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!pipelineLoading && !pipelineError && pipelineRows.length === 0 && (
          <p className="text-sm text-white/60">No pipeline rows available for current filters.</p>
        )}
      </div>

      <div className="rounded-lg border border-white/10 bg-black/20 p-6">
        <div className="mb-4">
          <h2 className="font-heading text-xl font-bold">Feature ROI matrix</h2>
          <p className="text-sm text-white/60">
            Adoption versus 7-day conversion correlation, with deterministic product directives.
          </p>
        </div>

        {featureRoiLoading && <p className="text-sm text-white/60">Loading feature ROI...</p>}
        {featureRoiError && <p className="text-sm text-red-300">{featureRoiError}</p>}
        {!featureRoiLoading &&
          !featureRoiError &&
          featureRoiWarnings.map((warning) => (
            <p key={warning} className="mb-2 text-xs text-[#ffbf00]">
              {warning}
            </p>
          ))}

        {!featureRoiLoading && !featureRoiError && featureRoiRows.length > 0 && (
          <>
            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <div className="rounded border border-white/10 p-3">
                <p className="text-xs text-white/50">High adoption + strong correlation</p>
                <p className="text-xl font-semibold text-white">{matrixCounts.highStrong}</p>
              </div>
              <div className="rounded border border-white/10 p-3">
                <p className="text-xs text-white/50">High adoption + weak correlation</p>
                <p className="text-xl font-semibold text-white">{matrixCounts.highWeak}</p>
              </div>
              <div className="rounded border border-white/10 p-3">
                <p className="text-xs text-white/50">Low adoption + strong correlation</p>
                <p className="text-xl font-semibold text-white">{matrixCounts.lowStrong}</p>
              </div>
              <div className="rounded border border-white/10 p-3">
                <p className="text-xs text-white/50">Low adoption + weak correlation</p>
                <p className="text-xl font-semibold text-white">{matrixCounts.lowWeak}</p>
              </div>
            </div>
            <p className="mb-4 text-xs text-white/50">
              Unknown correlation (sample below threshold): {matrixCounts.unknown}
            </p>

            <div className="overflow-hidden rounded border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-black/30">
                  <tr>
                    <th className="px-3 py-2 text-left text-white/80">Feature</th>
                    <th className="px-3 py-2 text-left text-white/80">Adoption</th>
                    <th className="px-3 py-2 text-left text-white/80">Correlates to upgrade?</th>
                    <th className="px-3 py-2 text-left text-white/80">AI product directive</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {featureRoiRows.map((row) => (
                    <tr key={row.featureKey}>
                      <td className="px-3 py-2 text-white/80">
                        <p>{row.label}</p>
                        <p className="text-xs text-white/40">{row.source === 'hub_firestore' ? 'Hub activity' : 'Marketing/timer funnel'}</p>
                      </td>
                      <td className="px-3 py-2 text-white/70">
                        {row.adoptionBucket} ({row.distinctUsers30d} users / 30d)
                      </td>
                      <td className="px-3 py-2 text-white/70">
                        <p>{row.correlationTier}</p>
                        <p className="text-xs text-white/50">
                          {(row.upgradeRate * 100).toFixed(1)}% vs baseline {(row.baselineRate * 100).toFixed(1)}%
                        </p>
                      </td>
                      <td className="px-3 py-2 text-white/70">
                        <p>{row.directive}</p>
                        <Link to={row.evidence.path} className="text-xs text-[#ffbf00] hover:underline">
                          {row.evidence.label}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!featureRoiLoading && !featureRoiError && featureRoiRows.length === 0 && (
          <p className="text-sm text-white/60">No feature ROI rows are available yet.</p>
        )}
      </div>

      <div className="rounded-lg border border-white/10 bg-black/20 p-6">
        <div className="mb-4">
          <h2 className="font-heading text-xl font-bold">Messaging & experiments loop</h2>
          <p className="text-sm text-white/60">
            Suggestion queue from UTM, landing, retention, and activation signals.
          </p>
        </div>

        {suggestionsLoading && <p className="text-sm text-white/60">Loading messaging suggestions...</p>}
        {suggestionsError && <p className="text-sm text-red-300">{suggestionsError}</p>}
        {!suggestionsLoading &&
          !suggestionsError &&
          suggestionsWarnings.map((warning) => (
            <p key={warning} className="mb-2 text-xs text-[#ffbf00]">
              {warning}
            </p>
          ))}
        {logActionError && <p className="mb-2 text-xs text-red-300">{logActionError}</p>}
        {logActionSuccess && <p className="mb-2 text-xs text-emerald-300">{logActionSuccess}</p>}
        {experimentError && <p className="mb-2 text-xs text-red-300">{experimentError}</p>}
        {experimentSuccess && <p className="mb-2 text-xs text-emerald-300">{experimentSuccess}</p>}

        {!suggestionsLoading && !suggestionsError && (
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="rounded border border-white/10 bg-black/30 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-white">{suggestion.title}</h3>
                  <span className="rounded bg-white/10 px-2 py-1 text-xs text-white/70">
                    {suggestion.severity} · {suggestion.channel}
                  </span>
                </div>
                <p className="mb-2 text-sm text-white/80">{suggestion.rationale}</p>
                <p className="mb-3 text-xs text-white/60">
                  Metric: {suggestion.primaryMetric} · Page: {suggestion.primaryPage}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => submitIntervention(suggestion)}
                    className="rounded border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
                  >
                    Log intervention
                  </button>
                  <button
                    type="button"
                    onClick={() => submitExperimentDraft(suggestion)}
                    className="rounded border border-white/20 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
                  >
                    Propose experiment
                  </button>
                  <Link to={suggestion.evidence.path} className="text-xs text-[#ffbf00] hover:underline">
                    {suggestion.evidence.label}
                  </Link>
                </div>
              </div>
            ))}

            {suggestions.length === 0 && (
              <p className="text-sm text-white/60">No messaging suggestions generated for the current window.</p>
            )}

            <div className="rounded border border-white/10 bg-black/30 p-4">
              <h3 className="mb-2 font-semibold text-white">Recent experiment drafts</h3>
              {experimentRows.length === 0 ? (
                <p className="text-sm text-white/60">No experiment drafts yet.</p>
              ) : (
                <div className="overflow-hidden rounded border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-black/40">
                      <tr>
                        <th className="px-3 py-2 text-left text-white/80">Title</th>
                        <th className="px-3 py-2 text-left text-white/80">Metric</th>
                        <th className="px-3 py-2 text-left text-white/80">Page</th>
                        <th className="px-3 py-2 text-left text-white/80">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {experimentRows.map((row) => (
                        <tr key={row.id}>
                          <td className="px-3 py-2 text-white/80">{row.title}</td>
                          <td className="px-3 py-2 text-white/70">{row.primary_metric}</td>
                          <td className="px-3 py-2 text-white/70">{row.primary_page}</td>
                          <td className="px-3 py-2 text-white/70">{row.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GrowthEngineView;
