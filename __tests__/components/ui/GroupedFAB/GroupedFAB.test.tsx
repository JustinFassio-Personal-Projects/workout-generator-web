import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GroupedFAB } from '@/components/ui/GroupedFAB/GroupedFAB'

vi.mock('@/components/ui/ChatWidget/ChatWidget', () => ({
  ChatWidget: ({ defaultOpen, onClose }: { defaultOpen: boolean; onClose: () => void }) => (
    <div data-testid="chat-widget">
      {defaultOpen && (
        <button onClick={onClose} data-testid="close-chat">
          Close Chat
        </button>
      )}
    </div>
  ),
}))

vi.mock('@/components/support/TicketSubmissionForm', () => ({
  TicketSubmissionForm: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    <div data-testid="ticket-form">
      {isOpen && (
        <button onClick={onClose} data-testid="close-form">
          Close Form
        </button>
      )}
    </div>
  ),
}))

describe('GroupedFAB', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render main FAB button', () => {
    render(<GroupedFAB />)
    expect(screen.getByLabelText('Open support menu')).toBeInTheDocument()
  })

  it('should expand menu when clicked', async () => {
    const user = userEvent.setup()
    render(<GroupedFAB />)

    const mainButton = screen.getByLabelText('Open support menu')
    await user.click(mainButton)

    expect(screen.getByLabelText('Close menu')).toBeInTheDocument()
    expect(screen.getByLabelText('Ask AI assistant')).toBeInTheDocument()
    expect(screen.getByLabelText('Submit feedback')).toBeInTheDocument()
  })

  it('should open chat when Ask is clicked', async () => {
    const user = userEvent.setup()
    render(<GroupedFAB />)

    const mainButton = screen.getByLabelText('Open support menu')
    await user.click(mainButton)

    const askButton = screen.getByLabelText('Ask AI assistant')
    await user.click(askButton)

    expect(screen.getByTestId('chat-widget')).toBeInTheDocument()
  })

  it('should open form when Feedback is clicked', async () => {
    const user = userEvent.setup()
    render(<GroupedFAB />)

    const mainButton = screen.getByLabelText('Open support menu')
    await user.click(mainButton)

    const feedbackButton = screen.getByLabelText('Submit feedback')
    await user.click(feedbackButton)

    expect(screen.getByTestId('ticket-form')).toBeInTheDocument()
  })

  it('should close menu on Escape key', async () => {
    const user = userEvent.setup()
    render(<GroupedFAB />)

    const mainButton = screen.getByLabelText('Open support menu')
    await user.click(mainButton)

    expect(screen.getByLabelText('Close menu')).toBeInTheDocument()

    await user.keyboard('{Escape}')

    expect(screen.queryByLabelText('Close menu')).not.toBeInTheDocument()
  })
})
