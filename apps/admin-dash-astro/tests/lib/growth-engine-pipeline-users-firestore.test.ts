import { describe, expect, it } from 'vitest';
import { deriveGrowthStateFromHubUser } from '@/lib/admin/growth-engine/pipeline-users-firestore';

const NOW = Date.parse('2026-03-15T12:00:00.000Z');

describe('deriveGrowthStateFromHubUser', () => {
  it('maps paid + active to premium_subscriber', () => {
    const state = deriveGrowthStateFromHubUser(
      {
        subscriptionTier: 'pro',
        subscriptionStatus: 'active',
        trialEndsAt: null,
      },
      NOW
    );
    expect(state).toBe('premium_subscriber');
  });

  it('maps free + none without createdAt to reverse_trial_expired', () => {
    const state = deriveGrowthStateFromHubUser(
      {
        subscriptionTier: 'free',
        subscriptionStatus: 'none',
        trialEndsAt: null,
      },
      NOW
    );
    expect(state).toBe('reverse_trial_expired');
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
    expect(
      deriveGrowthStateFromHubUser(
        {
          subscriptionTier: 'pro',
          subscriptionStatus: 'past_due',
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
