import React, { useEffect, useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import { ArrowLeft, Share2, Download, RefreshCw, Zap, CheckCircle, AlertTriangle, BrainCircuit } from 'lucide-react';
import { Button } from './Button';
import { ViewState, WorkoutSession, AnalysisResult } from '@workout-generator/squat-logic';
import { generatePostSetAnalysis } from '../services/geminiService';

interface ReportViewProps {
  session: WorkoutSession | null;
  onHome: () => void;
}

export const ReportView: React.FC<ReportViewProps> = ({ session, onHome }) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session && !analysis) {
        setLoading(true);
        generatePostSetAnalysis(session)
            .then(result => setAnalysis(result))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }
  }, [session, analysis]);

  if (!session) return <div className="p-10 text-center">No Session Data</div>;

  // Prepare chart data
  const velocityData = session.reps.map(r => ({
      rep: r.id,
      velocity: parseFloat(r.velocity.toFixed(2)),
      valid: r.isValid
  }));

  const validReps = session.reps.filter(r => r.isValid).length;
  const score = Math.round((validReps / session.reps.length) * 100) || 0;

  // Prepare Radar Data
  const radarData = analysis ? [
    { subject: 'Eccentric', A: analysis.scores.eccentricControl, fullMark: 100 },
    { subject: 'Explosiveness', A: analysis.scores.concentricExplosiveness, fullMark: 100 },
    { subject: 'Consistency', A: analysis.scores.depthConsistency, fullMark: 100 },
    { subject: 'Stability', A: analysis.scores.stability, fullMark: 100 },
  ] : [];

  return (
    <div className="h-full bg-black text-white overflow-y-auto animate-fade-in custom-scrollbar">
      <div className="max-w-6xl mx-auto p-6 md:p-12 space-y-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <Button variant="ghost" onClick={onHome} className="mb-2 -ml-3">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
                </Button>
                <div className="flex items-center space-x-3">
                  <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-400">
                      Kinematic Audit
                  </h1>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-xs text-zinc-400 border border-zinc-700">BETA</span>
                </div>
                <p className="text-zinc-400 text-sm mt-1">Session ID: {session.id.slice(-6)} • {new Date(session.startTime).toLocaleDateString()}</p>
            </div>
            <div className="flex space-x-3">
                 <Button variant="secondary" size="sm">
                    <Download className="w-4 h-4 mr-2" /> CSV
                 </Button>
            </div>
        </div>

        {/* Top-Level Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800 backdrop-blur-sm">
                <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Pass Rate</div>
                <div className={`text-4xl font-mono font-bold ${score > 80 ? 'text-green-500' : 'text-yellow-500'}`}>
                    {score}%
                </div>
            </div>
            <div className="bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800 backdrop-blur-sm">
                <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Volume</div>
                <div className="text-4xl font-mono font-bold text-white">
                    {session.reps.length}
                </div>
            </div>
            <div className="bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800 backdrop-blur-sm">
                <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Avg Velocity</div>
                <div className="text-4xl font-mono font-bold text-blue-400">
                    {velocityData.length > 0 ? (velocityData.reduce((a,b) => a + b.velocity, 0) / velocityData.length).toFixed(2) : '0'} <span className="text-sm">m/s</span>
                </div>
            </div>
             <div className="bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800 backdrop-blur-sm">
                <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Valid Reps</div>
                <div className="text-4xl font-mono font-bold text-purple-400">
                    {validReps}
                </div>
            </div>
        </div>

        {/* Main Analysis Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Visuals */}
            <div className="lg:col-span-1 space-y-8">
                
                {/* Score Radar */}
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex flex-col items-center">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4 w-full text-left">Biomechanical Profile</h3>
                    <div className="w-full h-64 relative">
                        {loading ? (
                             <div className="absolute inset-0 flex items-center justify-center">
                                 <RefreshCw className="w-8 h-8 animate-spin text-zinc-600" />
                             </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                    <PolarGrid stroke="#3f3f46" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar name="Scores" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.4} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#18181b', border: 'none' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Velocity Chart */}
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6">
                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Velocity Loss Profile</h3>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={velocityData}>
                                <XAxis dataKey="rep" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} width={24} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <ReferenceLine y={0.3} stroke="#ef4444" strokeDasharray="3 3" />
                                <Line type="monotone" dataKey="velocity" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: '#22c55e' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* Right Column: PhD Assessment */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* Executive Summary */}
                <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-2xl border border-blue-500/20 p-6">
                     <div className="flex items-center space-x-3 mb-4">
                        <BrainCircuit className="w-6 h-6 text-blue-400" />
                        <h2 className="text-xl font-bold text-white">Executive Summary</h2>
                     </div>
                     {loading ? (
                         <div className="h-16 bg-zinc-800/50 rounded animate-pulse w-full"></div>
                     ) : (
                         <div 
                           className="text-lg text-zinc-200 leading-relaxed"
                           dangerouslySetInnerHTML={{ __html: analysis?.executiveSummary || "" }} 
                         />
                     )}
                </div>

                {/* Cues */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {loading ? (
                        [1,2,3].map(i => <div key={i} className="h-24 bg-zinc-900 rounded-xl animate-pulse"></div>)
                    ) : (
                        analysis?.prescribedCues.map((cue, idx) => (
                            <div key={idx} className="bg-zinc-900 p-4 rounded-xl border-l-4 border-yellow-500">
                                <span className="text-zinc-500 text-xs font-bold uppercase mb-1 block">Correction {idx+1}</span>
                                <p className="text-white font-medium">"{cue}"</p>
                            </div>
                        ))
                    )}
                </div>

                {/* Deep Dive HTML Content */}
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-8">
                    <div className="flex items-center space-x-3 mb-6 border-b border-zinc-800 pb-4">
                        <Zap className="w-5 h-5 text-yellow-500" />
                        <h2 className="text-lg font-bold">PhD Deep Dive Analysis</h2>
                    </div>
                    {loading ? (
                        <div className="space-y-4">
                            <div className="h-4 bg-zinc-800 rounded w-full animate-pulse"></div>
                            <div className="h-4 bg-zinc-800 rounded w-5/6 animate-pulse"></div>
                            <div className="h-4 bg-zinc-800 rounded w-4/6 animate-pulse"></div>
                        </div>
                    ) : (
                        <div 
                            className="prose prose-invert max-w-none prose-headings:text-white prose-headings:font-bold prose-p:text-zinc-300 prose-li:text-zinc-300 prose-strong:text-blue-400"
                            dangerouslySetInnerHTML={{ __html: analysis?.detailedAnalysis || "" }}
                        />
                    )}
                </div>

            </div>
        </div>

      </div>
    </div>
  );
};