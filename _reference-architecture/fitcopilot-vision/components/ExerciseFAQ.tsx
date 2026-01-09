/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react'
import { ExerciseDetail } from '../types'
import { ChevronDown, Info, Dumbbell, ShieldAlert, Zap, Target } from 'lucide-react'

interface ExerciseFAQProps {
  details: ExerciseDetail[]
}

const ExerciseFAQ: React.FC<ExerciseFAQProps> = ({ details }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  if (!details || details.length === 0) return null

  const getIcon = (header: string) => {
    const h = header.toLowerCase()
    if (h.includes('muscles') || h.includes('target')) return <Target className="w-4 h-4" />
    if (h.includes('form') || h.includes('technique')) return <Dumbbell className="w-4 h-4" />
    if (h.includes('mistake') || h.includes('safety') || h.includes('avoid'))
      return <ShieldAlert className="w-4 h-4" />
    if (h.includes('benefit') || h.includes('why')) return <Zap className="w-4 h-4" />
    return <Info className="w-4 h-4" />
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-white dark:bg-brand-dark rounded-lg border border-slate-200 dark:border-white/10 text-brand-green shadow-sm">
          <Info className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">
          Exercise Intelligence
        </h3>
      </div>

      <div className="space-y-3">
        {details.map((detail, index) => (
          <div
            key={index}
            className={`group bg-white dark:bg-brand-dark/40 border transition-all duration-300 rounded-2xl overflow-hidden ${
              openIndex === index
                ? 'border-brand-green/50 shadow-lg shadow-brand-green/5 ring-1 ring-brand-green/20'
                : 'border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20'
            }`}
          >
            <button
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              className="w-full px-6 py-4 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-1.5 rounded-lg transition-colors ${
                    openIndex === index
                      ? 'bg-brand-green/10 text-brand-green'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                  }`}
                >
                  {getIcon(detail.header)}
                </div>
                <span
                  className={`font-display font-bold text-sm md:text-base transition-colors ${
                    openIndex === index
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {detail.header}
                </span>
              </div>
              <ChevronDown
                className={`w-5 h-5 transition-transform duration-300 ${
                  openIndex === index ? 'rotate-180 text-brand-green' : 'text-slate-400'
                }`}
              />
            </button>

            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="px-6 pb-6 pt-0 ml-11">
                <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base leading-relaxed">
                  {detail.content}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ExerciseFAQ
