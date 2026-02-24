import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Dumbbell, ExternalLink, Loader2, ShieldCheck, User } from 'lucide-react';
import { Button } from './Button';
import { generateWorkoutPlan } from '../services/geminiService';
import { ViewState } from '@workout-generator/squat-logic';

interface SquatProgramProps {
  onBack: () => void;
  lastTestReps: number;
  lastEvalScore: number;
}

export const SquatProgram: React.FC<SquatProgramProps> = ({ onBack, lastTestReps, lastEvalScore }) => {
  const [step, setStep] = useState<'INTAKE' | 'LOADING' | 'RESULT'>('INTAKE');
  const [name, setName] = useState('');
  const [waiverSigned, setWaiverSigned] = useState(false);
  const [workoutHtml, setWorkoutHtml] = useState('');

  const handleGenerate = async () => {
    if (!name || !waiverSigned) return;
    
    setStep('LOADING');
    const html = await generateWorkoutPlan(name, lastTestReps, lastEvalScore);
    setWorkoutHtml(html);
    setStep('RESULT');
  };

  return (
    <div className="h-full bg-black text-white overflow-y-auto animate-fade-in custom-scrollbar">
      <div className="max-w-2xl mx-auto p-6 md:p-12 min-h-full flex flex-col">
        
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="w-5 h-5 mr-2" /> Dashboard
          </Button>
        </div>

        {/* --- STEP 1: INTAKE FORM --- */}
        {step === 'INTAKE' && (
            <div className="flex-1 flex flex-col justify-center space-y-8">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        Protocol Design
                    </h1>
                    <p className="text-zinc-400 text-lg">
                        We have analyzed your biomechanics (Score: {lastEvalScore.toFixed(0)}) and anaerobic capacity ({lastTestReps} reps). 
                        Complete the intake to generate your corrective program.
                    </p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center">
                            <User className="w-4 h-4 mr-2" /> Athlete Name
                        </label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your first name"
                            className="w-full bg-zinc-800 border border-zinc-700 text-white px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                        />
                    </div>

                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-start space-x-3">
                        <input 
                            type="checkbox" 
                            id="waiver"
                            checked={waiverSigned}
                            onChange={(e) => setWaiverSigned(e.target.checked)}
                            className="mt-1 w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="waiver" className="text-sm text-zinc-300 leading-relaxed cursor-pointer select-none">
                            <span className="font-bold text-white block mb-1">Liability Release</span>
                            I acknowledge that physical exercise involves risk of injury. I voluntarily assume all risks and waive any claims against KineticAI for injuries arising from this generated program. I certify I am physically fit to participate.
                        </label>
                    </div>

                    <Button 
                        onClick={handleGenerate} 
                        disabled={!name || !waiverSigned}
                        size="lg" 
                        className="w-full"
                    >
                        Generate Corrective Protocol
                    </Button>
                </div>
            </div>
        )}

        {/* --- STEP 2: LOADING --- */}
        {step === 'LOADING' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-zinc-800"></div>
                    <div className="absolute inset-0 w-24 h-24 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                    <Loader2 className="absolute inset-0 m-auto text-blue-500 w-8 h-8 animate-pulse" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white">Synthesizing Data</h2>
                    <p className="text-zinc-400">Comparing your hip hinge mechanics against 10,000 elite athlete samples...</p>
                </div>
            </div>
        )}

        {/* --- STEP 3: RESULT --- */}
        {step === 'RESULT' && (
            <div className="space-y-8 pb-10">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
                    {/* Render HTML Content from Gemini */}
                    <div 
                        className="prose prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: workoutHtml }}
                    />
                </div>

                {/* Upsell / External Link */}
                <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 border border-zinc-700 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-white flex items-center">
                            <Dumbbell className="w-5 h-5 mr-2 text-yellow-500" />
                            Level Up Your Training
                        </h3>
                        <p className="text-zinc-400 text-sm max-w-md">
                            This bodyweight plan is just the beginning. Unlock full equipment options, progress tracking, and AI-driven periodization.
                        </p>
                    </div>
                    <a 
                        href="https://www.aiworkoutgenerator.com/onboarding" 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex-shrink-0"
                    >
                        <Button className="bg-yellow-600 hover:bg-yellow-700 text-white border-none whitespace-nowrap">
                            Create Full Account <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                    </a>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};