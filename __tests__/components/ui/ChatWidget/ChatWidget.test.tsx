import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { ChatWidget } from '@/components/ui/ChatWidget/ChatWidget'

// Mock ChatKit React
vi.mock('@openai/chatkit-react', () => ({
  ChatKit: ({ control, className }: { control: any; className?: string }) => (
    <div data-testid="chatkit" className={className}>
      ChatKit Component
    </div>
  ),
  useChatKit: vi.fn(() => ({
    control: {
      options: {},
      handlers: {},
    },
  })),
}))

describe('ChatWidget', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.restoreAllMocks()
    process.env = { ...originalEnv }
    // Mock customElements
    global.customElements = {
      get: vi.fn(() => undefined),
      whenDefined: vi.fn(() => Promise.resolve()),
    } as any
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('should not render if workflow ID is not provided', () => {
    delete process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID

    const { container } = render(<ChatWidget />)
    expect(container.firstChild).toBeNull()
  })

  it('should render chat button when closed', () => {
    process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID = 'wf_test123'

    render(<ChatWidget />)
    expect(screen.getByLabelText('Open chat')).toBeInTheDocument()
  })

  it('should render chat window when opened', async () => {
    process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID = 'wf_test123'

    render(<ChatWidget defaultOpen={true} />)

    await waitFor(() => {
      expect(screen.getByLabelText('Chat assistant')).toBeInTheDocument()
    })

    expect(screen.getByText('Chat with us')).toBeInTheDocument()
    expect(screen.getByText("We're here to help")).toBeInTheDocument()
  })

  it('should toggle chat when button is clicked', async () => {
    process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID = 'wf_test123'

    render(<ChatWidget />)

    const button = screen.getByLabelText('Open chat')
    button.click()

    await waitFor(() => {
      expect(screen.getByLabelText('Chat assistant')).toBeInTheDocument()
    })
  })

  it('should accept workflowId as prop', () => {
    render(<ChatWidget workflowId="wf_prop123" />)
    expect(screen.getByLabelText('Open chat')).toBeInTheDocument()
  })

  it('should accept userId as prop', () => {
    process.env.NEXT_PUBLIC_CHATKIT_WORKFLOW_ID = 'wf_test123'

    render(<ChatWidget userId="user123" />)
    expect(screen.getByLabelText('Open chat')).toBeInTheDocument()
  })
})
