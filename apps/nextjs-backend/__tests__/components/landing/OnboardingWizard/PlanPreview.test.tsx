import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlanPreview } from '@/components/landing/OnboardingWizard/PlanPreview'
import type { WebsiteOnboardingData } from '@/types/onboarding'

// Mock AOS
vi.mock('aos', () => ({
  default: {
    init: vi.fn(),
  },
}))

describe('OnboardingWizard PlanPreview', () => {
  const defaultData: WebsiteOnboardingData = {
    fitness_level: 'beginner',
    current_activity_level: 'moderately_active',
    fitness_goals: ['Build muscle', 'Lose fat'],
    equipment_access: ['general', 'strength'],
    preferred_units: {
      weight: 'lb',
      height: 'in',
      distance: 'mi',
      temperature: 'f',
    },
  }

  const defaultProps = {
    data: defaultData,
    onEdit: vi.fn(),
    onCreateAccount: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render plan preview', () => {
    render(<PlanPreview {...defaultProps} />)
    expect(screen.getByText('Your workout profile is set.')).toBeInTheDocument()
    expect(
      screen.getByText("Here's what we'll use to build your personalized plan.")
    ).toBeInTheDocument()
  })

  it('should render all preview cards', () => {
    render(<PlanPreview {...defaultProps} />)
    expect(screen.getByText('Goals')).toBeInTheDocument()
    expect(screen.getByText('Level')).toBeInTheDocument()
    expect(screen.getByText('Activity')).toBeInTheDocument()
    expect(screen.getByText('Equipment')).toBeInTheDocument()
  })

  it('should display fitness goals correctly for single goal', () => {
    const singleGoalData: WebsiteOnboardingData = {
      ...defaultData,
      fitness_goals: ['Build muscle'],
    }
    render(<PlanPreview {...defaultProps} data={singleGoalData} />)
    expect(screen.getByText('Build muscle')).toBeInTheDocument()
  })

  it('should display fitness goals correctly for multiple goals', () => {
    render(<PlanPreview {...defaultProps} />)
    expect(screen.getByText('Build muscle & Lose fat')).toBeInTheDocument()
  })

  it('should display fitness level label', () => {
    render(<PlanPreview {...defaultProps} />)
    expect(screen.getByText('Beginner')).toBeInTheDocument()
  })

  it('should display activity level label', () => {
    render(<PlanPreview {...defaultProps} />)
    expect(screen.getByText('Moderately active (3-4 days/week)')).toBeInTheDocument()
  })

  it('should display equipment access label', () => {
    render(<PlanPreview {...defaultProps} />)
    expect(screen.getByText(/General.*Universal.*Strength Training/i)).toBeInTheDocument()
  })

  it('should call onCreateAccount when create account button is clicked', async () => {
    const user = userEvent.setup()
    const onCreateAccount = vi.fn()
    render(<PlanPreview {...defaultProps} onCreateAccount={onCreateAccount} />)

    const createAccountButton = screen.getByRole('button', {
      name: /create account to generate workout/i,
    })
    await user.click(createAccountButton)

    await waitFor(() => {
      expect(onCreateAccount).toHaveBeenCalled()
    })
  })

  it('should call onEdit when edit button is clicked', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    render(<PlanPreview {...defaultProps} onEdit={onEdit} />)

    const editButton = screen.getByRole('button', { name: /edit answers/i })
    await user.click(editButton)

    await waitFor(() => {
      expect(onEdit).toHaveBeenCalled()
    })
  })

  it('should format goals correctly for three goals', () => {
    const threeGoalsData: WebsiteOnboardingData = {
      ...defaultData,
      fitness_goals: ['Build muscle', 'Lose fat', 'Improve endurance'],
    }
    render(<PlanPreview {...defaultProps} data={threeGoalsData} />)
    expect(screen.getByText('Build muscle, Lose fat & Improve endurance')).toBeInTheDocument()
  })

  it('should handle unknown fitness level value', () => {
    const unknownData: WebsiteOnboardingData = {
      ...defaultData,
      fitness_level: 'unknown' as any,
    }
    render(<PlanPreview {...defaultProps} data={unknownData} />)
    expect(screen.getByText('unknown')).toBeInTheDocument()
  })
})
