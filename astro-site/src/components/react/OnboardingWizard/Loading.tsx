import { useEffect, useState } from 'react'
import {
  Loader2,
  Dumbbell,
  Target,
  Activity,
  Heart,
  TrendingUp,
  Zap,
  Award,
  Globe,
  Terminal,
  Cpu,
} from 'lucide-react'

interface LoadingProps {
  status: string
  step: number
  facts?: string[]
}

export default function Loading({ status, step, facts = [] }: LoadingProps) {
  const [currentFactIndex, setCurrentFactIndex] = useState(0)

  useEffect(() => {
    if (facts.length > 0) {
      const interval = setInterval(() => {
        setCurrentFactIndex(prev => (prev + 1) % facts.length)
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [facts])

  const FlyingItem = ({
    delay,
    position,
    type,
    content,
  }: {
    delay: number
    position: number
    type: 'icon' | 'text'
    content: React.ReactNode
  }) => {
    const startLeft = position % 2 === 0 ? '-20%' : '120%'
    const startTop = `${(position * 7) % 100}%`
    const textClass =
      type === 'text'
        ? 'text-emerald-500 text-[10px] md:text-xs tracking-[0.2em] bg-slate-900/80 border border-emerald-500/30 px-2 py-0.5 md:px-3 md:py-1 rounded shadow-[0_0_10px_rgba(34,197,94,0.3)] backdrop-blur-sm'
        : 'text-lime-400'

    return (
      <div
        className={`absolute flex items-center justify-center font-bold opacity-0 select-none ${textClass}`}
        style={{
          animation: `implode 2.5s infinite ease-in ${delay}s`,
          top: startTop,
          left: startLeft,
          zIndex: 10,
        }}
      >
        {type === 'icon' && typeof content !== 'string' ? (content as React.ReactElement) : content}
      </div>
    )
  }

  const iconClass = 'w-5 h-5 md:w-6 md:h-6 filter drop-shadow-[0_0_8px_rgba(132,204,22,0.5)]'

  return (
    <div className="relative flex flex-col items-center justify-center w-full max-w-4xl mx-auto min-h-[350px] md:min-h-[500px] overflow-hidden rounded-3xl bg-slate-900/40 border border-white/10 shadow-2xl backdrop-blur-md">
      <style>{`
        @keyframes implode {
          0% { transform: scale(1) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: scale(0.1) rotate(360deg); opacity: 0; top: 40%; left: 50%; }
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes spin-reverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes pulse-core {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); transform: scale(1); }
          70% { box-shadow: 0 0 0 30px rgba(34, 197, 94, 0); transform: scale(1.05); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); transform: scale(1); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>

      <div className="relative z-20 mb-10 md:mb-16 scale-[0.65] md:scale-125 mt-4 md:mt-10">
        <div className="absolute inset-0 w-64 h-64 -translate-x-[4.5rem] -translate-y-[4.5rem] border border-dashed border-emerald-500/30 rounded-full animate-[spin-slow_20s_linear_infinite]" />
        <div className="absolute inset-0 w-48 h-48 -translate-x-12 -translate-y-12 border-2 border-dashed border-lime-400/20 rounded-full animate-[spin-slow_10s_linear_infinite]" />
        <div className="absolute inset-0 w-40 h-40 -translate-x-8 -translate-y-8 border border-emerald-500/30 rounded-full animate-[spin-reverse_8s_linear_infinite]" />

        <div className="relative bg-white/10 p-1 rounded-full shadow-[0_0_60px_rgba(34,197,94,0.4)] animate-[pulse-core_2s_infinite]">
          <div className="bg-slate-900 p-4 rounded-full flex items-center justify-center w-24 h-24 relative overflow-hidden border border-emerald-500/50">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-lime-400 opacity-30" />
            <Dumbbell className="w-12 h-12 text-emerald-500 animate-pulse relative z-10" />
            <div className="absolute top-0 left-1/2 w-[1px] h-full bg-emerald-500/50 animate-[spin-slow_2s_linear_infinite]" />
            <div className="absolute top-1/2 left-0 h-[1px] w-full bg-emerald-500/50 animate-[spin-slow_2s_linear_infinite]" />
          </div>
        </div>

        <div className="absolute top-1/2 left-1/2 w-[300px] md:w-[500px] h-[300px] md:h-[500px] -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <FlyingItem
            content={<Target className={iconClass} />}
            type="icon"
            delay={0}
            position={1}
          />
          <FlyingItem content="STRENGTH" type="text" delay={0.2} position={2} />
          <FlyingItem
            content={<Activity className={iconClass} />}
            type="icon"
            delay={0.5}
            position={3}
          />
          <FlyingItem content="CARDIO" type="text" delay={0.7} position={4} />
          <FlyingItem
            content={<Heart className={iconClass} />}
            type="icon"
            delay={1.0}
            position={5}
          />
          <FlyingItem content="RECOVERY" type="text" delay={1.2} position={6} />
          <FlyingItem
            content={<TrendingUp className={iconClass} />}
            type="icon"
            delay={1.5}
            position={7}
          />
          <FlyingItem content="PROGRESS" type="text" delay={1.7} position={8} />
          <FlyingItem
            content={<Zap className={iconClass} />}
            type="icon"
            delay={2.0}
            position={9}
          />
          <FlyingItem
            content={<Award className={iconClass} />}
            type="icon"
            delay={2.2}
            position={10}
          />
        </div>
      </div>

      <div className="relative z-30 w-full max-w-lg bg-slate-900/80 backdrop-blur-xl rounded-2xl p-6 md:p-8 shadow-2xl border border-white/10 text-center flex flex-col items-center transition-all duration-500 min-h-[140px] md:min-h-[160px]">
        <div className="flex items-center gap-3 mb-4">
          {step === 1 && <Globe className="w-4 h-4 text-lime-400 animate-spin" />}
          {step === 2 && <Activity className="w-4 h-4 text-emerald-500 animate-spin" />}
          {step >= 3 && <Cpu className="w-4 h-4 text-emerald-500 animate-bounce" />}
          <h3 className="text-emerald-500 font-bold text-[10px] md:text-xs tracking-[0.2em] uppercase">
            {status}
          </h3>
        </div>

        <div className="flex-1 flex items-center justify-center px-4 w-full">
          {facts.length > 0 ? (
            <div
              key={currentFactIndex}
              className="w-full opacity-100 transition-opacity duration-700"
            >
              <div className="relative p-4 rounded-xl bg-black/60 border border-white/5 font-mono text-xs leading-relaxed text-slate-300 overflow-x-auto">
                <div className="absolute top-2 right-2 opacity-20">
                  <Terminal className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2 mb-3 text-lime-400/60 border-b border-white/5 pb-2">
                  <Activity className="w-3 h-3 animate-pulse" />
                  <span className="text-[10px] uppercase font-bold tracking-tighter">
                    Biomechanical Logic Stream
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-slate-300">{facts[currentFactIndex]}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500 italic font-light text-sm md:text-base">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Establishing connection...</span>
            </div>
          )}
        </div>

        <div className="w-full h-1 bg-slate-800 mt-6 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 via-lime-400 to-emerald-500 transition-all duration-1000 ease-out relative overflow-hidden shadow-[0_0_10px_rgba(34,197,94,0.8)]"
            style={{ width: `${step * 20 + 10}%` }}
          >
            <div className="absolute inset-0 bg-white/50 animate-[shimmer_1s_infinite]" />
          </div>
        </div>
      </div>
    </div>
  )
}
