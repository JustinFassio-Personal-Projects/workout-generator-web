'use client'

import React, { useRef, useState, useEffect } from 'react'
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
import styles from './ReportV2ProgressChart.module.scss'

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

export const ReportV2ProgressChart: React.FC = () => {
  const chartRef = useRef<ChartJS<'line'>>(null)
  const [visibleDatasets, setVisibleDatasets] = useState({
    random: true,
    system: true,
  })

  const toggleDataset = (dataset: 'random' | 'system') => {
    setVisibleDatasets(prev => ({
      ...prev,
      [dataset]: !prev[dataset],
    }))
  }

  const data = {
    labels: ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6'],
    datasets: [
      {
        label: 'Random "AI" Generator',
        data: [100, 105, 102, 108, 106, 107],
        borderColor: '#a8a29e', // Stone-400
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 3,
        borderDash: [5, 5],
        hidden: !visibleDatasets.random,
      },
      {
        label: 'True System (Progressive Overload)',
        data: [100, 108, 115, 124, 132, 145],
        borderColor: '#ea580c', // Orange-600
        backgroundColor: 'rgba(234, 88, 12, 0.1)',
        borderWidth: 3,
        tension: 0.1,
        fill: true,
        pointRadius: 4,
        hidden: !visibleDatasets.system,
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
        backgroundColor: '#1c1917', // Stone-900
        titleColor: '#f5f5f4', // Stone-100
        bodyColor: '#f5f5f4', // Stone-100
        borderColor: '#e7e5e4', // Stone-200
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
          color: '#e7e5e4', // Stone-200
        },
        ticks: {
          color: '#1c1917', // Stone-900
        },
        title: {
          display: true,
          text: 'Strength Index',
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

  // Update chart when visibility changes
  useEffect(() => {
    if (chartRef.current) {
      const chart = chartRef.current
      chart.data.datasets[0].hidden = !visibleDatasets.random
      chart.data.datasets[1].hidden = !visibleDatasets.system
      chart.update()
    }
  }, [visibleDatasets])

  return (
    <div className={styles.card}>
      <div className={styles.chartContainer}>
        <Line ref={chartRef} data={data} options={options} />
      </div>
      <div className={styles.legend}>
        <div
          className={`${styles.legendItem} ${visibleDatasets.random ? styles.legendItemActive : styles.legendItemInactive}`}
          onClick={() => toggleDataset('random')}
          style={{ cursor: 'pointer' }}
        >
          <span className={styles.legendDotRandom}></span>
          <span className={styles.legendText}>Random Generation (High Fatigue, Low Gain)</span>
        </div>
        <div
          className={`${styles.legendItem} ${visibleDatasets.system ? styles.legendItemActive : styles.legendItemInactive}`}
          onClick={() => toggleDataset('system')}
          style={{ cursor: 'pointer' }}
        >
          <span className={styles.legendDotSystem}></span>
          <span className={styles.legendTextBold}>Algorithmic System (Optimized)</span>
        </div>
      </div>
      <div className={styles.insight}>
        <strong>Key Insight:</strong> Random workouts (common in LLM wrappers) create "junk volume."
        They tire you out but fail to systematically increase intensity, leading to the dreaded
        plateau shown in the grey line.
      </div>
    </div>
  )
}
