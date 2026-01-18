import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HallucinationQuiz } from '@/components/features/blog/HallucinationQuiz'

describe('HallucinationQuiz', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render quiz component', () => {
    render(<HallucinationQuiz />)

    expect(screen.getByText(/Can You Spot the Fake/i)).toBeInTheDocument()
  })

  it('should display round number', () => {
    render(<HallucinationQuiz />)

    expect(screen.getByText(/Round 1\/3/i)).toBeInTheDocument()
  })

  it('should render first question', () => {
    render(<HallucinationQuiz />)

    expect(screen.getByText(/Give me an advanced leg exercise/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Perform a single-leg squat while standing on a stability ball/i)
    ).toBeInTheDocument()
  })

  it('should render answer buttons', () => {
    render(<HallucinationQuiz />)

    expect(screen.getByRole('button', { name: /Real Science/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Hallucination/i })).toBeInTheDocument()
  })

  it('should show feedback when correct answer is selected', async () => {
    const user = userEvent.setup()
    render(<HallucinationQuiz />)

    // First question is fake, so clicking "Hallucination" should be correct
    const fakeButton = screen.getByRole('button', { name: /Hallucination/i })
    await user.click(fakeButton)

    await waitFor(() => {
      expect(screen.getByText(/Correct!/i)).toBeInTheDocument()
    })
    // Verify feedback text is present (may be in feedbackTitle or feedbackText)
    expect(screen.getByText(/Stability balls are for core work/i)).toBeInTheDocument()
  })

  it('should show feedback when wrong answer is selected', async () => {
    const user = userEvent.setup()
    render(<HallucinationQuiz />)

    // First question is fake, so clicking "Real Science" should be wrong
    const realButton = screen.getByRole('button', { name: /Real Science/i })
    await user.click(realButton)

    await waitFor(() => {
      expect(screen.getByText(/Wrong!/i)).toBeInTheDocument()
    })
  })

  it('should advance to next question when Next Round is clicked', async () => {
    const user = userEvent.setup()
    render(<HallucinationQuiz />)

    // Answer first question
    const fakeButton = screen.getByRole('button', { name: /Hallucination/i })
    await user.click(fakeButton)

    // Wait for feedback
    await waitFor(() => {
      expect(screen.getByText(/Correct!/i)).toBeInTheDocument()
    })

    // Click Next Round
    const nextButton = screen.getByRole('button', { name: /Next Round/i })
    await user.click(nextButton)

    // Should show second question
    await waitFor(() => {
      expect(screen.getByText(/Round 2\/3/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/How do I build chest strength/i)).toBeInTheDocument()
  })

  it('should cycle through all questions', async () => {
    const user = userEvent.setup()
    render(<HallucinationQuiz />)

    // Answer all 3 questions
    for (let i = 0; i < 3; i++) {
      const fakeButton = screen.getByRole('button', { name: /Hallucination/i })
      await user.click(fakeButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Next Round/i })).toBeInTheDocument()
      })

      const nextButton = screen.getByRole('button', { name: /Next Round/i })
      await user.click(nextButton)

      // Wait for next question to appear
      await waitFor(() => {
        const buttons = screen.queryAllByRole('button', { name: /Hallucination/i })
        if (buttons.length > 0) {
          expect(buttons[0]).toBeInTheDocument()
        }
      })
    }

    // Should cycle back to round 1
    await waitFor(() => {
      expect(screen.getByText(/Round 1\/3/i)).toBeInTheDocument()
    })
  })

  it('should show feedback when question is answered', async () => {
    const user = userEvent.setup()
    render(<HallucinationQuiz />)

    // Initially question is visible
    expect(screen.getByText(/Give me an advanced leg exercise/i)).toBeInTheDocument()

    // Answer question
    const fakeButton = screen.getByRole('button', { name: /Hallucination/i })
    await user.click(fakeButton)

    // Feedback should be visible
    await waitFor(() => {
      expect(screen.getByText(/Correct!/i)).toBeInTheDocument()
    })
  })
})
