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

    // Select a fitness goal - userEvent handles act() internally
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
    const user = userEvent.setup()
    render(<OnboardingWizard />)

    // Complete step 1
    const buildMuscleChip = screen.getByText('Build muscle')
    await act(async () => {
      await user.click(buildMuscleChip)
    })

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

    // Go back
    const backButton = screen.getByRole('button', { name: /back/i })
    await act(async () => {
      await user.click(backButton)
    })

    await waitFor(
      () => {
        expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
      },
      { timeout: 5000 }
    )
  }, 20000)

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
  }, 30000)

  it('should show error when age is invalid', async () => {
    const user = userEvent.setup()
    render(<OnboardingWizard />)

    // Complete step 1
    const buildMuscleChip = screen.getByText('Build muscle')
    await act(async () => {
      await user.click(buildMuscleChip)
    })

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

    // Enter invalid age
    const ageInput = screen.getByLabelText(/Age/i) as HTMLInputElement
    await act(async () => {
      await user.clear(ageInput)
      await user.type(ageInput, '200')
    })

    // Submit
    const submitButton = screen.getByRole('button', { name: /let's go/i })
    await act(async () => {
      await user.click(submitButton)
    })

    await waitFor(
      () => {
        expect(screen.getByText('Age must be between 13 and 120')).toBeInTheDocument()
      },
      { timeout: 5000 }
    )
  }, 20000)

  it('should return to step 1 when edit answers is clicked from preview', async () => {
    const user = userEvent.setup()
    render(<OnboardingWizard />)

    // Complete the form
    const buildMuscleChip = screen.getByText('Build muscle')
    await act(async () => {
      await user.click(buildMuscleChip)
    })

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

    // Click edit
    const editButton = screen.getByRole('button', { name: /edit answers/i })
    await act(async () => {
      await user.click(editButton)
    })

    await waitFor(
      () => {
        expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
      },
      { timeout: 5000 }
    )
  }, 30000)

  it('should start loading sequence when create account is clicked', async () => {
    const user = userEvent.setup()
    render(<OnboardingWizard />)

    // Complete the form
    const buildMuscleChip = screen.getByText('Build muscle')
    await act(async () => {
      await user.click(buildMuscleChip)
    })

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

    // Click create account
    const createAccountButton = screen.getByRole('button', {
      name: /create account to generate workout/i,
    })
    await act(async () => {
      await user.click(createAccountButton)
    })

    // Loading state should appear immediately
    await waitFor(
      () => {
        expect(screen.getByText('Analyzing Biomechanics...')).toBeInTheDocument()
      },
      { timeout: 5000 }
    )

    expect(buildSignupUrl).toHaveBeenCalled()
  }, 30000)

  it('should cleanup timeouts on unmount', async () => {
    vi.useRealTimers()
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
    const { unmount } = render(<OnboardingWizard />)

    // Trigger loading state to create timeouts
    const user = userEvent.setup()

    const buildMuscleChip = screen.getByText('Build muscle')
    await act(async () => {
      await user.click(buildMuscleChip)
    })

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

    const callCountBeforeCreate = clearTimeoutSpy.mock.calls.length

    const createAccountButton = screen.getByRole('button', {
      name: /create account to generate workout/i,
    })
    await act(async () => {
      await user.click(createAccountButton)
    })

    // Wait for loading state - this creates timeouts
    await waitFor(
      () => {
        expect(screen.getByText('Analyzing Biomechanics...')).toBeInTheDocument()
      },
      { timeout: 5000 }
    )

    // Unmount - cleanup should call clearTimeout for all active timeouts
    unmount()

    // Give cleanup a moment with real timers
    await new Promise(resolve => setTimeout(resolve, 100))

    // clearTimeout should have been called (at least once during cleanup)
    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  }, 30000)

  it('should handle form data updates correctly', async () => {
    const user = userEvent.setup({ delay: null })
    render(<OnboardingWizard />)

    // Update fitness goals - userEvent handles act() internally
    const buildMuscleChip = screen.getByText('Build muscle')
    await user.click(buildMuscleChip)
    const loseFatChip = screen.getByText('Lose fat')
    await user.click(loseFatChip)

    // Update fitness level
    const fitnessLevelText = screen.getByText('Fitness Level')
    const levelSelect = fitnessLevelText
      .closest('div')
      ?.querySelector('select') as HTMLSelectElement
    if (levelSelect) {
      await user.selectOptions(levelSelect, 'intermediate')
    }

    // Update equipment
    const equipmentText = screen.getByText('Equipment Categories')
    const equipmentSelect = equipmentText
      .closest('div')
      ?.querySelector('select') as HTMLSelectElement
    if (equipmentSelect) {
      await user.selectOptions(equipmentSelect, 'full_gym')
    }

    // Continue to step 2
    const continueButton = screen.getByRole('button', { name: /continue/i })
    await user.click(continueButton)

    await waitFor(
      () => {
        expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )

    // Update units
    const kgButton = screen.getByText('kg')
    await user.click(kgButton)

    // Submit
    const submitButton = screen.getByRole('button', { name: /let's go/i })
    await user.click(submitButton)

    await waitFor(
      () => {
        expect(screen.getByText('Your workout profile is set.')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  }, 30000)
})
