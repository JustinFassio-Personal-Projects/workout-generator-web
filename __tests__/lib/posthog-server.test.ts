import { beforeEach, describe, expect, it, vi } from 'vitest'

const posthogInstance = {
  capture: vi.fn(),
  identify: vi.fn(),
  flush: vi.fn(),
  shutdown: vi.fn(),
}

const PostHogMock = vi.fn(() => posthogInstance)

vi.mock('posthog-node', () => ({
  PostHog: PostHogMock,
}))

describe('posthog-server', () => {
  beforeEach(() => {
    PostHogMock.mockClear()
    posthogInstance.capture.mockClear()
    posthogInstance.identify.mockClear()
    posthogInstance.flush.mockClear()
    posthogInstance.shutdown.mockClear()
    vi.resetModules()
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-posthog-key'
    process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://us.i.posthog.com'
  })

  it('returns a singleton PostHog client', async () => {
    const { getPostHogClient } = await import('../../lib/posthog-server')

    const first = getPostHogClient()
    const second = getPostHogClient()

    expect(first).toBe(second)
    expect(PostHogMock).toHaveBeenCalledTimes(1)
    expect(PostHogMock).toHaveBeenCalledWith('test-posthog-key', {
      host: 'https://us.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    })
  })

  it('shuts down the PostHog client', async () => {
    const { getPostHogClient, shutdownPostHog } = await import('../../lib/posthog-server')

    getPostHogClient()
    await shutdownPostHog()

    expect(posthogInstance.shutdown).toHaveBeenCalledTimes(1)
  })
})
