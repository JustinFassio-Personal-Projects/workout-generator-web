import { beforeEach, describe, expect, it, vi } from 'vitest'

const initMock = vi.fn()

vi.mock('posthog-js', () => ({
  default: {
    init: initMock,
  },
}))

const setReadyState = (state: DocumentReadyState) => {
  Object.defineProperty(document, 'readyState', {
    configurable: true,
    get: () => state,
  })
}

const resetPostHogFlag = () => {
  delete (globalThis as { __POSTHOG_INITIALIZED__?: boolean }).__POSTHOG_INITIALIZED__
}

const loadModule = async () => {
  vi.resetModules()
  await import('../instrumentation-client')
}

// Helper to wait for async initialization with delays
const waitForInit = async () => {
  // First setTimeout(0) for deferring initialization start
  await new Promise(resolve => setTimeout(resolve, 10))

  // If document is not complete, trigger load event
  if (document.readyState !== 'complete') {
    window.dispatchEvent(new Event('load'))
    await new Promise(resolve => setTimeout(resolve, 10))
  }

  // Wait for the final 500ms setTimeout delay
  await new Promise(resolve => setTimeout(resolve, 600))
}

describe('instrumentation-client', () => {
  beforeEach(() => {
    initMock.mockClear()
    resetPostHogFlag()
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-posthog-key'
    process.env.NEXT_PUBLIC_POSTHOG_HOST = 'https://us.i.posthog.com'
  })

  it('initializes PostHog on DOMContentLoaded when document is loading', async () => {
    setReadyState('loading')

    const addListenerSpy = vi.spyOn(document, 'addEventListener')
    await loadModule()

    const calls = addListenerSpy.mock.calls as unknown as Array<[unknown, unknown]>
    const handler = calls.find(call => String(call[0]) === 'DOMContentLoaded')?.[1] as
      | EventListener
      | undefined
    expect(handler).toBeInstanceOf(Function)

    if (handler) {
      handler(new Event('DOMContentLoaded') as Event)
    }

    // Wait for async initialization with delays
    await waitForInit()

    expect(initMock).toHaveBeenCalledTimes(1)
    expect((globalThis as { __POSTHOG_INITIALIZED__?: boolean }).__POSTHOG_INITIALIZED__).toBe(true)

    addListenerSpy.mockRestore()
  })

  it('initializes immediately when document is ready', async () => {
    setReadyState('complete')

    const addListenerSpy = vi.spyOn(document, 'addEventListener')
    await loadModule()

    // Wait for async initialization with delays (setTimeout(0) + setTimeout(500))
    await waitForInit()

    expect(initMock).toHaveBeenCalledTimes(1)
    const calls = addListenerSpy.mock.calls as unknown as Array<[unknown, unknown]>
    expect(calls.some(call => String(call[0]) === 'DOMContentLoaded')).toBe(false)

    addListenerSpy.mockRestore()
  })

  it('does not initialize more than once', async () => {
    setReadyState('complete')

    await loadModule()
    await waitForInit()
    expect(initMock).toHaveBeenCalledTimes(1)

    await loadModule()
    await waitForInit()
    expect(initMock).toHaveBeenCalledTimes(1)
  })
})
