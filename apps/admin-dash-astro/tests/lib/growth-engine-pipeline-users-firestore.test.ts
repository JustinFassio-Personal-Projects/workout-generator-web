import { describe, expect, it } from 'vitest';
import { deriveGrowthStateFromHubUser } from '@/lib/admin/growth-engine/pipeline-users-firestore';

describe('deriveGrowthStateFromHubUser', () => {
  it('maps paid + active to subscriber_active', () => {
    const state = deriveGrowthStateFromHubUser({
      subscriptionTier: 'pro',
      subscriptionStatus: 'active',
      trialEndsAt: null,
    });
    expect(state).toBe('subscriber_active');
  });

  it('maps free + none to downgraded_free', () => {
    const state = deriveGrowthStateFromHubUser({
      subscriptionTier: 'free',
      subscriptionStatus: 'none',
      trialEndsAt: null,
    });
    expect(state).toBe('downgraded_free');
  });

  it('maps canceled or past_due to churned', () => {
    expect(
      deriveGrowthStateFromHubUser({
        subscriptionTier: 'pro',
        subscriptionStatus: 'canceled',
        trialEndsAt: null,
      })
    ).toBe('churned');
    expect(
      deriveGrowthStateFromHubUser({
        subscriptionTier: 'pro',
        subscriptionStatus: 'past_due',
        trialEndsAt: null,
      })
    ).toBe('churned');
  });

  it('maps future trial window to trial states', () => {
    const farFuture = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
    const nearFuture = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    expect(
      deriveGrowthStateFromHubUser({
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
        trialEndsAt: farFuture,
      })
    ).toBe('trial_active');
    expect(
      deriveGrowthStateFromHubUser({
        subscriptionTier: 'free',
        subscriptionStatus: 'active',
        trialEndsAt: nearFuture,
      })
    ).toBe('trial_expiring_24h');
  });
});
