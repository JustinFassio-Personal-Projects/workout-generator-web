import { Play } from 'lucide-react'

interface IntroScreenProps {
  onComplete: () => void
}

export function IntroScreen({ onComplete }: IntroScreenProps) {
  return (
    <div className="relative w-full max-w-[600px] mx-auto rounded-2xl border border-white/10 bg-[var(--bg-dark)] overflow-hidden flex flex-col items-center justify-start pt-8 pb-12 px-6">
      <div className="absolute inset-0 bg-gradient-radial from-[rgba(34,197,94,0.2)] via-[var(--bg-dark)] to-black pointer-events-none" />
      <div className="relative z-10 text-center">
        <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 tracking-tight">
          AI PERSONAL <br />
          <span className="bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-accent)] bg-clip-text text-transparent">
            TRAINER
          </span>
        </h1>
        <p className="text-slate-400 text-sm md:text-lg max-w-[500px] mx-auto mb-8 leading-relaxed">
          Experience the Live Coach Engine that adapts your sets, reps, and weights in real-time
          based on your fatigue.
        </p>
        <button
          type="button"
          onClick={onComplete}
          className="relative inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full overflow-hidden border border-[rgba(34,197,94,0.5)] bg-transparent hover:bg-[rgba(34,197,94,0.2)] transition-all group"
        >
          <span className="relative z-10 text-[var(--color-primary-500)] group-hover:text-[var(--bg-dark)] font-bold text-sm uppercase tracking-wider transition-colors">
            Generate Workout
          </span>
          <Play className="w-4 h-4 relative z-10 text-[var(--color-primary-500)] group-hover:text-[var(--bg-dark)] transition-colors" />
          <span className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary-500)] to-[var(--color-accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      </div>
      <button
        type="button"
        onClick={onComplete}
        className="absolute top-6 right-6 text-xs text-slate-500 hover:text-white uppercase tracking-wider border border-transparent hover:border-white/10 rounded-full px-4 py-2 transition-all"
      >
        Free Workout
      </button>
    </div>
  )
}
