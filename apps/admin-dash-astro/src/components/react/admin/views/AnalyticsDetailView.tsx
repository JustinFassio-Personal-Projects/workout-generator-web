import React from 'react';
import { Link, useParams } from 'react-router-dom';

import { ANALYTICS_DATASET_BY_KEY } from '@/lib/admin/analytics-datasets';
import { getAnalyticsGlossary } from '@/lib/admin/analytics-glossary';
import EngagementDetailPanel from '@/components/react/admin/analytics-detail/EngagementDetailPanel';
import MonetizationDropoffDetailPanel from '@/components/react/admin/analytics-detail/MonetizationDropoffDetailPanel';
import RetentionCohortsDetailPanel from '@/components/react/admin/analytics-detail/RetentionCohortsDetailPanel';
import AcquisitionDetailPanel from '@/components/react/admin/analytics-detail/AcquisitionDetailPanel';

const AnalyticsDetailView: React.FC = () => {
  const { datasetKey } = useParams<{ datasetKey: string }>();
  const dataset = datasetKey ? ANALYTICS_DATASET_BY_KEY[datasetKey] : undefined;
  const glossary = datasetKey ? getAnalyticsGlossary(datasetKey) : null;

  const renderDetailContent = () => {
    if (!datasetKey) return null;
    if (datasetKey === 'acquisition') return <AcquisitionDetailPanel />;
    if (datasetKey === 'monetization-dropoff') return <MonetizationDropoffDetailPanel />;
    if (datasetKey === 'engagement') return <EngagementDetailPanel />;
    if (datasetKey === 'retention-cohorts') return <RetentionCohortsDetailPanel />;
    return (
      <div className="rounded-lg border border-white/10 bg-black/20 p-6">
        <h2 className="mb-2 font-heading text-xl font-bold">Detail content placeholder</h2>
        <p className="text-sm text-white/70">
          Chart and table rendering for this dataset will be wired in upcoming phases.
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold">
            {dataset ? `${dataset.label} detail` : 'Analytics detail'}
          </h1>
          <p className="mt-1 text-white/60">
            Reusable detail-page shell for Active Growth Engine drill-downs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/growth-engine"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white"
          >
            Back to Growth Engine
          </Link>
          <Link
            to="/analytics"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white"
          >
            Back to Analytics
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-black/20 p-6">
        <h2 className="mb-2 font-heading text-xl font-bold">Data source</h2>
        {dataset ? (
          <div className="space-y-2 text-sm text-white/80">
            <p>{dataset.dataSourceNote}</p>
            <p className="text-white/60">API endpoints</p>
            <ul className="list-disc space-y-1 pl-5 text-white/80">
              {dataset.apiPaths.map((path) => (
                <li key={path}>
                  <code className="rounded bg-white/10 px-1">{path}</code>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-white/70">
            Unknown dataset key. This template is ready, but the selected key is not yet registered in
            <code className="mx-1 rounded bg-white/10 px-1">analytics-datasets.ts</code>.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-white/10 bg-black/20 p-6">
        <h2 className="mb-2 font-heading text-xl font-bold">Metric glossary</h2>
        {glossary && glossary.terms.length > 0 ? (
          <ul className="space-y-2 text-sm text-white/80">
            {glossary.terms.map((term) => (
              <li key={term.id}>
                <span className="font-medium text-white/90">{term.title}:</span>{' '}
                <span className="text-white/70">{term.definition}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-white/70">No glossary entries are defined for this dataset yet.</p>
        )}
      </div>

      {renderDetailContent()}
    </div>
  );
};

export default AnalyticsDetailView;
