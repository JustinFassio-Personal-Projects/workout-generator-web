import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { TrendingUp, Shield } from 'lucide-react'
import { goalDataMap, type GoalType } from '@/data/science-chart'
import styles from './ScienceChart.module.scss'

if (typeof window !== 'undefined') {
  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
  )
}

const CHART_LABELS = [
  'Week 1',
  'Week 2',
  'Week 3',
  'Week 4',
  'Week 5',
  'Week 6',
  'Week 7',
  'Week 8',
  'Week 9',
  'Week 10',
  'Week 11',
  'Week 12',
]

export const ScienceChart: React.FC = () => {
  const [mounted, setMounted] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<GoalType>('hypertrophy')
  const chartRef = useRef<ChartJS<'line'>>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const getGradient = (
    ctx: CanvasRenderingContext2D,
    chartArea: { top: number; bottom: number },
    color: string
  ) => {
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
    gradient.addColorStop(0, color)
    gradient.addColorStop(1, 'transparent')
    return gradient
  }

  const currentGoalData = goalDataMap[selectedGoal]

  const data = useMemo(
    () => ({
      labels: CHART_LABELS,
      datasets: [
        {
          label: 'AI Optimized (Progressive Overload)',
          data: currentGoalData.aiData,
          borderColor: '#38bdf8',
          backgroundColor: (context: { chart: ChartJS<'line'> }) => {
            const chart = context.chart
            const { ctx, chartArea } = chart
            if (!chartArea) return 'rgba(56, 189, 248, 0.5)'
            return getGradient(ctx, chartArea, 'rgba(56, 189, 248, 0.5)')
          },
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#0f172a',
          pointBorderColor: '#38bdf8',
          pointBorderWidth: 2,
          pointRadius: 4,
        },
        {
          label: 'Random/Generic Plans',
          data: currentGoalData.randomData,
          borderColor: '#64748b',
          backgroundColor: (context: { chart: ChartJS<'line'> }) => {
            const chart = context.chart
            const { ctx, chartArea } = chart
            if (!chartArea) return 'rgba(148, 163, 184, 0.3)'
            return getGradient(ctx, chartArea, 'rgba(148, 163, 184, 0.3)')
          },
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.4,
          fill: true,
          pointRadius: 0,
        },
      ],
    }),
    [currentGoalData]
  )

  useEffect(() => {
    if (chartRef.current) {
      const chart = chartRef.current
      chart.data.datasets[0].data = currentGoalData.aiData
      chart.data.datasets[1].data = currentGoalData.randomData
      const yScale = chart.options.scales?.y as { title?: { text?: string } } | undefined
      if (yScale?.title) yScale.title.text = currentGoalData.yAxisLabel
      chart.update()
    }
  }, [selectedGoal, currentGoalData])

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index' as const, intersect: false },
      plugins: {
        legend: {
          labels: { color: '#cbd5e1', font: { family: 'Inter' } },
          position: 'top' as const,
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleColor: '#fff',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(56, 189, 248, 0.2)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: function (context: { dataset: { label: string }; parsed: { y: number } }) {
              const label = context.dataset.label
              const value = context.parsed.y
              const yAxisLabel = currentGoalData.yAxisLabel
              if (yAxisLabel.startsWith('%')) return `${label}: ${value}${yAxisLabel}`
              return `${label}: ${value} ${yAxisLabel}`
            },
          },
        },
      },
      scales: {
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8' },
          title: { display: true, text: currentGoalData.yAxisLabel, color: '#64748b' },
        },
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8' },
        },
      },
    }),
    [currentGoalData]
  )

  return (
    <section id="science" className={styles.scienceSection}>
      <div className={styles.container}>
        <div className={styles.textContent}>
          <h2 className={styles.heading}>Why &quot;Random&quot; Doesn&apos;t Work</h2>
          <p className={styles.description}>
            Most workout generators pull random exercises from a database.{' '}
            <strong>AI Workout Generator</strong> uses &quot;Progressive Overload&quot; algorithms.{' '}
            See the projected volume load difference over a 12-week mesocycle compared to
            unstructured training.
          </p>
        </div>

        <div className={styles.chartWrapper}>
          <div className={styles.chartContainer}>
            <div className={styles.chartHeader}>
              <h3 className={styles.chartTitle}>{currentGoalData.title}</h3>
              <span className={styles.chartBadge}>AI Optimized</span>
            </div>
            <div className={styles.goalSelectors}>
              {(['hypertrophy', 'strength', 'fatloss', 'power', 'calisthenics'] as const).map(
                goal => (
                  <button
                    key={goal}
                    onClick={() => setSelectedGoal(goal)}
                    className={`${styles.goalSelector} ${selectedGoal === goal ? styles.goalSelectorActive : ''}`}
                    data-goal={goal}
                  >
                    {goal === 'hypertrophy' && 'Hypertrophy'}
                    {goal === 'strength' && 'Max Strength'}
                    {goal === 'fatloss' && 'Fat Loss'}
                    {goal === 'power' && 'Powerbuilding'}
                    {goal === 'calisthenics' && 'Calisthenics'}
                  </button>
                )
              )}
            </div>
            <div className={styles.chartInner}>
              {mounted ? (
                <Line ref={chartRef} data={data} options={options} />
              ) : (
                <div className={styles.chartPlaceholder} aria-hidden="true">
                  Chart loads when visible.
                </div>
              )}
            </div>
            <p className={styles.chartNote}>{currentGoalData.caption}</p>
          </div>
        </div>
      </div>
      <div className={styles.featureHighlights}>
        <div className={styles.featureHighlightsContainer}>
          <div className={styles.featureCard}>
            <div className={`${styles.featureIcon} ${styles.featureIconPurple}`}>
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className={styles.featureTitle}>Smart Volume Scaling</p>
              <p className={styles.featureDescription}>
                We automatically adjust sets and reps based on your feedback to ensure continuous
                adaptation.
              </p>
            </div>
          </div>
          <div className={styles.featureCard}>
            <div className={`${styles.featureIcon} ${styles.featureIconBlue}`}>
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <p className={styles.featureTitle}>Anti-Hallucination Protocol</p>
              <p className={styles.featureDescription}>
                Every exercise pairing is verified against{' '}
                <strong>biomechanical constraints</strong> to prevent injury risks.
              </p>
              <ul className={styles.featureList}>
                <li>Real-time biomechanical validation</li>
                <li>Exercise pairing safety checks</li>
                <li>
                  Optional <strong>trainer certification review</strong> for final verification
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
