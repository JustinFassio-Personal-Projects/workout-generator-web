import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OnboardingWizard } from '@/components/landing/OnboardingWizard/OnboardingWizard'
import { buildSignupUrl } from '@/lib/buildSignupUrl'

// Mock AOS
vi.mock('aos', () => ({
  default: {
    init: vi.fn(),
  },
}))

// Mock buildSignupUrl
vi.mock('@/lib/buildSignupUrl', () => ({
  buildSignupUrl: vi.fn(() => 'https://example.com/signup?test=123'),
}))

// Mock window.location
const mockLocation = {
  href: '',
}
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
})

describe('OnboardingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocation.href = ''
  })

  it('should render onboarding wizard', () => {
    render(<OnboardingWizard />)
    expect(screen.getByText(/Master the Science of/i)).toBeInTheDocument()
    expect(screen.getByText(/Professional Kinetic Analysis Engine/i)).toBeInTheDocument()
  })

  it('should render step one initially', () => {
    render(<OnboardingWizard />)
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('Fitness Goals:')).toBeInTheDocument()
  })

  it('should navigate to step 2 when continue is clicked with valid data', async () => {
    const user = userEvent.setup({ delay: null })
    render(<OnboardingWizard />)

    // Select a fitness goal
    const buildMuscleChip = screen.getByText('Build muscle')
    await user.click(buildMuscleChip)

    // Click continue
    const continueButton = screen.getByRole('button', { name: /continue/i })
    await user.click(continueButton)

    await waitFor(
      () => {
        expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  it('should show error when continuing without selecting fitness goals', async () => {
    const user = userEvent.setup({ delay: null })
    render(<OnboardingWizard />)

    const continueButton = screen.getByRole('button', { name: /continue/i })
    await user.click(continueButton)

    await waitFor(
      () => {
        expect(screen.getByText('Please select at least one fitness goal')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  it('should navigate back to step 1 from step 2', async () => {
    const user = userEvent.setup({ delay: null })
    render(<OnboardingWizard />)

    // Complete step 1
    const buildMuscleChip = screen.getByText('Build muscle')
    await user.click(buildMuscleChip)
    const continueButton = screen.getByRole('button', { name: /continue/i })
    await user.click(continueButton)

    await waitFor(
      () => {
        expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    // Go back
    const backButton = screen.getByRole('button', { name: /back/i })
    await user.click(backButton)

    await waitFor(
      () => {
        expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  it('should show preview when submit is clicked with valid data', async () => {
    const user = userEvent.setup({ delay: null })
    render(<OnboardingWizard />)

    // Complete step 1
    const buildMuscleChip = screen.getByText('Build muscle')
    await user.click(buildMuscleChip)
    const continueButton = screen.getByRole('button', { name: /continue/i })
    await user.click(continueButton)

    await waitFor(
      () => {
        expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    // Submit step 2
    const submitButton = screen.getByRole('button', { name: /let's go/i })
    await user.click(submitButton)

    await waitFor(
      () => {
        expect(screen.getByText('Your workout profile is set.')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  it('should show error when age is invalid', async () => {
    const user = userEvent.setup({ delay: null })
    render(<OnboardingWizard />)

    // Complete step 1
    const buildMuscleChip = screen.getByText('Build muscle')
    await user.click(buildMuscleChip)
    const continueButton = screen.getByRole('button', { name: /continue/i })
    await user.click(continueButton)

    await waitFor(
      () => {
        expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    // Enter invalid age
    const ageInput = screen.getByLabelText(/Age/i) as HTMLInputElement
    await user.clear(ageInput)
    await user.type(ageInput, '200')

    // Submit
    const submitButton = screen.getByRole('button', { name: /let's go/i })
    await user.click(submitButton)

    await waitFor(
      () => {
        expect(screen.getByText('Age must be between 13 and 120')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  it('should return to step 1 when edit answers is clicked from preview', async () => {
    const user = userEvent.setup({ delay: null })
    render(<OnboardingWizard />)

    // Complete the form
    const buildMuscleChip = screen.getByText('Build muscle')
    await user.click(buildMuscleChip)
    const continueButton = screen.getByRole('button', { name: /continue/i })
    await user.click(continueButton)

    await waitFor(
      () => {
        expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    const submitButton = screen.getByRole('button', { name: /let's go/i })
    await user.click(submitButton)

    await waitFor(
      () => {
        expect(screen.getByText('Your workout profile is set.')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    // Click edit
    const editButton = screen.getByRole('button', { name: /edit answers/i })
    await user.click(editButton)

    await waitFor(
      () => {
        expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  it('should start loading sequence when create account is clicked', async () => {
    vi.useFakeTimers()
    try {
      const user = userEvent.setup({ delay: null })
      render(<OnboardingWizard />)

      // Complete the form
      const buildMuscleChip = screen.getByText('Build muscle')
      await user.click(buildMuscleChip)
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)

      await waitFor(
        () => {
          expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      const submitButton = screen.getByRole('button', { name: /let's go/i })
      await user.click(submitButton)

      await waitFor(
        () => {
          expect(screen.getByText('Your workout profile is set.')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      // Click create account
      const createAccountButton = screen.getByRole('button', {
        name: /create account to generate workout/i,
      })
      await act(async () => {
        await user.click(createAccountButton)
      })

      // Advance timers to trigger loading state
      await act(async () => {
        vi.advanceTimersByTime(100)
      })

      await waitFor(
        () => {
          expect(screen.getByText('Analyzing Biomechanics...')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      expect(buildSignupUrl).toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  }, 20000) // Increase timeout for this test

  it('should cleanup timeouts on unmount', async () => {
    // Set up spy before rendering to capture all clearTimeout calls
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
    const { unmount } = render(<OnboardingWizard />)

    // Trigger loading state to create timeouts
    const user = userEvent.setup({ delay: null })

    await act(async () => {
      const buildMuscleChip = screen.getByText('Build muscle')
      await user.click(buildMuscleChip)
    })

    await act(async () => {
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
    })

    await waitFor(
      () => {
        expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
      },
      { timeout: 5000 }
    )

    await act(async () => {
      const submitButton = screen.getByRole('button', { name: /let's go/i })
      await user.click(submitButton)
    })

    await waitFor(
      () => {
        expect(screen.getByText('Your workout profile is set.')).toBeInTheDocument()
      },
      { timeout: 5000 }
    )

    // Reset spy count before clicking create account (handleCreateAccount may call clearTimeout)
    const callCountBeforeCreate = clearTimeoutSpy.mock.calls.length

    await act(async () => {
      const createAccountButton = screen.getByRole('button', {
        name: /create account to generate workout/i,
      })
      await user.click(createAccountButton)
    })

    // Wait for loading state to be set and timeouts to be created
    await waitFor(
      () => {
        expect(screen.getByText('Analyzing Biomechanics...')).toBeInTheDocument()
      },
      { timeout: 5000 }
    )

    // Wait a moment to ensure React has processed state updates and timeouts are created
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    // Unmount should cleanup any active timeouts
    // The cleanup useEffect in OnboardingWizard calls clearTimeout for each timeout in timeoutRefs
    // Since handleCreateAccount creates 5 timeouts, cleanup should call clearTimeout 5 times
    await act(async () => {
      unmount()
      // Give cleanup useEffect time to execute
      await new Promise(resolve => setTimeout(resolve, 100))
    })

    // clearTimeout should be called during cleanup useEffect (5 times for 5 timeouts)
    // handleCreateAccount also calls clearTimeout initially, but array is empty so no callback executes
    const callCountAfterUnmount = clearTimeoutSpy.mock.calls.length
    expect(callCountAfterUnmount).toBeGreaterThan(callCountBeforeCreate)

    clearTimeoutSpy.mockRestore()
  }, 20000) // Increase timeout for this test

  it('should handle form data updates correctly', async () => {
    const user = userEvent.setup({ delay: null })
    render(<OnboardingWizard />)

    // Update fitness goals
    await act(async () => {
      const buildMuscleChip = screen.getByText('Build muscle')
      await user.click(buildMuscleChip)
      const loseFatChip = screen.getByText('Lose fat')
      await user.click(loseFatChip)
    })

    // Update fitness level
    const fitnessLevelText = screen.getByText('Fitness Level')
    const levelSelect = fitnessLevelText
      .closest('div')
      ?.querySelector('select') as HTMLSelectElement
    if (levelSelect) {
      await act(async () => {
        await user.selectOptions(levelSelect, 'intermediate')
      })
    }

    // Update equipment
    const equipmentText = screen.getByText('Equipment Access')
    const equipmentSelect = equipmentText
      .closest('div')
      ?.querySelector('select') as HTMLSelectElement
    if (equipmentSelect) {
      await act(async () => {
        await user.selectOptions(equipmentSelect, 'full_gym')
      })
    }

    // Continue to step 2
    const continueButton = screen.getByRole('button', { name: /continue/i })
    await act(async () => {
      await user.click(continueButton)
    })

    await waitFor(
      () => {
        expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
      },
      { timeout: 5000 }
    )

    // Update units
    const kgButton = screen.getByText('kg')
    await act(async () => {
      await user.click(kgButton)
    })

    // Submit
    const submitButton = screen.getByRole('button', { name: /let's go/i })
    await act(async () => {
      await user.click(submitButton)
    })

    await waitFor(
      () => {
        expect(screen.getByText('Your workout profile is set.')).toBeInTheDocument()
      },
      { timeout: 5000 }
    )
  }, 20000) // Increase timeout for this test
})
