import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlanPreview } from '@/components/landing/WorkoutPlanBuilder/PlanPreview'
import type { WebsiteOnboardingData } from '@/types/onboarding'

// Mock AOS
vi.mock('aos', () => ({
  default: {
    init: vi.fn(),
  },
}))

describe('PlanPreview', () => {
  const defaultData: WebsiteOnboardingData = {
    fitness_level: 'beginner',
    current_activity_level: 'moderately_active',
    fitness_goals: ['Build muscle', 'Lose fat'],
    equipment_access: 'home',
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
    expect(screen.getByText('Your plan is ready.')).toBeInTheDocument()
    expect(screen.getByText(/Here's a summary/i)).toBeInTheDocument()
  })

  it('should display single fitness goal', () => {
    const data: WebsiteOnboardingData = {
      ...defaultData,
      fitness_goals: ['Build muscle'],
    }
    render(<PlanPreview {...defaultProps} data={data} />)
    expect(screen.getByText('Build muscle')).toBeInTheDocument()
  })

  it('should display multiple fitness goals with proper formatting', () => {
    render(<PlanPreview {...defaultProps} />)
    expect(screen.getByText('Build muscle & Lose fat')).toBeInTheDocument()
  })

  it('should display three or more fitness goals correctly', () => {
    const data: WebsiteOnboardingData = {
      ...defaultData,
      fitness_goals: ['Build muscle', 'Lose fat', 'Improve endurance'],
    }
    render(<PlanPreview {...defaultProps} data={data} />)
    expect(screen.getByText('Build muscle, Lose fat & Improve endurance')).toBeInTheDocument()
  })

  it('should display fitness level', () => {
    render(<PlanPreview {...defaultProps} />)
    expect(screen.getByText('Beginner')).toBeInTheDocument()
  })

  it('should display activity level', () => {
    render(<PlanPreview {...defaultProps} />)
    expect(screen.getByText(/Moderately active/i)).toBeInTheDocument()
  })

  it('should display equipment access', () => {
    render(<PlanPreview {...defaultProps} />)
    expect(screen.getByText(/Home gym/i)).toBeInTheDocument()
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

  it('should call onEdit when edit answers button is clicked', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    render(<PlanPreview {...defaultProps} onEdit={onEdit} />)

    const editButton = screen.getByRole('button', { name: /edit answers/i })
    await user.click(editButton)

    await waitFor(() => {
      expect(onEdit).toHaveBeenCalled()
    })
  })

  it('should display all preview items with icons', () => {
    render(<PlanPreview {...defaultProps} />)
    expect(screen.getByText('Goals')).toBeInTheDocument()
    expect(screen.getByText('Level')).toBeInTheDocument()
    expect(screen.getByText('Activity')).toBeInTheDocument()
    expect(screen.getByText('Equipment')).toBeInTheDocument()
  })

  it('should handle advanced fitness level', () => {
    const data: WebsiteOnboardingData = {
      ...defaultData,
      fitness_level: 'advanced',
    }
    render(<PlanPreview {...defaultProps} data={data} />)
    expect(screen.getByText('Advanced')).toBeInTheDocument()
  })

  it('should handle athlete fitness level', () => {
    const data: WebsiteOnboardingData = {
      ...defaultData,
      fitness_level: 'athlete',
    }
    render(<PlanPreview {...defaultProps} data={data} />)
    expect(screen.getByText('Athlete')).toBeInTheDocument()
  })

  it('should handle different equipment access options', () => {
    const data: WebsiteOnboardingData = {
      ...defaultData,
      equipment_access: 'full_gym',
    }
    render(<PlanPreview {...defaultProps} data={data} />)
    expect(screen.getByText(/Full gym access/i)).toBeInTheDocument()
  })

  it('should handle different activity levels', () => {
    const data: WebsiteOnboardingData = {
      ...defaultData,
      current_activity_level: 'extremely_active',
    }
    render(<PlanPreview {...defaultProps} data={data} />)
    expect(screen.getByText(/Extremely active/i)).toBeInTheDocument()
  })
})
