import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GainsSimulator } from '@/components/features/blog/GainsSimulator'

describe('GainsSimulator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('should render gains simulator component', () => {
    render(<GainsSimulator />)

    expect(screen.getByText(/The Gains Simulator/i)).toBeInTheDocument()
  })

  it('should render mode toggle buttons', () => {
    render(<GainsSimulator />)

    expect(screen.getByRole('button', { name: /Random Chaos/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Structured Plan/i })).toBeInTheDocument()
  })

  it('should default to random mode', () => {
    render(<GainsSimulator />)

    const randomButton = screen.getByRole('button', { name: /Random Chaos/i })
    expect(randomButton).toHaveClass('bg-[#0a0e1a]')
  })

  it('should switch to structured mode when button is clicked', async () => {
    const user = userEvent.setup()
    render(<GainsSimulator />)

    const structuredButton = screen.getByRole('button', { name: /Structured Plan/i })
    await user.click(structuredButton)

    expect(structuredButton).toHaveClass('bg-[#84cc16]')
  })

  it('should display random mode status text', () => {
    render(<GainsSimulator />)

    expect(screen.getByText(/Status: Chaos/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Changing exercises constantly prevents neural adaptation/i)
    ).toBeInTheDocument()
  })

  it('should display structured mode status text when switched', async () => {
    const user = userEvent.setup()
    render(<GainsSimulator />)

    const structuredButton = screen.getByRole('button', { name: /Structured Plan/i })
    await user.click(structuredButton)

    // Wait for state update
    await screen.findByText(/Status: Growth Mode/i)
    expect(screen.getByText(/By repeating lifts and increasing load/i)).toBeInTheDocument()
  })

  it('should render SVG chart', () => {
    render(<GainsSimulator />)

    // The chart container has id="chart-container"
    const chartContainer = document.getElementById('chart-container')
    expect(chartContainer).toBeInTheDocument()

    // Find SVG within chart container
    const svg = chartContainer?.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('viewBox', '0 0 400 200')
  })

  it('should render chart paths', () => {
    render(<GainsSimulator />)

    const structuredPath = document.getElementById('path-structured')
    const randomPath = document.getElementById('path-random')

    expect(structuredPath).toBeInTheDocument()
    expect(randomPath).toBeInTheDocument()
  })
})
