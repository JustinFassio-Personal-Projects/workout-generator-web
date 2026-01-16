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

    expect(initMock).toHaveBeenCalledTimes(1)
    expect((globalThis as { __POSTHOG_INITIALIZED__?: boolean }).__POSTHOG_INITIALIZED__).toBe(true)

    addListenerSpy.mockRestore()
  })

  it('initializes immediately when document is ready', async () => {
    setReadyState('complete')

    const addListenerSpy = vi.spyOn(document, 'addEventListener')
    await loadModule()

    expect(initMock).toHaveBeenCalledTimes(1)
    const calls = addListenerSpy.mock.calls as unknown as Array<[unknown, unknown]>
    expect(calls.some(call => String(call[0]) === 'DOMContentLoaded')).toBe(false)

    addListenerSpy.mockRestore()
  })

  it('does not initialize more than once', async () => {
    setReadyState('complete')

    await loadModule()
    expect(initMock).toHaveBeenCalledTimes(1)

    await loadModule()
    expect(initMock).toHaveBeenCalledTimes(1)
  })
})
