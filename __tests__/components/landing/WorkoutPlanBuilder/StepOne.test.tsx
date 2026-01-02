import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StepOne } from '@/components/landing/WorkoutPlanBuilder/StepOne'
import type { FitnessGoal, FitnessLevel, EquipmentAccess } from '@/types/onboarding'

// Mock AOS
vi.mock('aos', () => ({
  default: {
    init: vi.fn(),
  },
}))

describe('StepOne', () => {
  const defaultProps = {
    fitnessGoals: [] as FitnessGoal[],
    fitnessLevel: 'beginner' as FitnessLevel,
    equipmentAccess: 'home' as EquipmentAccess,
    errors: {},
    onGoalsChange: vi.fn(),
    onLevelChange: vi.fn(),
    onEquipmentChange: vi.fn(),
    onContinue: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render step one form', () => {
    render(<StepOne {...defaultProps} />)
    expect(screen.getByText(/What are your fitness goals/i)).toBeInTheDocument()
    expect(screen.getByText(/What's your current fitness level/i)).toBeInTheDocument()
    expect(screen.getByText(/What equipment do you have access to/i)).toBeInTheDocument()
  })

  it('should render all fitness goal chips', () => {
    render(<StepOne {...defaultProps} />)
    expect(screen.getByText('Build muscle')).toBeInTheDocument()
    expect(screen.getByText('Lose fat')).toBeInTheDocument()
    expect(screen.getByText('Improve endurance')).toBeInTheDocument()
    expect(screen.getByText('Increase strength')).toBeInTheDocument()
    expect(screen.getByText('Mobility & flexibility')).toBeInTheDocument()
    expect(screen.getByText('General health')).toBeInTheDocument()
  })

  it('should toggle fitness goal when chip is clicked', async () => {
    const user = userEvent.setup()
    const onGoalsChange = vi.fn()
    render(<StepOne {...defaultProps} onGoalsChange={onGoalsChange} />)

    const buildMuscleChip = screen.getByText('Build muscle')
    await user.click(buildMuscleChip)

    await waitFor(() => {
      expect(onGoalsChange).toHaveBeenCalledWith(['Build muscle'])
    })
  })

  it('should show selected state for fitness goals', () => {
    render(<StepOne {...defaultProps} fitnessGoals={['Build muscle', 'Lose fat']} />)
    const buildMuscleChip = screen.getByText('Build muscle').closest('button')
    const loseFatChip = screen.getByText('Lose fat').closest('button')

    expect(buildMuscleChip).toHaveAttribute('aria-pressed', 'true')
    expect(loseFatChip).toHaveAttribute('aria-pressed', 'true')
  })

  it('should deselect fitness goal when clicked again', async () => {
    const user = userEvent.setup()
    const onGoalsChange = vi.fn()
    render(
      <StepOne {...defaultProps} fitnessGoals={['Build muscle']} onGoalsChange={onGoalsChange} />
    )

    const buildMuscleChip = screen.getByText('Build muscle')
    await user.click(buildMuscleChip)

    await waitFor(() => {
      expect(onGoalsChange).toHaveBeenCalledWith([])
    })
  })

  it('should render fitness level select with correct value', () => {
    render(<StepOne {...defaultProps} fitnessLevel="intermediate" />)
    const select = screen.getByLabelText(/What's your current fitness level/i) as HTMLSelectElement
    expect(select.value).toBe('intermediate')
  })

  it('should call onLevelChange when fitness level changes', async () => {
    const user = userEvent.setup()
    const onLevelChange = vi.fn()
    render(<StepOne {...defaultProps} onLevelChange={onLevelChange} />)

    const select = screen.getByLabelText(/What's your current fitness level/i)
    await user.selectOptions(select, 'advanced')

    await waitFor(() => {
      expect(onLevelChange).toHaveBeenCalledWith('advanced')
    })
  })

  it('should render equipment access select with correct value', () => {
    render(<StepOne {...defaultProps} equipmentAccess="full_gym" />)
    const select = screen.getByLabelText(
      /What equipment do you have access to/i
    ) as HTMLSelectElement
    expect(select.value).toBe('full_gym')
  })

  it('should call onEquipmentChange when equipment access changes', async () => {
    const user = userEvent.setup()
    const onEquipmentChange = vi.fn()
    render(<StepOne {...defaultProps} onEquipmentChange={onEquipmentChange} />)

    const select = screen.getByLabelText(/What equipment do you have access to/i)
    await user.selectOptions(select, 'minimal')

    await waitFor(() => {
      expect(onEquipmentChange).toHaveBeenCalledWith('minimal')
    })
  })

  it('should display error message for fitness goals', () => {
    render(
      <StepOne
        {...defaultProps}
        errors={{ fitness_goals: 'Please select at least one fitness goal' }}
      />
    )
    expect(screen.getByText('Please select at least one fitness goal')).toBeInTheDocument()
  })

  it('should display error message for fitness level', () => {
    render(
      <StepOne {...defaultProps} errors={{ fitness_level: 'Please select a fitness level' }} />
    )
    expect(screen.getByText('Please select a fitness level')).toBeInTheDocument()
  })

  it('should display error message for equipment access', () => {
    render(
      <StepOne {...defaultProps} errors={{ equipment_access: 'Please select equipment access' }} />
    )
    expect(screen.getByText('Please select equipment access')).toBeInTheDocument()
  })

  it('should call onContinue when continue button is clicked', async () => {
    const user = userEvent.setup()
    const onContinue = vi.fn()
    render(<StepOne {...defaultProps} onContinue={onContinue} />)

    const continueButton = screen.getByRole('button', { name: /continue/i })
    await user.click(continueButton)

    await waitFor(() => {
      expect(onContinue).toHaveBeenCalled()
    })
  })

  it('should show required field indicators', () => {
    render(<StepOne {...defaultProps} />)
    const requiredIndicators = screen.getAllByText('*')
    expect(requiredIndicators.length).toBeGreaterThan(0)
  })

  it('should show field hint for goals', () => {
    render(<StepOne {...defaultProps} />)
    expect(screen.getByText('Select all that apply')).toBeInTheDocument()
  })
})
