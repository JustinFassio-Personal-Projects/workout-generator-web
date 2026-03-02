'use client'

import React, { useState, useEffect } from 'react'
import { FaChartLine } from 'react-icons/fa6'

export const GainsSimulator: React.FC = () => {
  const [mode, setMode] = useState<'random' | 'structured'>('random')

  useEffect(() => {
    // Animate chart paths when mode changes
    const structuredPath = document.getElementById('path-structured')
    const randomPath = document.getElementById('path-random')

    if (mode === 'structured') {
      if (structuredPath) {
        structuredPath.style.opacity = '1'
        structuredPath.style.strokeDashoffset = '0'
      }
      if (randomPath) {
        randomPath.style.opacity = '0.2'
      }
    } else {
      if (structuredPath) {
        structuredPath.style.opacity = '0'
        structuredPath.style.strokeDashoffset = '500'
      }
      if (randomPath) {
        randomPath.style.opacity = '1'
      }
    }
  }, [mode])

  return (
    <div className="my-12 bg-[#0f172a] rounded-2xl shadow-lg border border-white/10 overflow-hidden">
      <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center flex-wrap gap-4">
        <h3 className="font-bold text-white m-0 text-lg flex items-center gap-2">
          <FaChartLine className="text-[#84cc16]" aria-hidden="true" /> The Gains Simulator
        </h3>
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => setMode('random')}
            className={`px-3 py-1 rounded transition-colors ${
              mode === 'random'
                ? 'bg-[#0a0e1a] text-white shadow border border-white/10'
                : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            Random Chaos
          </button>
          <button
            onClick={() => setMode('structured')}
            className={`px-3 py-1 rounded transition-colors ${
              mode === 'structured'
                ? 'bg-[#84cc16] text-[#0a0e1a] shadow font-semibold'
                : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            Structured Plan
          </button>
        </div>
      </div>

      <div className="p-6 relative h-64 w-full bg-[#0a0e1a]" id="chart-container">
        {/* SVG Chart */}
        <svg viewBox="0 0 400 200" className="w-full h-full">
          {/* Grid Lines */}
          <line x1="0" y1="180" x2="400" y2="180" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />
          <line x1="0" y1="20" x2="0" y2="180" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />

          {/* Axis Labels */}
          <text x="380" y="195" fontSize="10" fill="rgba(255,255,255,0.6)">
            Time (6 Months)
          </text>
          <text x="10" y="15" fontSize="10" fill="rgba(255,255,255,0.6)">
            Strength/Muscle
          </text>

          {/* Dynamic Path: Structured (Hidden by default) */}
          <path
            id="path-structured"
            d="M0,180 C50,170 100,160 150,140 C200,120 250,100 300,60 C350,40 380,30 400,20"
            fill="none"
            stroke="#84cc16"
            strokeWidth="4"
            strokeDasharray="500"
            strokeDashoffset="500"
            className="transition-all duration-1000 opacity-0"
          />

          {/* Dynamic Path: Random (Visible by default) */}
          <path
            id="path-random"
            d="M0,180 L40,170 L60,175 L100,160 L140,165 L180,150 L220,160 L260,155 L300,150 L350,145 L400,150"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="3"
            strokeDasharray="500"
            strokeDashoffset="0"
            className="transition-all duration-1000 opacity-30"
          />
        </svg>

        {/* Overlay Text */}
        <div
          id="chart-overlay"
          className="absolute top-4 right-4 bg-[#0f172a]/90 backdrop-blur p-3 rounded-lg border border-white/10 shadow-sm max-w-[200px] text-sm"
        >
          {mode === 'random' ? (
            <>
              <span className="font-bold block text-white mb-1">Status: Chaos</span>
              <p className="text-xs text-slate-300 leading-tight">
                Changing exercises constantly prevents neural adaptation. You get tired, but you
                don't get stronger.
              </p>
            </>
          ) : (
            <>
              <span className="font-bold block text-[#84cc16] mb-1">Status: Growth Mode</span>
              <p className="text-xs text-slate-300 leading-tight">
                By repeating lifts and increasing load (Progressive Overload), you create a linear
                adaptation response.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
