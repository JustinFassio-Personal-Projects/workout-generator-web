import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MicroInterview } from '@/components/landing/ExerciseChallenge/MicroInterview'
import * as analytics from '@/lib/analytics'

vi.mock('@/lib/analytics', () => ({
  analytics: {
    trackVisionMicroqStarted: vi.fn(),
    trackVisionMicroqAnswered: vi.fn(),
    trackVisionMicroqCompleted: vi.fn(),
    trackVisionMicroqFreeTextSaved: vi.fn(),
    trackVisionExerciseSuggested: vi.fn(),
  },
}))

describe('MicroInterview', () => {
  const mockOnComplete = vi.fn()
  const mockLeadId = 'lead-123'

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('should render micro interview with first question', () => {
    render(<MicroInterview leadId={mockLeadId} onComplete={mockOnComplete} />)

    expect(screen.getByText('Quick questions (takes ~15 seconds)')).toBeInTheDocument()
    expect(
      screen.getByText(
        'We use this to build workouts that feel less random and more like a real plan.'
      )
    ).toBeInTheDocument()
    expect(screen.getByText('Question 1 of 3')).toBeInTheDocument()
    expect(screen.getByText('What are you training for right now?')).toBeInTheDocument()
  })

  it('should track micro interview started on mount', () => {
    render(<MicroInterview leadId={mockLeadId} onComplete={mockOnComplete} />)
    expect(analytics.analytics.trackVisionMicroqStarted).toHaveBeenCalledWith(mockLeadId)
  })

  it('should display all options for first question', () => {
    render(<MicroInterview leadId={mockLeadId} onComplete={mockOnComplete} />)

    expect(screen.getByText('Lose fat')).toBeInTheDocument()
    expect(screen.getByText('Build muscle')).toBeInTheDocument()
    expect(screen.getByText('Get stronger')).toBeInTheDocument()
    expect(screen.getByText('Improve conditioning')).toBeInTheDocument()
    expect(screen.getByText('Mobility / pain-free movement')).toBeInTheDocument()
    expect(screen.getByText('Sport performance')).toBeInTheDocument()
    expect(screen.getByText('Get back in shape')).toBeInTheDocument()
  })

  it('should advance to next question when option is selected', async () => {
    const user = userEvent.setup()
    render(<MicroInterview leadId={mockLeadId} onComplete={mockOnComplete} />)

    const buildMuscleOption = screen.getByText('Build muscle')
    await user.click(buildMuscleOption)

    await waitFor(() => {
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument()
      expect(
        screen.getByText("What's your biggest frustration with workouts today?")
      ).toBeInTheDocument()
    })

    expect(analytics.analytics.trackVisionMicroqAnswered).toHaveBeenCalledWith(
      mockLeadId,
      'goal_primary',
      'Build muscle'
    )
  })

  it('should show back button after first question', async () => {
    const user = userEvent.setup()
    render(<MicroInterview leadId={mockLeadId} onComplete={mockOnComplete} />)

    const buildMuscleOption = screen.getByText('Build muscle')
    await user.click(buildMuscleOption)

    await waitFor(() => {
      expect(screen.getByText('← Back')).toBeInTheDocument()
    })
  })

  it('should go back to previous question when back button is clicked', async () => {
    const user = userEvent.setup()
    render(<MicroInterview leadId={mockLeadId} onComplete={mockOnComplete} />)

    // Answer Q1
    await user.click(screen.getByText('Build muscle'))
    await waitFor(() => {
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument()
    })

    // Answer Q2
    await user.click(screen.getByText("I don't know what to do"))
    await waitFor(() => {
      expect(screen.getByText('Question 3 of 3')).toBeInTheDocument()
    })

    // Go back
    const backButton = screen.getByText('← Back')
    await user.click(backButton)

    await waitFor(() => {
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument()
      expect(
        screen.getByText("What's your biggest frustration with workouts today?")
      ).toBeInTheDocument()
    })
  })

  it('should show optional Q4 after all required questions are answered', async () => {
    const user = userEvent.setup()
    render(<MicroInterview leadId={mockLeadId} onComplete={mockOnComplete} />)

    // Answer Q1
    await user.click(screen.getByText('Build muscle'))
    await waitFor(() => {
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument()
    })

    // Answer Q2
    await user.click(screen.getByText("I don't know what to do"))
    await waitFor(() => {
      expect(screen.getByText('Question 3 of 3')).toBeInTheDocument()
    })

    // Answer Q3
    await user.click(screen.getByText('Build a plan with week-to-week progression'))

    await waitFor(() => {
      expect(screen.getByText('Optional')).toBeInTheDocument()
      expect(screen.getByText('What would make you consider paying for this?')).toBeInTheDocument()
    })
  })

  it('should allow skipping optional Q4', async () => {
    const user = userEvent.setup()
    render(<MicroInterview leadId={mockLeadId} onComplete={mockOnComplete} />)

    // Answer all required questions
    await user.click(screen.getByText('Build muscle'))
    await waitFor(() => {
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument()
    })

    await user.click(screen.getByText("I don't know what to do"))
    await waitFor(() => {
      expect(screen.getByText('Question 3 of 3')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Build a plan with week-to-week progression'))

    // Wait for Q4 to appear
    await waitFor(() => {
      expect(screen.getByText('Skip')).toBeInTheDocument()
    })

    // Skip Q4
    await user.click(screen.getByText('Skip'))

    await waitFor(() => {
      expect(screen.getByText('Tell us more (optional)')).toBeInTheDocument()
      expect(screen.getByText('Submit')).toBeInTheDocument()
    })
  })

  it('should show free text field when "Tell us more" is clicked', async () => {
    const user = userEvent.setup()
    render(<MicroInterview leadId={mockLeadId} onComplete={mockOnComplete} />)

    // Answer all required questions and skip Q4
    await user.click(screen.getByText('Build muscle'))
    await waitFor(() => {
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument()
    })

    await user.click(screen.getByText("I don't know what to do"))
    await waitFor(() => {
      expect(screen.getByText('Question 3 of 3')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Build a plan with week-to-week progression'))
    await waitFor(() => {
      expect(screen.getByText('Skip')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Skip'))

    // Click "Tell us more"
    await waitFor(() => {
      expect(screen.getByText('Tell us more (optional)')).toBeInTheDocument()
    })
    const tellUsMoreLink = screen.getByText('Tell us more (optional)')
    await user.click(tellUsMoreLink)

    await waitFor(() => {
      expect(
        screen.getByText('If AIWorkoutGenerator nailed one thing for you, what would it be?')
      ).toBeInTheDocument()
      expect(
        screen.getByPlaceholderText('Example: Build me a simple plan I can stick to.')
      ).toBeInTheDocument()
    })
  })

  it('should show exercise suggestion field when link is clicked', async () => {
    const user = userEvent.setup()
    render(<MicroInterview leadId={mockLeadId} onComplete={mockOnComplete} />)

    // Answer all required questions and skip Q4
    await user.click(screen.getByText('Build muscle'))
    await waitFor(() => {
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument()
    })

    await user.click(screen.getByText("I don't know what to do"))
    await waitFor(() => {
      expect(screen.getByText('Question 3 of 3')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Build a plan with week-to-week progression'))
    await waitFor(() => {
      expect(screen.getByText('Skip')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Skip'))

    // Click exercise suggestion link
    await waitFor(() => {
      expect(
        screen.getByText('Want to suggest an exercise we should add? (optional)')
      ).toBeInTheDocument()
    })
    const exerciseLink = screen.getByText('Want to suggest an exercise we should add? (optional)')
    await user.click(exerciseLink)

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Example: Sled push, Copenhagen plank, Jefferson curl…')
      ).toBeInTheDocument()
    })
  })

  it('should track free text save on blur', async () => {
    const user = userEvent.setup()
    render(<MicroInterview leadId={mockLeadId} onComplete={mockOnComplete} />)

    // Answer all required questions and skip Q4
    await user.click(screen.getByText('Build muscle'))
    await waitFor(() => {
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument()
    })

    await user.click(screen.getByText("I don't know what to do"))
    await waitFor(() => {
      expect(screen.getByText('Question 3 of 3')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Build a plan with week-to-week progression'))
    await waitFor(() => {
      expect(screen.getByText('Skip')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Skip'))

    // Open free text
    await waitFor(() => {
      expect(screen.getByText('Tell us more (optional)')).toBeInTheDocument()
    })
    const tellUsMoreLink = screen.getByText('Tell us more (optional)')
    await user.click(tellUsMoreLink)

    // Type in free text
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Example: Build me a simple plan I can stick to.')
      ).toBeInTheDocument()
    })
    const textarea = screen.getByPlaceholderText('Example: Build me a simple plan I can stick to.')
    await user.type(textarea, 'Test feedback')
    await user.tab() // Blur the field

    await waitFor(() => {
      expect(analytics.analytics.trackVisionMicroqFreeTextSaved).toHaveBeenCalledWith(
        mockLeadId,
        true,
        13
      )
    })
  })

  it('should track exercise suggestion save on blur', async () => {
    const user = userEvent.setup()
    render(<MicroInterview leadId={mockLeadId} onComplete={mockOnComplete} />)

    // Answer all required questions and skip Q4
    await user.click(screen.getByText('Build muscle'))
    await waitFor(() => {
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument()
    })

    await user.click(screen.getByText("I don't know what to do"))
    await waitFor(() => {
      expect(screen.getByText('Question 3 of 3')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Build a plan with week-to-week progression'))
    await waitFor(() => {
      expect(screen.getByText('Skip')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Skip'))

    // Open exercise suggestion
    await waitFor(() => {
      expect(
        screen.getByText('Want to suggest an exercise we should add? (optional)')
      ).toBeInTheDocument()
    })
    const exerciseLink = screen.getByText('Want to suggest an exercise we should add? (optional)')
    await user.click(exerciseLink)

    // Type exercise suggestion
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Example: Sled push, Copenhagen plank, Jefferson curl…')
      ).toBeInTheDocument()
    })
    const input = screen.getByPlaceholderText(
      'Example: Sled push, Copenhagen plank, Jefferson curl…'
    )
    await user.type(input, 'Sled push')
    await user.tab() // Blur the field

    await waitFor(() => {
      expect(analytics.analytics.trackVisionExerciseSuggested).toHaveBeenCalledWith(
        mockLeadId,
        true,
        9
      )
    })
  })

  it('should submit form successfully with all required fields', async () => {
    const user = userEvent.setup()
    const mockResponse = {
      ok: true,
      status: 201,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true, intel_id: 'intel-123' }),
    } as Response
    vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

    render(<MicroInterview leadId={mockLeadId} onComplete={mockOnComplete} />)

    // Answer Q1
    await user.click(screen.getByText('Build muscle'))
    await waitFor(() => {
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument()
    })

    // Answer Q2
    await user.click(screen.getByText("I don't know what to do"))
    await waitFor(() => {
      expect(screen.getByText('Question 3 of 3')).toBeInTheDocument()
    })

    // Answer Q3
    await user.click(screen.getByText('Build a plan with week-to-week progression'))
    await waitFor(() => {
      expect(screen.getByText('Skip')).toBeInTheDocument()
    })

    // Skip Q4
    await user.click(screen.getByText('Skip'))

    // Submit
    await waitFor(() => {
      expect(screen.getByText('Submit')).toBeInTheDocument()
    })
    const submitButton = screen.getByText('Submit')
    expect(submitButton).not.toBeDisabled()
    await user.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/vision-lead-intel',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lead_id: mockLeadId,
            goal_primary: 'Build muscle',
            frustration_primary: "I don't know what to do",
            ai_expectation_primary: 'Build a plan with week-to-week progression',
            payment_trigger_primary: '',
            expectation_free_text: '',
            exercise_suggestion: '',
            vision_prompt: '',
            image_url: '',
          }),
        })
      )
    })

    await waitFor(() => {
      expect(analytics.analytics.trackVisionMicroqCompleted).toHaveBeenCalledWith(
        mockLeadId,
        true,
        false
      )
      expect(mockOnComplete).toHaveBeenCalled()
    })
  })

  it('should submit form with optional Q4 answered', async () => {
    const user = userEvent.setup()
    const mockResponse = {
      ok: true,
      status: 201,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true, intel_id: 'intel-123' }),
    } as Response
    vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

    render(<MicroInterview leadId={mockLeadId} onComplete={mockOnComplete} />)

    // Answer all required questions
    await user.click(screen.getByText('Build muscle'))
    await waitFor(() => {
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument()
    })

    await user.click(screen.getByText("I don't know what to do"))
    await waitFor(() => {
      expect(screen.getByText('Question 3 of 3')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Build a plan with week-to-week progression'))

    // Answer Q4
    await waitFor(() => {
      expect(screen.getByText('Clear progression plan (not random)')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Clear progression plan (not random)'))

    // Wait for Q4 to be processed and submit button to appear
    await waitFor(() => {
      expect(screen.getByText('Submit')).toBeInTheDocument()
    })
    const submitButton = screen.getByText('Submit')
    expect(submitButton).not.toBeDisabled()
    await user.click(submitButton)

    // Wait for fetch to be called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })

    // Wait for analytics and onComplete to be called after successful submission
    await waitFor(
      () => {
        expect(analytics.analytics.trackVisionMicroqCompleted).toHaveBeenCalledWith(
          mockLeadId,
          true,
          true
        )
        expect(mockOnComplete).toHaveBeenCalled()
      },
      { timeout: 3000 }
    )
  })

  it('should handle submission error', async () => {
    const user = userEvent.setup()
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ error: 'Failed to save responses' }),
    } as Response)

    render(<MicroInterview leadId={mockLeadId} onComplete={mockOnComplete} />)

    // Answer all required questions
    await act(async () => {
      await user.click(screen.getByText('Build muscle'))
    })
    await waitFor(() => {
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument()
    })

    await act(async () => {
      await user.click(screen.getByText("I don't know what to do"))
    })
    await waitFor(() => {
      expect(screen.getByText('Question 3 of 3')).toBeInTheDocument()
    })

    await act(async () => {
      await user.click(screen.getByText('Build a plan with week-to-week progression'))
    })
    await waitFor(() => {
      expect(screen.getByText('Skip')).toBeInTheDocument()
    })

    await act(async () => {
      await user.click(screen.getByText('Skip'))
    })

    // Submit
    await waitFor(() => {
      expect(screen.getByText('Submit')).toBeInTheDocument()
    })
    const submitButton = screen.getByText('Submit')
    await act(async () => {
      await user.click(submitButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Server error. Please try again in a moment.')).toBeInTheDocument()
    })

    expect(mockOnComplete).not.toHaveBeenCalled()
  })

  it('should include vision_prompt when provided', async () => {
    const user = userEvent.setup()
    const mockResponse = {
      ok: true,
      status: 201,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true, intel_id: 'intel-123' }),
    } as Response
    vi.mocked(global.fetch).mockResolvedValueOnce(mockResponse)

    render(
      <MicroInterview leadId={mockLeadId} visionPrompt="Push up" onComplete={mockOnComplete} />
    )

    // Answer all required questions
    await user.click(screen.getByText('Build muscle'))
    await waitFor(() => {
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument()
    })

    await user.click(screen.getByText("I don't know what to do"))
    await waitFor(() => {
      expect(screen.getByText('Question 3 of 3')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Build a plan with week-to-week progression'))
    await waitFor(() => {
      expect(screen.getByText('Skip')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Skip'))

    // Submit
    await waitFor(() => {
      expect(screen.getByText('Submit')).toBeInTheDocument()
    })
    const submitButton = screen.getByText('Submit')
    await user.click(submitButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/vision-lead-intel',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lead_id: mockLeadId,
            goal_primary: 'Build muscle',
            frustration_primary: "I don't know what to do",
            ai_expectation_primary: 'Build a plan with week-to-week progression',
            payment_trigger_primary: '',
            expectation_free_text: '',
            exercise_suggestion: '',
            vision_prompt: 'Push up',
            image_url: '',
          }),
        })
      )
    })
  })

  it('should limit free text to 500 characters', async () => {
    const user = userEvent.setup()
    render(<MicroInterview leadId={mockLeadId} onComplete={mockOnComplete} />)

    // Answer all required questions and skip Q4
    await user.click(screen.getByText('Build muscle'))
    await waitFor(() => {
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument()
    })

    await user.click(screen.getByText("I don't know what to do"))
    await waitFor(() => {
      expect(screen.getByText('Question 3 of 3')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Build a plan with week-to-week progression'))
    await waitFor(() => {
      expect(screen.getByText('Skip')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Skip'))

    // Open free text
    await waitFor(() => {
      expect(screen.getByText('Tell us more (optional)')).toBeInTheDocument()
    })
    const tellUsMoreLink = screen.getByText('Tell us more (optional)')
    await user.click(tellUsMoreLink)

    // Try to type more than 500 characters
    await waitFor(() => {
      expect(
        screen.getByPlaceholderText('Example: Build me a simple plan I can stick to.')
      ).toBeInTheDocument()
    })
    const textarea = screen.getByPlaceholderText('Example: Build me a simple plan I can stick to.')
    const longText = 'A'.repeat(600)

    // Type the text - the component should limit it to 500 characters
    // Use faster typing to avoid timeout
    await user.clear(textarea)
    // Set value directly instead of typing 600 characters to speed up test
    await user.type(textarea, longText.slice(0, 500))
    // Try to add more - should be limited
    await user.type(textarea, longText.slice(500))

    // Should only accept 500 characters
    await waitFor(
      () => {
        const textareaElement = screen.getByPlaceholderText(
          'Example: Build me a simple plan I can stick to.'
        ) as HTMLTextAreaElement
        expect(textareaElement.value.length).toBeLessThanOrEqual(500)
        expect(screen.getByText(/500 \/ 500/)).toBeInTheDocument()
      },
      { timeout: 5000 }
    )
  }, 15000) // Increase test timeout to 15 seconds for typing long text

  it('should disable submit button when required questions are not answered', async () => {
    const user = userEvent.setup()
    render(<MicroInterview leadId={mockLeadId} onComplete={mockOnComplete} />)

    // Answer only Q1
    await user.click(screen.getByText('Build muscle'))
    await waitFor(() => {
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument()
    })

    // Skip Q4 should not appear yet
    expect(screen.queryByText('Skip')).not.toBeInTheDocument()
    expect(screen.queryByText('Submit')).not.toBeInTheDocument()
  })

  it('should track all question answers', async () => {
    const user = userEvent.setup()
    render(<MicroInterview leadId={mockLeadId} onComplete={mockOnComplete} />)

    // Answer Q1
    await user.click(screen.getByText('Build muscle'))
    expect(analytics.analytics.trackVisionMicroqAnswered).toHaveBeenCalledWith(
      mockLeadId,
      'goal_primary',
      'Build muscle'
    )

    await waitFor(() => {
      expect(screen.getByText('Question 2 of 3')).toBeInTheDocument()
    })

    // Answer Q2
    await user.click(screen.getByText("I don't know what to do"))
    expect(analytics.analytics.trackVisionMicroqAnswered).toHaveBeenCalledWith(
      mockLeadId,
      'frustration_primary',
      "I don't know what to do"
    )

    await waitFor(() => {
      expect(screen.getByText('Question 3 of 3')).toBeInTheDocument()
    })

    // Answer Q3
    await user.click(screen.getByText('Build a plan with week-to-week progression'))
    expect(analytics.analytics.trackVisionMicroqAnswered).toHaveBeenCalledWith(
      mockLeadId,
      'ai_expectation_primary',
      'Build a plan with week-to-week progression'
    )
  })
})
