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
import styles from './ReportV2RetentionChart.module.scss'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export const ReportV2RetentionChart: React.FC = () => {
  const chartRef = useRef<ChartJS<'bar'>>(null)

  const data = {
    labels: ['Random/Generic', 'System/Adaptive'],
    datasets: [
      {
        label: 'User Retention (%)',
        data: [18, 65],
        backgroundColor: ['#d6d3d1', '#0f766e'], // Stone-300, Teal-700
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
        backgroundColor: '#1c1917', // Stone-900
        titleColor: '#f5f5f4', // Stone-100
        bodyColor: '#f5f5f4', // Stone-100
        borderColor: '#e7e5e4', // Stone-200
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          display: true,
          color: '#e7e5e4', // Stone-200
          borderDash: [2, 2],
        },
        ticks: {
          color: '#1c1917', // Stone-900
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#1c1917', // Stone-900
        },
      },
    },
  }

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>User Retention: 6 Month View</h3>
      <div className={styles.chartContainer}>
        <Bar ref={chartRef} data={data} options={options} />
      </div>
    </div>
  )
}
