import React from 'react';
import { ArrowLeft, CheckCircle2, Layers, Crosshair, Activity } from 'lucide-react';
import { Button } from './Button';
import { ViewState, ROADMAP_STEPS, CRITICAL_LANDMARKS } from '@workout-generator/squat-logic';

interface BlueprintProps {
  onNavigate: (view: ViewState) => void;
}

export const Blueprint: React.FC<BlueprintProps> = ({ onNavigate }) => {
  return (
    <div className="h-full overflow-y-auto bg-black p-6 md:p-12 animate-fade-in">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button variant="ghost" onClick={() => onNavigate(ViewState.DASHBOARD)}>
            <ArrowLeft className="w-5 h-5 mr-2" /> Back
          </Button>
          <h1 className="text-3xl font-bold">Technical Architecture</h1>
        </div>

        {/* Section 1: The Three Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-center space-x-3 mb-4 text-blue-400">
                    <Crosshair size={24} />
                    <h3 className="text-xl font-semibold">Path Tracking</h3>
                </div>
                <p className="text-zinc-400">Tracking the verticality of the load (Bar Path) to minimize moment arms and sheer force.</p>
            </div>
            <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-center space-x-3 mb-4 text-green-400">
                    <Activity size={24} />
                    <h3 className="text-xl font-semibold">Angular Velocity</h3>
                </div>
                <p className="text-zinc-400">Detecting "sticking points" via joint speed analysis to identify compensation patterns.</p>
            </div>
            <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
                <div className="flex items-center space-x-3 mb-4 text-purple-400">
                    <Layers size={24} />
                    <h3 className="text-xl font-semibold">Segment Alignment</h3>
                </div>
                <p className="text-zinc-400">Ensuring joint centration to prevent common energy leaks like knee valgus.</p>
            </div>
        </div>

        {/* Section 2: Roadmap */}
        <div>
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <Layers className="w-6 h-6 mr-3 text-blue-500" />
            5-Step Development Roadmap
          </h2>
          <div className="space-y-4">
            {ROADMAP_STEPS.map((step, index) => (
              <div key={index} className="flex items-start space-x-4 p-4 rounded-lg bg-zinc-900/50 border border-zinc-800/50">
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-500/20 text-blue-400 font-bold">
                  {index + 1}
                </div>
                <div>
                  <h4 className="text-lg font-medium text-white mb-1">{step.title}</h4>
                  <p className="text-zinc-400 text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Landmarks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
                <h3 className="text-xl font-bold mb-4 text-white">Squat Landmarks</h3>
                <ul className="space-y-3">
                    {CRITICAL_LANDMARKS.SQUAT.map((lm, i) => (
                        <li key={i} className="flex items-start space-x-3 text-zinc-400 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-blue-500 mt-1 shrink-0" />
                            <span>{lm}</span>
                        </li>
                    ))}
                </ul>
            </div>
             <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
                <h3 className="text-xl font-bold mb-4 text-white">Bench Press Landmarks</h3>
                <ul className="space-y-3">
                    {CRITICAL_LANDMARKS.BENCH.map((lm, i) => (
                        <li key={i} className="flex items-start space-x-3 text-zinc-400 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-purple-500 mt-1 shrink-0" />
                            <span>{lm}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>

      </div>
    </div>
  );
};