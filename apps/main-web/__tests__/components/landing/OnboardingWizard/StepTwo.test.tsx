import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StepTwo } from '@/components/landing/OnboardingWizard/StepTwo'
import type { ActivityLevel, Gender, PreferredUnits } from '@/types/onboarding'

// Mock AOS
vi.mock('aos', () => ({
  default: {
    init: vi.fn(),
  },
}))

describe('OnboardingWizard StepTwo', () => {
  const defaultProps = {
    activityLevel: 'moderately_active' as ActivityLevel,
    gender: undefined as Gender | undefined,
    age: undefined as number | undefined,
    preferredUnits: {
      weight: 'lb',
      height: 'in',
      distance: 'mi',
      temperature: 'f',
    } as PreferredUnits,
    errors: {},
    onActivityChange: vi.fn(),
    onGenderChange: vi.fn(),
    onAgeChange: vi.fn(),
    onUnitsChange: vi.fn(),
    onBack: vi.fn(),
    onSubmit: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render step two form', () => {
    render(<StepTwo {...defaultProps} />)
    expect(screen.getByText('Activity Level')).toBeInTheDocument()
    expect(screen.getByText(/Gender/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Age/i)).toBeInTheDocument()
    expect(screen.getByText('Unit Preferences:')).toBeInTheDocument()
  })

  it('should render activity level select with correct value', () => {
    render(<StepTwo {...defaultProps} activityLevel="very_active" />)
    const activityText = screen.getByText('Activity Level')
    const select = activityText.closest('div')?.querySelector('select') as HTMLSelectElement
    expect(select).toBeInTheDocument()
    expect(select?.value).toBe('very_active')
  })

  it('should call onActivityChange when activity level changes', async () => {
    const user = userEvent.setup()
    const onActivityChange = vi.fn()
    render(<StepTwo {...defaultProps} onActivityChange={onActivityChange} />)

    const activityText = screen.getByText('Activity Level')
    const select = activityText.closest('div')?.querySelector('select') as HTMLSelectElement
    if (select) {
      await user.selectOptions(select, 'lightly_active')
    }

    await waitFor(() => {
      expect(onActivityChange).toHaveBeenCalledWith('lightly_active')
    })
  })

  it('should render gender select with default value when gender is undefined', () => {
    render(<StepTwo {...defaultProps} gender={undefined} />)
    const genderText = screen.getByText(/Gender/i)
    const select = genderText.closest('div')?.querySelector('select') as HTMLSelectElement
    expect(select).toBeInTheDocument()
    expect(select?.value).toBe('prefer_not_to_say')
  })

  it('should call onGenderChange when gender changes', async () => {
    const user = userEvent.setup()
    const onGenderChange = vi.fn()
    render(<StepTwo {...defaultProps} onGenderChange={onGenderChange} />)

    const genderText = screen.getByText(/Gender/i)
    const select = genderText.closest('div')?.querySelector('select') as HTMLSelectElement
    if (select) {
      await user.selectOptions(select, 'male')
    }

    await waitFor(() => {
      expect(onGenderChange).toHaveBeenCalledWith('male')
    })
  })

  it('should handle age input change', async () => {
    const user = userEvent.setup()
    const onAgeChange = vi.fn()
    render(<StepTwo {...defaultProps} onAgeChange={onAgeChange} />)

    const ageInput = screen.getByLabelText(/Age/i) as HTMLInputElement
    // Type a valid number - onChange should be called
    await user.type(ageInput, '25')

    // Wait for onChange to be called with a valid number
    await waitFor(
      () => {
        expect(onAgeChange).toHaveBeenCalled()
        // Verify it was called with a number (could be 2, 25, etc. depending on timing)
        const calls = onAgeChange.mock.calls
        const hasValidNumber = calls.some(
          call => call[0] !== undefined && typeof call[0] === 'number' && !isNaN(call[0])
        )
        expect(hasValidNumber).toBe(true)
      },
      { timeout: 3000 }
    )
  })

  it('should handle age input clearing', async () => {
    const user = userEvent.setup()
    const onAgeChange = vi.fn()
    render(<StepTwo {...defaultProps} age={28} onAgeChange={onAgeChange} />)

    const ageInput = screen.getByLabelText(/Age/i) as HTMLInputElement
    await user.clear(ageInput)

    await waitFor(
      () => {
        expect(onAgeChange).toHaveBeenCalledWith(undefined)
      },
      { timeout: 3000 }
    )
  })

  it('should not call onAgeChange with invalid non-numeric input', async () => {
    const user = userEvent.setup()
    const onAgeChange = vi.fn()
    render(<StepTwo {...defaultProps} onAgeChange={onAgeChange} />)

    const ageInput = screen.getByLabelText(/Age/i) as HTMLInputElement
    // Type non-numeric characters
    await user.type(ageInput, 'abc')

    // The component's handleAgeChange parses the input with parseInt
    // If parsing fails (NaN), it won't call onAgeChange
    // Wait a bit to ensure no valid calls were made
    await new Promise(resolve => setTimeout(resolve, 100))

    // Check that no valid number calls were made
    const validCalls = onAgeChange.mock.calls.filter(
      call => call[0] !== undefined && typeof call[0] === 'number' && !isNaN(call[0])
    )
    expect(validCalls.length).toBe(0)
  })

  it('should render unit preference buttons', () => {
    render(<StepTwo {...defaultProps} />)
    expect(screen.getByText('lb')).toBeInTheDocument()
    expect(screen.getByText('kg')).toBeInTheDocument()
    expect(screen.getByText('in')).toBeInTheDocument()
    expect(screen.getByText('cm')).toBeInTheDocument()
  })

  it('should call onUnitsChange when weight unit is clicked', async () => {
    const user = userEvent.setup()
    const onUnitsChange = vi.fn()
    render(<StepTwo {...defaultProps} onUnitsChange={onUnitsChange} />)

    const kgButton = screen.getByText('kg')
    await user.click(kgButton)

    await waitFor(() => {
      expect(onUnitsChange).toHaveBeenCalledWith({ weight: 'kg' })
    })
  })

  it('should call onUnitsChange when height unit is clicked', async () => {
    const user = userEvent.setup()
    const onUnitsChange = vi.fn()
    render(<StepTwo {...defaultProps} onUnitsChange={onUnitsChange} />)

    const cmButton = screen.getByText('cm')
    await user.click(cmButton)

    await waitFor(() => {
      expect(onUnitsChange).toHaveBeenCalledWith({ height: 'cm' })
    })
  })

  it('should display error message for age', () => {
    render(<StepTwo {...defaultProps} errors={{ age: 'Age must be between 13 and 120' }} />)
    expect(screen.getByText('Age must be between 13 and 120')).toBeInTheDocument()
  })

  it('should display error message for activity level', () => {
    render(
      <StepTwo {...defaultProps} errors={{ activity_level: 'Please select an activity level' }} />
    )
    expect(screen.getByText('Please select an activity level')).toBeInTheDocument()
  })

  it('should call onBack when back button is clicked', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()
    render(<StepTwo {...defaultProps} onBack={onBack} />)

    const backButton = screen.getByRole('button', { name: /back/i })
    await user.click(backButton)

    await waitFor(() => {
      expect(onBack).toHaveBeenCalled()
    })
  })

  it('should call onSubmit when submit button is clicked', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<StepTwo {...defaultProps} onSubmit={onSubmit} />)

    const submitButton = screen.getByRole('button', { name: /let's go/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })
  })
})
