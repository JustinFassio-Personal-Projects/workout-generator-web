import { describe, expect, it } from 'vitest';
import {
  deriveGrowthStateFromHubUser,
  deriveGrowthStateFromProfileRow,
} from '@/lib/admin/growth-engine/growth-state-derive';

const NOW = Date.parse('2026-03-15T12:00:00.000Z');

describe('deriveGrowthStateFromProfileRow', () => {
  it('maps purchased_index >= 0 to premium_subscriber', () => {
    expect(
      deriveGrowthStateFromProfileRow(
        {
          purchased_index: 0,
          trial_ends_at: null,
          growth_state: null,
          created_at: '2026-01-01T00:00:00.000Z',
        },
        NOW
      )
    ).toBe('premium_subscriber');
  });

  it('preserves churned when not paid', () => {
    expect(
      deriveGrowthStateFromProfileRow(
        {
          purchased_index: null,
          trial_ends_at: null,
          growth_state: 'churned',
          created_at: '2026-03-01T00:00:00.000Z',
        },
        NOW
      )
    ).toBe('churned');
  });

  it('maps past trial_ends_at to reverse_trial_expired', () => {
    expect(
      deriveGrowthStateFromProfileRow(
        {
          purchased_index: null,
          trial_ends_at: '2026-03-10T00:00:00.000Z',
          growth_state: null,
          created_at: '2026-03-01T00:00:00.000Z',
        },
        NOW
      )
    ).toBe('reverse_trial_expired');
  });

  it('uses calendar day buckets from created_at when no future trial_ends_at', () => {
    expect(
      deriveGrowthStateFromProfileRow(
        {
          purchased_index: null,
          trial_ends_at: null,
          growth_state: null,
          created_at: '2026-03-14T00:00:00.000Z',
        },
        NOW
      )
    ).toBe('reverse_trial_active');

    expect(
      deriveGrowthStateFromProfileRow(
        {
          purchased_index: null,
          trial_ends_at: null,
          growth_state: null,
          created_at: '2026-03-10T00:00:00.000Z',
        },
        NOW
      )
    ).toBe('reverse_trial_expiring');

    expect(
      deriveGrowthStateFromProfileRow(
        {
          purchased_index: null,
          trial_ends_at: null,
          growth_state: null,
          created_at: '2026-03-07T00:00:00.000Z',
        },
        NOW
      )
    ).toBe('reverse_trial_expired');
  });
});

describe('deriveGrowthStateFromHubUser', () => {
  it('maps paid + active to premium_subscriber', () => {
    expect(
      deriveGrowthStateFromHubUser(
        {
          subscriptionTier: 'pro',
          subscriptionStatus: 'active',
          trialEndsAt: null,
        },
        NOW
      )
    ).toBe('premium_subscriber');
  });

  it('maps free + none without signup to reverse_trial_expired', () => {
    expect(
      deriveGrowthStateFromHubUser(
        {
          subscriptionTier: 'free',
          subscriptionStatus: 'none',
          trialEndsAt: null,
        },
        NOW
      )
    ).toBe('reverse_trial_expired');
  });

  it('maps canceled or past_due to churned', () => {
    expect(
      deriveGrowthStateFromHubUser(
        {
          subscriptionTier: 'pro',
          subscriptionStatus: 'canceled',
          trialEndsAt: null,
        },
        NOW
      )
    ).toBe('churned');
  });

  it('maps future trial window to reverse trial states', () => {
    const farFuture = new Date(NOW + 72 * 60 * 60 * 1000).toISOString();
    const nearFuture = new Date(NOW + 2 * 60 * 60 * 1000).toISOString();
    expect(
      deriveGrowthStateFromHubUser(
        {
          subscriptionTier: 'free',
          subscriptionStatus: 'active',
          trialEndsAt: farFuture,
        },
        NOW
      )
    ).toBe('reverse_trial_active');
    expect(
      deriveGrowthStateFromHubUser(
        {
          subscriptionTier: 'free',
          subscriptionStatus: 'active',
          trialEndsAt: nearFuture,
        },
        NOW
      )
    ).toBe('reverse_trial_expiring');
  });
});
