import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Accordion, type AccordionItem } from '@/components/ui/Accordion/Accordion'

// Mock lucide-react ChevronDown icon
vi.mock('lucide-react', () => ({
  ChevronDown: ({ className, size }: { className?: string; size?: number }) => (
    <span data-testid="chevron-icon" className={className} data-size={size}>
      ▼
    </span>
  ),
}))

// Mock AOS
vi.mock('aos', () => ({
  default: {
    init: vi.fn(),
  },
}))

describe('Accordion', () => {
  const mockItems: AccordionItem[] = [
    {
      id: 'item-1',
      question: 'Question 1',
      answer: 'Answer 1',
    },
    {
      id: 'item-2',
      question: 'Question 2',
      answer: 'Answer 2',
      buttonText: 'Action Button',
      onButtonClick: vi.fn(),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render all accordion items', () => {
    render(<Accordion items={mockItems} />)

    expect(screen.getByText('Question 1')).toBeInTheDocument()
    expect(screen.getByText('Answer 1')).toBeInTheDocument()
    expect(screen.getByText('Question 2')).toBeInTheDocument()
    expect(screen.getByText('Answer 2')).toBeInTheDocument()
  })

  it('should open an item when clicked', () => {
    render(<Accordion items={mockItems} />)

    const trigger = screen.getByText('Question 1').closest('button')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(trigger!)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('should close an item when clicked again', () => {
    render(<Accordion items={mockItems} />)

    const trigger = screen.getByText('Question 1').closest('button')

    // Open the item
    fireEvent.click(trigger!)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    // Close the item
    fireEvent.click(trigger!)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('should open default item when defaultOpenId is provided', () => {
    render(<Accordion items={mockItems} defaultOpenId="item-1" />)

    const trigger = screen.getByText('Question 1').closest('button')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('should close one item when another is opened', () => {
    render(<Accordion items={mockItems} />)

    const trigger1 = screen.getByText('Question 1').closest('button')
    const trigger2 = screen.getByText('Question 2').closest('button')

    // Open first item
    fireEvent.click(trigger1!)
    expect(trigger1).toHaveAttribute('aria-expanded', 'true')
    expect(trigger2).toHaveAttribute('aria-expanded', 'false')

    // Open second item
    fireEvent.click(trigger2!)
    expect(trigger1).toHaveAttribute('aria-expanded', 'false')
    expect(trigger2).toHaveAttribute('aria-expanded', 'true')
  })

  it('should render action button when buttonText and onButtonClick are provided', () => {
    render(<Accordion items={mockItems} />)

    const trigger = screen.getByText('Question 2').closest('button')
    fireEvent.click(trigger!)

    const actionButton = screen.getByText('Action Button')
    expect(actionButton).toBeInTheDocument()
  })

  it('should call onButtonClick when action button is clicked', () => {
    const mockOnButtonClick = vi.fn()
    const itemsWithButton: AccordionItem[] = [
      {
        id: 'item-1',
        question: 'Question 1',
        answer: 'Answer 1',
        buttonText: 'Click Me',
        onButtonClick: mockOnButtonClick,
      },
    ]

    render(<Accordion items={itemsWithButton} />)

    const trigger = screen.getByText('Question 1').closest('button')
    fireEvent.click(trigger!)

    const actionButton = screen.getByText('Click Me')
    fireEvent.click(actionButton)

    expect(mockOnButtonClick).toHaveBeenCalledTimes(1)
  })

  it('should not render action button when buttonText is missing', () => {
    const itemsWithoutButton: AccordionItem[] = [
      {
        id: 'item-1',
        question: 'Question 1',
        answer: 'Answer 1',
        onButtonClick: vi.fn(),
      },
    ]

    render(<Accordion items={itemsWithoutButton} />)

    const trigger = screen.getByText('Question 1').closest('button')
    fireEvent.click(trigger!)

    expect(screen.queryByText('Click Me')).not.toBeInTheDocument()
  })

  it('should not render action button when onButtonClick is missing', () => {
    const itemsWithoutHandler: AccordionItem[] = [
      {
        id: 'item-1',
        question: 'Question 1',
        answer: 'Answer 1',
        buttonText: 'Click Me',
      },
    ]

    render(<Accordion items={itemsWithoutHandler} />)

    const trigger = screen.getByText('Question 1').closest('button')
    fireEvent.click(trigger!)

    expect(screen.queryByText('Click Me')).not.toBeInTheDocument()
  })
})
