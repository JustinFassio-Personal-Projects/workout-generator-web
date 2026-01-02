import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StepTwo } from '@/components/landing/WorkoutPlanBuilder/StepTwo'
import type { ActivityLevel, Gender, PreferredUnits } from '@/types/onboarding'

// Mock AOS
vi.mock('aos', () => ({
  default: {
    init: vi.fn(),
  },
}))

describe('StepTwo', () => {
  const defaultPreferredUnits: PreferredUnits = {
    weight: 'lb',
    height: 'in',
    distance: 'mi',
    temperature: 'f',
  }

  const defaultProps = {
    activityLevel: 'moderately_active' as ActivityLevel,
    gender: undefined as Gender | undefined,
    age: undefined as number | undefined,
    preferredUnits: defaultPreferredUnits,
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
    expect(screen.getByText(/How active are you currently/i)).toBeInTheDocument()
    expect(screen.getByText(/Gender/i)).toBeInTheDocument()
    expect(screen.getByText(/Age/i)).toBeInTheDocument()
    expect(screen.getByText(/Preferred units/i)).toBeInTheDocument()
  })

  it('should render activity level select with correct value', () => {
    render(<StepTwo {...defaultProps} activityLevel="very_active" />)
    const select = screen.getByLabelText(/How active are you currently/i) as HTMLSelectElement
    expect(select.value).toBe('very_active')
  })

  it('should call onActivityChange when activity level changes', async () => {
    const user = userEvent.setup()
    const onActivityChange = vi.fn()
    render(<StepTwo {...defaultProps} onActivityChange={onActivityChange} />)

    const select = screen.getByLabelText(/How active are you currently/i)
    await user.selectOptions(select, 'extremely_active')

    await waitFor(() => {
      expect(onActivityChange).toHaveBeenCalledWith('extremely_active')
    })
  })

  it('should render gender select with default value', () => {
    render(<StepTwo {...defaultProps} />)
    const select = screen.getByLabelText(/Gender/i) as HTMLSelectElement
    expect(select.value).toBe('prefer_not_to_say')
  })

  it('should render gender select with provided value', () => {
    render(<StepTwo {...defaultProps} gender="male" />)
    const select = screen.getByLabelText(/Gender/i) as HTMLSelectElement
    expect(select.value).toBe('male')
  })

  it('should call onGenderChange when gender changes', async () => {
    const user = userEvent.setup()
    const onGenderChange = vi.fn()
    render(<StepTwo {...defaultProps} onGenderChange={onGenderChange} />)

    const select = screen.getByLabelText(/Gender/i)
    await user.selectOptions(select, 'female')

    await waitFor(() => {
      expect(onGenderChange).toHaveBeenCalledWith('female')
    })
  })

  it('should render age input as empty when age is undefined', () => {
    render(<StepTwo {...defaultProps} />)
    const ageInput = screen.getByLabelText(/Age/i) as HTMLInputElement
    expect(ageInput.value).toBe('')
  })

  it('should render age input with provided value', () => {
    render(<StepTwo {...defaultProps} age={28} />)
    const ageInput = screen.getByLabelText(/Age/i) as HTMLInputElement
    expect(ageInput.value).toBe('28')
  })

  it('should call onAgeChange when age input changes', async () => {
    const user = userEvent.setup()
    const onAgeChange = vi.fn()
    render(<StepTwo {...defaultProps} onAgeChange={onAgeChange} />)

    const ageInput = screen.getByLabelText(/Age/i)
    await user.clear(ageInput)
    // Use paste to set the value all at once, which triggers a single onChange
    await user.click(ageInput)
    await user.paste('25')

    // Wait for onAgeChange to be called with 25
    await waitFor(() => {
      expect(onAgeChange).toHaveBeenCalledWith(25)
    })
  })

  it('should clear age when input is cleared', async () => {
    const user = userEvent.setup()
    const onAgeChange = vi.fn()
    render(<StepTwo {...defaultProps} age={30} onAgeChange={onAgeChange} />)

    const ageInput = screen.getByLabelText(/Age/i)
    await user.clear(ageInput)

    await waitFor(() => {
      expect(onAgeChange).toHaveBeenCalledWith(undefined)
    })
  })

  it('should display error message for age', () => {
    render(<StepTwo {...defaultProps} errors={{ age: 'Age must be between 13 and 120' }} />)
    expect(screen.getByText('Age must be between 13 and 120')).toBeInTheDocument()
  })

  it('should render unit toggles for weight', () => {
    render(<StepTwo {...defaultProps} />)
    expect(screen.getByText('Weight:')).toBeInTheDocument()
    expect(screen.getByText('lb')).toBeInTheDocument()
    expect(screen.getByText('kg')).toBeInTheDocument()
  })

  it('should render unit toggles for height', () => {
    render(<StepTwo {...defaultProps} />)
    expect(screen.getByText('Height:')).toBeInTheDocument()
    expect(screen.getByText('in')).toBeInTheDocument()
    expect(screen.getByText('cm')).toBeInTheDocument()
  })

  it('should show active state for weight unit', () => {
    render(
      <StepTwo {...defaultProps} preferredUnits={{ ...defaultPreferredUnits, weight: 'kg' }} />
    )
    const kgButton = screen.getByText('kg').closest('button')
    expect(kgButton).toHaveClass(/toggleActive/)
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

  it('should call onSubmit when See My Plan button is clicked', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<StepTwo {...defaultProps} onSubmit={onSubmit} />)

    const submitButton = screen.getByRole('button', { name: /see my plan/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
    })
  })

  it('should show optional indicators for gender and age', () => {
    render(<StepTwo {...defaultProps} />)
    const optionalIndicators = screen.getAllByText('(optional)')
    expect(optionalIndicators.length).toBe(2)
  })

  it('should show required indicator for activity level', () => {
    render(<StepTwo {...defaultProps} />)
    const requiredIndicator = screen.getByText(/How active are you currently/i).parentElement
    expect(requiredIndicator?.textContent).toContain('*')
  })
})
