/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react'
import { Terminal, ChevronDown, Cpu, Sparkles, Activity } from 'lucide-react'

interface ThinkingProcessProps {
  thinking: string
}

const ThinkingProcess: React.FC<ThinkingProcessProps> = ({ thinking }) => {
  const [isOpen, setIsOpen] = useState(false)

  if (!thinking) return null

  return (
    <div className="w-full max-w-4xl mx-auto mt-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div
        className={`group bg-slate-900/50 dark:bg-black/40 border transition-all duration-500 rounded-2xl overflow-hidden ${
          isOpen
            ? 'border-brand-lime/40 shadow-xl shadow-brand-lime/5'
            : 'border-slate-200 dark:border-white/5 hover:border-brand-lime/20'
        }`}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-6 py-4 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-1.5 rounded-lg transition-colors ${
                isOpen
                  ? 'bg-brand-lime/10 text-brand-lime'
                  : 'bg-slate-800 text-slate-400 group-hover:text-brand-lime'
              }`}
            >
              <Cpu className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span
                className={`font-display font-bold text-xs uppercase tracking-widest transition-colors ${
                  isOpen ? 'text-brand-lime' : 'text-slate-400'
                }`}
              >
                Analytical Reasoning
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                View biomechanical research chain
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {!isOpen && (
              <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded bg-brand-lime/5 border border-brand-lime/10">
                <Sparkles className="w-3 h-3 text-brand-lime" />
                <span className="text-[9px] font-bold text-brand-lime uppercase">
                  Deep Think Active
                </span>
              </div>
            )}
            <ChevronDown
              className={`w-5 h-5 transition-transform duration-500 ${
                isOpen ? 'rotate-180 text-brand-lime' : 'text-slate-500'
              }`}
            />
          </div>
        </button>

        <div
          className={`transition-all duration-700 ease-in-out overflow-hidden ${
            isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="px-6 pb-6 pt-2 border-t border-white/5 bg-slate-950/40">
            <div className="relative mt-4 p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-xs leading-relaxed text-slate-300 overflow-x-auto">
              <div className="absolute top-2 right-2 opacity-20">
                <Terminal className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2 mb-3 text-brand-lime/60 border-b border-white/5 pb-2">
                <Activity className="w-3 h-3 animate-pulse" />
                <span className="text-[10px] uppercase font-bold tracking-tighter">
                  Biomechanical Logic Stream
                </span>
              </div>
              <p className="whitespace-pre-wrap">{thinking}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ThinkingProcess
