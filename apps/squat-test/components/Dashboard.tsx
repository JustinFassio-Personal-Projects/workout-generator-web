import React from 'react';
import { Activity, Cpu, ChevronRight, ScanLine, Timer, Lock, ClipboardCheck, CheckCircle2, Play, ArrowRight } from 'lucide-react';
import { ViewState } from '@workout-generator/squat-logic';

interface DashboardProps {
  onNavigate: (view: ViewState) => void;
  isSquatTestUnlocked?: boolean;
  isProgramUnlocked?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  onNavigate, 
  isSquatTestUnlocked = false,
  isProgramUnlocked = false 
}) => {
  
  // Determine the current active step based on unlock status
  const currentStep = isProgramUnlocked ? 3 : (isSquatTestUnlocked ? 2 : 1);

  return (
    <div className="flex flex-col items-center justify-start h-full p-6 text-center space-y-8 animate-fade-in overflow-y-auto custom-scrollbar">
      
      {/* App Header */}
      <div className="space-y-4 max-w-2xl mt-8">
        <div className="flex items-center justify-center space-x-3 mb-2">
          <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
            KineticAI
          </h1>
        </div>
        <p className="text-lg text-zinc-400 leading-relaxed max-w-lg mx-auto">
          Biomechanical analysis engine. <br/>
          Follow the protocol below to audit your mechanics.
        </p>
      </div>

      <div className="flex flex-col w-full max-w-5xl space-y-6 pb-10">
        
        {/* --- HERO SECTION: ACTIVE STEP --- */}
        <div className="w-full text-left">
            <h2 className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-4 ml-1">Current Objective</h2>
            
            {/* STEP 1 HERO: EVALUATION */}
            {currentStep === 1 && (
                <div 
                    onClick={() => onNavigate(ViewState.SQUAT_EVALUATION)}
                    className="group relative w-full p-8 md:p-10 rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 hover:border-green-500/50 transition-all cursor-pointer overflow-hidden shadow-2xl"
                >
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-500/10 via-transparent to-transparent opacity-50" />
                    <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="space-y-4 max-w-2xl">
                             <div className="flex items-center space-x-3">
                                 <div className="p-3 bg-green-500/20 text-green-400 rounded-xl">
                                     <ScanLine size={32} />
                                 </div>
                                 <span className="text-green-500 font-bold uppercase tracking-wider text-sm">Step 1</span>
                             </div>
                             <h3 className="text-3xl md:text-4xl font-bold text-white">The Biomechanical Audit</h3>
                             <p className="text-zinc-400 text-lg leading-relaxed">
                                 Establish your baseline. Our AI analyzes your squat depth, hip stability, and valgus collapse in real-time to ensure you are mechanically sound before adding load.
                             </p>
                        </div>
                        <div className="flex-shrink-0 mt-4 md:mt-0 flex flex-col space-y-3">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onNavigate(ViewState.SQUAT_EVALUATION); }}
                                className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-zinc-200 transition flex items-center justify-center"
                            >
                                Start Audit <Play className="ml-2 w-5 h-5 fill-current" />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onNavigate(ViewState.SQUAT_TUTORIAL); }}
                                className="px-8 py-2 bg-transparent text-zinc-400 font-medium text-sm rounded-full hover:text-white transition flex items-center justify-center border border-zinc-700 hover:border-zinc-500"
                            >
                                Check My Form
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 2 HERO: TEST */}
            {currentStep === 2 && (
                <div 
                    onClick={() => onNavigate(ViewState.SQUAT_TEST)}
                    className="group relative w-full p-8 md:p-10 rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 hover:border-yellow-500/50 transition-all cursor-pointer overflow-hidden shadow-2xl"
                >
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-500/10 via-transparent to-transparent opacity-50" />
                    <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="space-y-4 max-w-2xl">
                             <div className="flex items-center space-x-3">
                                 <div className="p-3 bg-yellow-500/20 text-yellow-400 rounded-xl">
                                     <Timer size={32} />
                                 </div>
                                 <span className="text-yellow-500 font-bold uppercase tracking-wider text-sm">Step 2</span>
                             </div>
                             <h3 className="text-3xl md:text-4xl font-bold text-white">The Capacity Test</h3>
                             <p className="text-zinc-400 text-lg leading-relaxed">
                                 30 seconds. Max effort. This high-intensity test measures your anaerobic endurance and velocity maintenance under fatigue. 
                                 <span className="block mt-2 text-yellow-500/80 text-sm font-bold uppercase">Pre-requisite: Audit Passed</span>
                             </p>
                        </div>
                        <div className="flex-shrink-0 mt-4 md:mt-0">
                             <button className="px-8 py-4 bg-yellow-500 text-black font-bold rounded-full hover:bg-yellow-400 transition flex items-center shadow-lg shadow-yellow-500/20">
                                Begin Test <Play className="ml-2 w-5 h-5 fill-current" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 3 HERO: PROGRAM */}
            {currentStep === 3 && (
                <div 
                    onClick={() => onNavigate(ViewState.SQUAT_PROGRAM)}
                    className="group relative w-full p-8 md:p-10 rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 hover:border-purple-500/50 transition-all cursor-pointer overflow-hidden shadow-2xl"
                >
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent opacity-50" />
                    <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="space-y-4 max-w-2xl">
                             <div className="flex items-center space-x-3">
                                 <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl">
                                     <ClipboardCheck size={32} />
                                 </div>
                                 <span className="text-purple-500 font-bold uppercase tracking-wider text-sm">Step 3</span>
                             </div>
                             <h3 className="text-3xl md:text-4xl font-bold text-white">Corrective Programming</h3>
                             <p className="text-zinc-400 text-lg leading-relaxed">
                                 Generate a hyper-personalized workout protocol based on your unique biomechanical flaws and capacity score.
                                 <span className="block mt-2 text-purple-400/80 text-sm font-bold uppercase">Ready for Analysis</span>
                             </p>
                        </div>
                        <div className="flex-shrink-0 mt-4 md:mt-0">
                             <button className="px-8 py-4 bg-purple-600 text-white font-bold rounded-full hover:bg-purple-500 transition flex items-center shadow-lg shadow-purple-500/20">
                                Generate Plan <ChevronRight className="ml-2 w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* --- SECONDARY GRID: COMPLETED OR LOCKED STEPS --- */}
        <div className="w-full">
            <h2 className="text-left text-xs font-bold text-zinc-600 uppercase tracking-widest mb-4 ml-1">Protocol Timeline</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* CARD 1: AUDIT */}
                <div 
                  onClick={() => onNavigate(ViewState.SQUAT_EVALUATION)}
                  className={`relative p-5 rounded-xl border flex flex-col justify-between h-32 transition-all ${
                      currentStep > 1 
                      ? 'bg-zinc-900/40 border-green-900/30 hover:bg-zinc-900 hover:border-green-500/50 cursor-pointer' 
                      : currentStep === 1 ? 'hidden md:flex bg-zinc-800/20 border-zinc-800 opacity-50' : ''
                  }`}
                >
                  {/* If this is the active hero, we hide it in the grid on mobile, or keep it dimmed on desktop as a placeholder if desired, 
                      but for this layout, let's only show it if it's NOT the current step to avoid redundancy, 
                      UNLESS we want to show history. Let's show "Completed" state. */}
                  {currentStep > 1 && (
                      <>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <span className="text-green-500 font-bold text-sm">Completed</span>
                            </div>
                            <ScanLine className="w-5 h-5 text-zinc-600" />
                        </div>
                        <div className="text-left">
                            <div className="text-white font-semibold">Step 1: Audit</div>
                            <div className="text-zinc-500 text-xs mt-1">Retake Evaluation</div>
                        </div>
                      </>
                  )}
                  {currentStep === 1 && (
                      <div className="flex items-center justify-center h-full text-zinc-600 text-sm font-medium">
                          Active Above
                      </div>
                  )}
                </div>

                {/* CARD 2: TEST */}
                <div 
                  onClick={() => isSquatTestUnlocked ? onNavigate(ViewState.SQUAT_TEST) : null}
                  className={`relative p-5 rounded-xl border flex flex-col justify-between h-32 transition-all ${
                      currentStep > 2
                      ? 'bg-zinc-900/40 border-yellow-900/30 hover:bg-zinc-900 hover:border-yellow-500/50 cursor-pointer'
                      : !isSquatTestUnlocked ? 'bg-zinc-950 border-zinc-900 opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                   {currentStep > 2 && (
                      <>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <CheckCircle2 className="w-5 h-5 text-yellow-500" />
                                <span className="text-yellow-500 font-bold text-sm">Completed</span>
                            </div>
                            <Timer className="w-5 h-5 text-zinc-600" />
                        </div>
                        <div className="text-left">
                            <div className="text-white font-semibold">Step 2: Capacity</div>
                            <div className="text-zinc-500 text-xs mt-1">Retake Test</div>
                        </div>
                      </>
                   )}
                   {!isSquatTestUnlocked && (
                       <>
                        <div className="flex items-center justify-between">
                             <Lock className="w-5 h-5 text-zinc-700" />
                             <Timer className="w-5 h-5 text-zinc-800" />
                        </div>
                        <div className="text-left">
                            <div className="text-zinc-500 font-semibold">Step 2: Capacity</div>
                            <div className="text-zinc-700 text-xs mt-1">Locked</div>
                        </div>
                       </>
                   )}
                   {currentStep === 2 && (
                       <div className="flex items-center justify-center h-full text-zinc-600 text-sm font-medium">
                           Active Above
                       </div>
                   )}
                </div>

                {/* CARD 3: PROGRAM */}
                <div 
                  onClick={() => isProgramUnlocked ? onNavigate(ViewState.SQUAT_PROGRAM) : null}
                   className={`relative p-5 rounded-xl border flex flex-col justify-between h-32 transition-all ${
                      currentStep === 3 
                      ? 'hidden md:flex bg-zinc-800/20 border-zinc-800 opacity-50' 
                      : !isProgramUnlocked ? 'bg-zinc-950 border-zinc-900 opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                    {/* Since Step 3 is the final step, if it's active, it's in Hero. If not active, it's locked. */}
                     {!isProgramUnlocked && (
                       <>
                        <div className="flex items-center justify-between">
                             <Lock className="w-5 h-5 text-zinc-700" />
                             <ClipboardCheck className="w-5 h-5 text-zinc-800" />
                        </div>
                        <div className="text-left">
                            <div className="text-zinc-500 font-semibold">Step 3: Program</div>
                            <div className="text-zinc-700 text-xs mt-1">Locked</div>
                        </div>
                       </>
                   )}
                   {currentStep === 3 && (
                       <div className="flex items-center justify-center h-full text-zinc-600 text-sm font-medium">
                           Active Above
                       </div>
                   )}
                </div>

            </div>
        </div>

        {/* --- BLUEPRINT SECTION --- */}
        <div className="w-full pt-4">
          <div 
            onClick={() => onNavigate(ViewState.BLUEPRINT)}
            className="group relative p-8 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-blue-500/30 hover:bg-zinc-900/80 transition-all cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center justify-between">
                <div className="flex items-center space-x-6">
                    <div className="p-4 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform hidden md:block">
                        <Cpu size={24} />
                    </div>
                    <div className="text-left">
                        <h3 className="text-xl font-bold text-white">Technical Blueprint</h3>
                        <p className="text-zinc-400 mt-1 max-w-md">Review the 5-step roadmap, pose landmark architecture, and biomechanical pillars.</p>
                    </div>
                </div>
                <div className="flex items-center text-blue-400 font-medium whitespace-nowrap">
                    View Specs <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
            </div>
          </div>
        </div>

      </div>
      
      <div className="flex items-center space-x-2 text-sm text-zinc-600 pb-4">
        <span>Powered by</span>
        <span className="font-semibold text-zinc-500">Google Gemini</span>
        <span>&</span>
        <span className="font-semibold text-zinc-500">MediaPipe</span>
      </div>
    </div>
  );
};