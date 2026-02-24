'use client'

import React, { useEffect, useRef } from 'react'
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
import styles from './BlogPostContentInteractive.module.scss'

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

export const ProgressChart: React.FC = () => {
  const chartRef = useRef<ChartJS<'line'>>(null)

  const data = {
    labels: ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6'],
    datasets: [
      {
        label: 'Random "AI" Generator',
        data: [100, 105, 102, 108, 106, 107],
        borderColor: 'var(--color-gray-400)',
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        borderDash: [5, 5],
      },
      {
        label: 'True System (Progressive Overload)',
        data: [100, 108, 115, 124, 132, 145],
        borderColor: '#ffa500', // Orange
        backgroundColor: 'rgba(255, 191, 0, 0.2)', // Light orange fill
        borderWidth: 3,
        tension: 0.1,
        fill: true,
        pointRadius: 5,
        pointBackgroundColor: '#ffa500', // Orange points
        pointBorderColor: '#ffffff', // White border on points
        pointBorderWidth: 2,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'var(--bg-dark-secondary)',
        titleColor: 'var(--text-primary)',
        bodyColor: 'var(--text-secondary)',
        borderColor: 'var(--glass-border-base)',
        borderWidth: 1,
        callbacks: {
          label: function (context: any) {
            return context.dataset.label + ': ' + context.raw + '% Strength Base'
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)', // Subtle white grid lines
        },
        ticks: {
          color: '#ffffff', // White text
        },
        title: {
          display: true,
          text: 'Strength Index',
          color: '#ffffff', // White text
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#ffffff', // White text
        },
      },
    },
  }

  return (
    <div className={styles.card}>
      <div className={styles.chartContainer}>
        <Line ref={chartRef} data={data} options={options} />
      </div>
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendDotRandom}`}></span>
          <span style={{ color: '#ffffff' }}>Random Generation (High Fatigue, Low Gain)</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.legendDotSystem}`}></span>
          <span style={{ color: '#ffffff', fontWeight: 'var(--font-weight-bold)' }}>
            Algorithmic System (Optimized)
          </span>
        </div>
      </div>
      <div className={styles.insight}>
        <strong className={styles.insightStrong}>Key Insight:</strong> Random workouts (common in
        LLM wrappers) create "junk volume." They tire you out but fail to systematically increase
        intensity, leading to the dreaded plateau shown in the grey line.
      </div>
    </div>
  )
}
