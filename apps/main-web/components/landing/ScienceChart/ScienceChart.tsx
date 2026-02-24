'use client'

import React, { useState, useRef, useEffect } from 'react'
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
import styles from './ScienceChart.module.scss'

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

type GoalType = 'hypertrophy' | 'strength' | 'fatloss' | 'power' | 'calisthenics'

interface GoalData {
  title: string
  yAxisLabel: string
  caption: string
  aiData: number[]
  randomData: number[]
}

const goalDataMap: Record<GoalType, GoalData> = {
  hypertrophy: {
    title: 'Projected Muscle Growth (Volume Load)',
    yAxisLabel: '% Baseline Volume',
    caption:
      '*AI incorporates deloads at week 8 to resensitize muscle tissue, preventing plateaus.',
    aiData: [100, 105, 115, 128, 142, 155, 165, 140, 160, 175, 185, 195],
    randomData: [100, 108, 115, 118, 120, 122, 120, 118, 115, 115, 112, 110],
  },
  strength: {
    title: 'Max Strength Gains (1 Rep Max)',
    yAxisLabel: '% Baseline 1RM',
    caption: '*AI uses Step-Loading periodization. Random plans stall due to CNS fatigue.',
    aiData: [100, 102, 105, 105, 108, 112, 112, 115, 118, 120, 120, 125],
    randomData: [100, 103, 106, 108, 108, 108, 109, 109, 108, 108, 107, 107],
  },
  fatloss: {
    title: 'Metabolic Work Capacity',
    yAxisLabel: '% Work Capacity',
    caption: '*AI increases density (less rest) over time. Random leads to early burnout.',
    aiData: [100, 110, 120, 130, 145, 160, 175, 185, 200, 215, 230, 250],
    randomData: [100, 130, 135, 120, 110, 100, 95, 90, 85, 80, 75, 70],
  },
  power: {
    title: 'Powerbuilding Composite Score',
    yAxisLabel: 'Composite Score',
    caption: '*AI balances heavy compounds with isolation volume for hybrid gains.',
    aiData: [100, 104, 108, 115, 122, 130, 138, 145, 152, 160, 168, 180],
    randomData: [100, 105, 102, 108, 103, 105, 102, 100, 98, 102, 100, 98],
  },
  calisthenics: {
    title: 'Relative Strength (Bodyweight)',
    yAxisLabel: 'Relative Strength',
    caption: '*AI progresses through leverage (e.g., knee pushup -> archer pushup).',
    aiData: [100, 110, 120, 120, 135, 150, 150, 165, 180, 180, 200, 220],
    randomData: [100, 110, 115, 118, 120, 122, 123, 124, 125, 125, 125, 125],
  },
}

export const ScienceChart: React.FC = () => {
  const [selectedGoal, setSelectedGoal] = useState<GoalType>('hypertrophy')
  const chartRef = useRef<ChartJS<'line'>>(null)

  // Create gradients for chart fills
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

  const data = {
    labels: [
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
    ],
    datasets: [
      {
        label: 'AI Optimized (Progressive Overload)',
        data: currentGoalData.aiData,
        borderColor: '#38bdf8', // Blue-400
        backgroundColor: (context: any) => {
          const chart = context.chart
          const { ctx, chartArea } = chart
          if (!chartArea) {
            return 'rgba(56, 189, 248, 0.5)'
          }
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
        borderColor: '#64748b', // Slate-500
        backgroundColor: (context: any) => {
          const chart = context.chart
          const { ctx, chartArea } = chart
          if (!chartArea) {
            return 'rgba(148, 163, 184, 0.3)'
          }
          return getGradient(ctx, chartArea, 'rgba(148, 163, 184, 0.3)')
        },
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0.4,
        fill: true,
        pointRadius: 0,
      },
    ],
  }

  // Update chart when goal changes
  useEffect(() => {
    if (chartRef.current) {
      const chart = chartRef.current
      chart.data.datasets[0].data = currentGoalData.aiData
      chart.data.datasets[1].data = currentGoalData.randomData
      chart.options.scales!.y!.title!.text = currentGoalData.yAxisLabel
      chart.update()
    }
  }, [selectedGoal]) // currentGoalData is derived from selectedGoal, so only selectedGoal is needed

  const handleGoalChange = (goal: GoalType) => {
    setSelectedGoal(goal)
  }

  const options = React.useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        legend: {
          labels: {
            color: '#cbd5e1',
            font: {
              family: 'Inter',
            },
          },
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
            label: function (context: any) {
              const label = context.dataset.label
              const value = context.parsed.y
              const yAxisLabel = currentGoalData.yAxisLabel
              // If yAxisLabel starts with '%', format as percentage; otherwise use the label as-is
              if (yAxisLabel.startsWith('%')) {
                return `${label}: ${value}${yAxisLabel}`
              } else {
                return `${label}: ${value} ${yAxisLabel}`
              }
            },
          },
        },
      },
      scales: {
        y: {
          grid: {
            color: 'rgba(255, 255, 255, 0.05)',
          },
          ticks: {
            color: '#94a3b8',
          },
          title: {
            display: true,
            text: currentGoalData.yAxisLabel,
            color: '#64748b',
          },
        },
        x: {
          grid: {
            display: false,
          },
          ticks: {
            color: '#94a3b8',
          },
        },
      },
    }),
    [currentGoalData]
  )

  return (
    <section id="science" className={styles.scienceSection}>
      <div className={styles.container}>
        {/* Text Content */}
        <div className={styles.textContent} data-aos="fade-up">
          <h2 className={styles.heading}>Why &quot;Random&quot; Doesn&apos;t Work</h2>
          <p className={styles.description}>
            Most workout generators pull random exercises from a database.{' '}
            <strong>AI Workout Generator</strong> uses &quot;Progressive Overload&quot; algorithms.{' '}
            See the projected volume load difference over a 12-week mesocycle compared to
            unstructured training.
          </p>
        </div>

        {/* Chart */}
        <div className={styles.chartWrapper} data-aos="fade-up" data-aos-delay="100">
          <div className={styles.chartContainer}>
            <div className={styles.chartHeader}>
              <h3 className={styles.chartTitle}>{currentGoalData.title}</h3>
              <span className={styles.chartBadge}>AI Optimized</span>
            </div>
            {/* Goal Selectors */}
            <div className={styles.goalSelectors}>
              <button
                onClick={() => handleGoalChange('hypertrophy')}
                className={`${styles.goalSelector} ${selectedGoal === 'hypertrophy' ? styles.goalSelectorActive : ''}`}
                data-goal="hypertrophy"
              >
                Hypertrophy
              </button>
              <button
                onClick={() => handleGoalChange('strength')}
                className={`${styles.goalSelector} ${selectedGoal === 'strength' ? styles.goalSelectorActive : ''}`}
                data-goal="strength"
              >
                Max Strength
              </button>
              <button
                onClick={() => handleGoalChange('fatloss')}
                className={`${styles.goalSelector} ${selectedGoal === 'fatloss' ? styles.goalSelectorActive : ''}`}
                data-goal="fatloss"
              >
                Fat Loss
              </button>
              <button
                onClick={() => handleGoalChange('power')}
                className={`${styles.goalSelector} ${selectedGoal === 'power' ? styles.goalSelectorActive : ''}`}
                data-goal="power"
              >
                Powerbuilding
              </button>
              <button
                onClick={() => handleGoalChange('calisthenics')}
                className={`${styles.goalSelector} ${selectedGoal === 'calisthenics' ? styles.goalSelectorActive : ''}`}
                data-goal="calisthenics"
              >
                Calisthenics
              </button>
            </div>
            <div className={styles.chartInner}>
              <Line ref={chartRef} data={data} options={options} />
            </div>
            <p className={styles.chartNote}>{currentGoalData.caption}</p>
          </div>
        </div>
      </div>
      {/* Feature Highlights Section - Matching Hero Layout */}
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
