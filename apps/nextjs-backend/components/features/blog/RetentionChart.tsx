'use client'

import React, { useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import styles from './BlogPostContentInteractive.module.scss'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export const RetentionChart: React.FC = () => {
  const chartRef = useRef<ChartJS<'bar'>>(null)

  const data = {
    labels: ['Random/Generic', 'System/Adaptive'],
    datasets: [
      {
        label: 'User Retention (%)',
        data: [18, 65],
        backgroundColor: ['#9ca3af', '#ffa500'], // Gray for random, Orange for system
        borderRadius: 4,
        barThickness: 40,
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
        callbacks: {
          label: function (context: any) {
            return context.raw + '% of users still active after 6 months'
          },
        },
        backgroundColor: 'var(--bg-dark-secondary)',
        titleColor: 'var(--text-primary)',
        bodyColor: 'var(--text-secondary)',
        borderColor: 'var(--glass-border-base)',
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          display: true,
          color: 'rgba(255, 255, 255, 0.1)', // Subtle white grid lines
          borderDash: [2, 2],
        },
        ticks: {
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
      <h3
        style={{
          fontSize: 'var(--font-size-sm)',
          fontWeight: 'var(--font-weight-bold)',
          color: '#ffffff', // White text
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 'var(--spacing-lg)',
          textAlign: 'center',
        }}
      >
        User Retention: 6 Month View
      </h3>
      <div className={styles.chartContainer}>
        <Bar ref={chartRef} data={data} options={options} />
      </div>
    </div>
  )
}
