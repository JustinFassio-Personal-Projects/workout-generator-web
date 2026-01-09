import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkoutPlanBuilder } from '@/components/landing/WorkoutPlanBuilder/WorkoutPlanBuilder'

// Mock AOS
vi.mock('aos', () => ({
  default: {
    init: vi.fn(),
  },
}))

// Mock window.location
const mockLocation = {
  href: '',
}
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
})

describe('WorkoutPlanBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocation.href = ''
  })

  it('should render workout builder section', () => {
    render(<WorkoutPlanBuilder />)
    const section = document.querySelector('section#workout-builder')
    expect(section).toBeInTheDocument()
  })

  it('should render section header with title and subtitle', () => {
    render(<WorkoutPlanBuilder />)
    expect(screen.getByText('Workout Plan Builder')).toBeInTheDocument()
    expect(screen.getByText(/Build your AI workout plan/i)).toBeInTheDocument()
    expect(screen.getByText(/Choose your goal/i)).toBeInTheDocument()
  })

  it('should render step one initially', () => {
    render(<WorkoutPlanBuilder />)
    expect(screen.getByText(/What are your fitness goals/i)).toBeInTheDocument()
    expect(screen.getByText(/What's your current fitness level/i)).toBeInTheDocument()
    expect(screen.getByText(/What equipment do you have access to/i)).toBeInTheDocument()
  })

  it('should show progress indicator for step 1', () => {
    render(<WorkoutPlanBuilder />)
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
  })

  it('should navigate to step 2 when continue is clicked with valid data', async () => {
    const user = userEvent.setup()
    render(<WorkoutPlanBuilder />)

    // Select a fitness goal
    const buildMuscleChip = screen.getByText('Build muscle')
    await user.click(buildMuscleChip)

    // Click continue
    const continueButton = screen.getByRole('button', { name: /continue/i })
    await user.click(continueButton)

    await waitFor(() => {
      expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
      expect(screen.getByText(/How active are you currently/i)).toBeInTheDocument()
    })
  })

  it('should show error when continuing without selecting fitness goals', async () => {
    const user = userEvent.setup()
    await act(async () => {
      render(<WorkoutPlanBuilder />)
    })

    await act(async () => {
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
    })

    await waitFor(() => {
      expect(screen.getByText(/Please select at least one fitness goal/i)).toBeInTheDocument()
    })
  })

  it('should navigate back to step 1 from step 2', async () => {
    const user = userEvent.setup()
    await act(async () => {
      render(<WorkoutPlanBuilder />)
    })

    // Go to step 2
    await act(async () => {
      const buildMuscleChip = screen.getByText('Build muscle')
      await user.click(buildMuscleChip)
    })
    await act(async () => {
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
    })

    // Go back to step 1
    await act(async () => {
      const backButton = screen.getByRole('button', { name: /back/i })
      await user.click(backButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
      expect(screen.getByText(/What are your fitness goals/i)).toBeInTheDocument()
    })
  })

  it('should show preview when See My Plan is clicked with valid data', async () => {
    const user = userEvent.setup()
    await act(async () => {
      render(<WorkoutPlanBuilder />)
    })

    // Complete step 1
    await act(async () => {
      const buildMuscleChip = screen.getByText('Build muscle')
      await user.click(buildMuscleChip)
    })
    await act(async () => {
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
    })

    // Complete step 2
    await act(async () => {
      const seeMyPlanButton = screen.getByRole('button', { name: /see my plan/i })
      await user.click(seeMyPlanButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Your plan is ready.')).toBeInTheDocument()
      expect(screen.getByText(/Here's a summary/i)).toBeInTheDocument()
    })
  })

  it('should show error when age is invalid', async () => {
    const user = userEvent.setup()
    await act(async () => {
      render(<WorkoutPlanBuilder />)
    })

    // Go to step 2
    await act(async () => {
      const buildMuscleChip = screen.getByText('Build muscle')
      await user.click(buildMuscleChip)
    })
    await act(async () => {
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
    })

    // Enter invalid age
    await act(async () => {
      const ageInput = screen.getByLabelText(/Age/i)
      await user.type(ageInput, '200')
    })

    // Try to submit
    await act(async () => {
      const seeMyPlanButton = screen.getByRole('button', { name: /see my plan/i })
      await user.click(seeMyPlanButton)
    })

    await waitFor(() => {
      expect(screen.getByText(/Age must be between 13 and 120/i)).toBeInTheDocument()
    })
  })

  it('should redirect to signup URL when create account is clicked', async () => {
    const user = userEvent.setup()
    await act(async () => {
      render(<WorkoutPlanBuilder />)
    })

    // Complete the form
    await act(async () => {
      const buildMuscleChip = screen.getByText('Build muscle')
      await user.click(buildMuscleChip)
    })
    await act(async () => {
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
    })

    await act(async () => {
      const seeMyPlanButton = screen.getByRole('button', { name: /see my plan/i })
      await user.click(seeMyPlanButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Your plan is ready.')).toBeInTheDocument()
    })

    // Click create account
    await act(async () => {
      const createAccountButton = screen.getByRole('button', {
        name: /create account to generate workout/i,
      })
      await user.click(createAccountButton)
    })

    await waitFor(() => {
      expect(mockLocation.href).toContain('https://aiworkoutgen.app/signup?')
      expect(mockLocation.href).toContain('fitness_level=beginner')
      // URLSearchParams encodes spaces as +
      expect(mockLocation.href).toContain('fitness_goals=Build+muscle')
    })
  })

  it('should return to step 1 when edit answers is clicked from preview', async () => {
    const user = userEvent.setup()
    await act(async () => {
      render(<WorkoutPlanBuilder />)
    })

    // Complete form to get to preview
    await act(async () => {
      const buildMuscleChip = screen.getByText('Build muscle')
      await user.click(buildMuscleChip)
    })
    await act(async () => {
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
    })

    await act(async () => {
      const seeMyPlanButton = screen.getByRole('button', { name: /see my plan/i })
      await user.click(seeMyPlanButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Your plan is ready.')).toBeInTheDocument()
    })

    // Click edit answers
    await act(async () => {
      const editButton = screen.getByRole('button', { name: /edit answers/i })
      await user.click(editButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
      expect(screen.getByText(/What are your fitness goals/i)).toBeInTheDocument()
    })
  })

  it('should include optional fields in URL when provided', async () => {
    const user = userEvent.setup()
    await act(async () => {
      render(<WorkoutPlanBuilder />)
    })

    // Complete step 1
    await act(async () => {
      const buildMuscleChip = screen.getByText('Build muscle')
      await user.click(buildMuscleChip)
    })
    await act(async () => {
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
    })

    // Add optional fields
    await act(async () => {
      const genderSelect = screen.getByLabelText(/Gender/i)
      await user.selectOptions(genderSelect, 'male')
    })

    await act(async () => {
      const ageInput = screen.getByLabelText(/Age/i)
      await user.type(ageInput, '28')
    })

    // Submit
    await act(async () => {
      const seeMyPlanButton = screen.getByRole('button', { name: /see my plan/i })
      await user.click(seeMyPlanButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Your plan is ready.')).toBeInTheDocument()
    })

    // Click create account
    await act(async () => {
      const createAccountButton = screen.getByRole('button', {
        name: /create account to generate workout/i,
      })
      await user.click(createAccountButton)
    })

    await waitFor(() => {
      expect(mockLocation.href).toContain('gender=male')
      expect(mockLocation.href).toContain('age=28')
    })
  })

  it('should render trust badges', () => {
    render(<WorkoutPlanBuilder />)
    expect(screen.getByText('No credit card required')).toBeInTheDocument()
    expect(
      screen.getByText(/We don't store answers until you create an account/i)
    ).toBeInTheDocument()
    expect(screen.getByText('Edit anytime')).toBeInTheDocument()
  })

  it('should update progress bar when moving to step 2', async () => {
    const user = userEvent.setup()
    await act(async () => {
      render(<WorkoutPlanBuilder />)
    })

    await act(async () => {
      const buildMuscleChip = screen.getByText('Build muscle')
      await user.click(buildMuscleChip)
    })
    await act(async () => {
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
    })

    // Check progress bar (should be 100% for step 2)
    const progressBar = document.querySelector('[style*="width: 100%"]')
    expect(progressBar).toBeInTheDocument()
  })

  it('should handle unit preference changes', async () => {
    const user = userEvent.setup()
    await act(async () => {
      render(<WorkoutPlanBuilder />)
    })

    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText(/What are your fitness goals/i)).toBeInTheDocument()
    })

    // Go to step 2
    await act(async () => {
      const buildMuscleChip = screen.getByText('Build muscle')
      await user.click(buildMuscleChip)
    })
    await act(async () => {
      const continueButton = screen.getByRole('button', { name: /continue/i })
      await user.click(continueButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
    })

    // Change weight unit
    await act(async () => {
      const kgButton = screen.getByText('kg')
      await user.click(kgButton)
    })

    // Change height unit
    await act(async () => {
      const cmButton = screen.getByText('cm')
      await user.click(cmButton)
    })

    // Verify units are updated (they should be active)
    await waitFor(() => {
      const kgButton = screen.getByText('kg')
      const cmButton = screen.getByText('cm')
      expect(kgButton.closest('button')).toHaveClass(/toggleActive/)
      expect(cmButton.closest('button')).toHaveClass(/toggleActive/)
    })
  })
})
