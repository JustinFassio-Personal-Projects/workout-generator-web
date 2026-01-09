/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef } from 'react'
import {
  GeneratedImage,
  ComplexityLevel,
  VisualStyle,
  Language,
  SearchResultItem,
  ExerciseDetail,
} from './types'
import {
  researchTopicForPrompt,
  generateInfographicImage,
  editInfographicImage,
} from './services/geminiService'
import Infographic from './components/Infographic'
import Loading from './components/Loading'
import IntroScreen from './components/IntroScreen'
import SearchResults from './components/SearchResults'
import ExerciseFAQ from './components/ExerciseFAQ'
import ThinkingProcess from './components/ThinkingProcess'
import {
  Search,
  AlertCircle,
  History,
  GraduationCap,
  Palette,
  Microscope,
  Atom,
  Compass,
  Globe,
  Sun,
  Moon,
  Key,
  CreditCard,
  ExternalLink,
  DollarSign,
  Dumbbell,
  Activity,
} from 'lucide-react'

const App: React.FC = () => {
  const [showIntro, setShowIntro] = useState(true)
  const [topic, setTopic] = useState('')
  const [complexityLevel, setComplexityLevel] = useState<ComplexityLevel>('New to Exercise')
  const [visualStyle, setVisualStyle] = useState<VisualStyle>('Realistic')
  const [language, setLanguage] = useState<Language>('English')

  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [loadingStep, setLoadingStep] = useState<number>(0)
  const [loadingFacts, setLoadingFacts] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const [imageHistory, setImageHistory] = useState<GeneratedImage[]>([])
  const [currentSearchResults, setCurrentSearchResults] = useState<SearchResultItem[]>([])
  const [isDarkMode, setIsDarkMode] = useState(true)
  const [refinementCount, setRefinementCount] = useState(0)

  const [hasApiKey, setHasApiKey] = useState(false)
  const [checkingKey, setCheckingKey] = useState(true)

  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  useEffect(() => {
    const checkKey = async () => {
      try {
        if (window.aistudio && window.aistudio.hasSelectedApiKey) {
          const hasKey = await window.aistudio.hasSelectedApiKey()
          setHasApiKey(hasKey)
        } else {
          setHasApiKey(true)
        }
      } catch (e) {
        console.error('Error checking API key:', e)
      } finally {
        setCheckingKey(false)
      }
    }
    checkKey()
  }, [])

  // Auto-scroll when loading starts or image is generated
  useEffect(() => {
    if (isLoading || imageHistory.length > 0) {
      const timer = setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isLoading, imageHistory.length])

  const handleSelectKey = async () => {
    if (window.aistudio && window.aistudio.openSelectKey) {
      try {
        await window.aistudio.openSelectKey()
        setHasApiKey(true)
        setError(null)
      } catch (e) {
        console.error('Failed to open key selector:', e)
      }
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return

    if (!topic.trim()) {
      setError('Please enter a kinetic movement to visualize.')
      return
    }

    setIsLoading(true)
    setError(null)
    setLoadingStep(1)
    setLoadingFacts([])
    setCurrentSearchResults([])
    setLoadingMessage(`Analyzing Biomechanics...`)

    try {
      const researchResult = await researchTopicForPrompt(
        topic,
        complexityLevel,
        visualStyle,
        language
      )

      setLoadingFacts(researchResult.details.map(d => `${d.header}: ${d.content}`))
      setCurrentSearchResults(researchResult.searchResults)

      setLoadingStep(2)
      setLoadingMessage(`Mapping Kinetic Chains...`)

      let base64Data = await generateInfographicImage(researchResult.imagePrompt)

      const newImage: GeneratedImage = {
        id: Date.now().toString(),
        data: base64Data,
        prompt: topic,
        timestamp: Date.now(),
        level: complexityLevel,
        style: visualStyle,
        language: language,
        details: researchResult.details,
        thinking: researchResult.thinking,
      }

      setRefinementCount(0)
      setImageHistory([newImage, ...imageHistory])
    } catch (err: any) {
      console.error(err)
      if (
        err.message &&
        (err.message.includes('Requested entity was not found') ||
          err.message.includes('404') ||
          err.message.includes('403'))
      ) {
        setError(
          'Access denied. A paid API key with billing enabled is required for these kinetic models.'
        )
        setHasApiKey(false)
      } else {
        setError('The biomechanical analysis engine is currently busy. Please try again.')
      }
    } finally {
      setIsLoading(false)
      setLoadingStep(0)
    }
  }

  const handleEdit = async (editPrompt: string) => {
    if (imageHistory.length === 0 || refinementCount >= 3) return
    const currentImage = imageHistory[0]
    setIsLoading(true)
    setError(null)
    setLoadingStep(2)
    setLoadingMessage(`Optimizing Technique: "${editPrompt}"...`)

    try {
      const base64Data = await editInfographicImage(currentImage.data, editPrompt)
      const newImage: GeneratedImage = {
        id: Date.now().toString(),
        data: base64Data,
        prompt: editPrompt,
        timestamp: Date.now(),
        level: currentImage.level,
        style: currentImage.style,
        language: currentImage.language,
        details: currentImage.details,
        thinking: currentImage.thinking,
      }
      setRefinementCount(prev => prev + 1)
      setImageHistory([newImage, ...imageHistory])
    } catch (err: any) {
      console.error(err)
      setError('Modification failed. Adjust your kinetic parameters.')
    } finally {
      setIsLoading(false)
      setLoadingStep(0)
    }
  }

  const KeySelectionModal = () => (
    <div className="fixed inset-0 z-[200] bg-brand-dark/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-brand-dark border-2 border-brand-lime/50 rounded-2xl shadow-2xl max-w-md w-full p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-green to-brand-lime"></div>
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="relative">
            <div className="w-20 h-20 bg-brand-green/10 dark:bg-brand-green/30 rounded-full flex items-center justify-center text-brand-green dark:text-brand-green mb-2 border-4 border-white dark:border-brand-dark shadow-lg">
              <Activity className="w-8 h-8" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-brand-lime text-brand-dark text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm border-2 border-white dark:border-brand-dark uppercase tracking-wide">
              Precision
            </div>
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-white">
              Advanced Research Key
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed font-medium">
              Fitcopilot requires a paid API key to access high-fidelity kinetic research models.
            </p>
          </div>
          <button
            onClick={handleSelectKey}
            className="w-full py-3.5 bg-gradient-to-r from-brand-green to-brand-lime text-brand-dark rounded-xl font-bold shadow-lg shadow-brand-green/20 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <Key className="w-4 h-4" />
            <span>Select Research Key</span>
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {!checkingKey && !hasApiKey && <KeySelectionModal />}

      {showIntro ? (
        <IntroScreen onComplete={() => setShowIntro(false)} />
      ) : (
        <div className="min-h-screen bg-slate-50 dark:bg-brand-dark text-slate-900 dark:text-slate-200 font-sans selection:bg-brand-green selection:text-white pb-20 relative overflow-x-hidden animate-in fade-in duration-1000 transition-colors">
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-green/10 via-slate-50 to-white dark:from-brand-green/5 dark:via-brand-dark dark:to-black z-0 transition-colors"></div>

          <header className="border-b border-slate-200 dark:border-white/10 sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-brand-dark/60 transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between">
              <div className="flex items-center gap-3 md:gap-4 group">
                <div className="relative scale-90 md:scale-100">
                  <div className="absolute inset-0 bg-brand-green blur-lg opacity-20 dark:opacity-40 group-hover:opacity-60 transition-opacity"></div>
                  <div className="bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-white/10 relative z-10 shadow-sm dark:shadow-none">
                    <Activity className="w-6 h-6 text-brand-green dark:text-brand-lime" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="font-display font-bold text-lg md:text-2xl tracking-tight text-slate-900 dark:text-white leading-none">
                    Fitcopilot{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-green to-brand-lime">
                      Vision
                    </span>
                  </span>
                  <span className="text-[8px] md:text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 font-medium">
                    Visual Exercise Engine
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-brand-green transition-colors border border-slate-200 dark:border-white/10 shadow-sm"
                >
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </header>

          <main className="px-3 sm:px-6 py-4 md:py-8 relative z-10">
            <div
              className={`max-w-6xl mx-auto transition-all duration-500 ${imageHistory.length > 0 ? 'mb-4 md:mb-8' : 'min-h-[50vh] md:min-h-[70vh] flex flex-col justify-center'}`}
            >
              {!imageHistory.length && (
                <div className="text-center mb-6 md:mb-16 space-y-3 md:space-y-8 animate-in slide-in-from-bottom-8 duration-700 fade-in">
                  <div className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-brand-green dark:text-brand-lime text-[10px] md:text-xs font-bold tracking-widest uppercase shadow-sm backdrop-blur-sm">
                    <Dumbbell className="w-3 h-3 md:w-4 md:h-4" /> Professional Kinetic Analysis
                    Engine
                  </div>
                  <h1 className="text-3xl sm:text-5xl md:text-8xl font-display font-bold text-slate-900 dark:text-white tracking-tight leading-[0.95] md:leading-[0.9]">
                    Master the Science of <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-green via-brand-lime to-emerald-400">
                      Human Motion.
                    </span>
                  </h1>
                  <p className="text-sm md:text-2xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto font-light leading-relaxed px-4">
                    Instantly visualize complex kinetic movements, biomechanics, and technical cues.
                    From foundational lifts to elite-level performance.
                  </p>
                </div>
              )}

              <form
                onSubmit={handleGenerate}
                className={`relative z-20 transition-all duration-300 ${isLoading ? 'opacity-50 pointer-events-none scale-95 blur-sm' : 'scale-100'}`}
              >
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-brand-green via-brand-lime to-emerald-500 rounded-3xl opacity-10 dark:opacity-20 group-hover:opacity-30 dark:group-hover:opacity-40 transition duration-500 blur-xl"></div>
                  <div className="relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-2 rounded-3xl shadow-2xl">
                    <div className="relative flex flex-col">
                      <div className="relative flex items-center">
                        <Search className="absolute left-4 md:left-6 w-5 h-5 md:w-6 md:h-6 text-slate-400 group-focus-within:text-brand-green transition-colors" />
                        <input
                          type="text"
                          value={topic}
                          onChange={e => setTopic(e.target.value)}
                          placeholder="Describe a movement or technique..."
                          className="w-full pl-12 md:pl-16 pr-4 md:pr-6 py-3 md:py-6 bg-transparent border-none outline-none text-base md:text-2xl placeholder:text-slate-400 font-medium text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="flex items-center gap-2 px-12 md:px-16 pb-2 -mt-1 md:-mt-2 overflow-x-auto no-scrollbar">
                        <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0">
                          Analysis Presets:
                        </span>
                        <button
                          type="button"
                          onClick={() => setTopic('Barbell Clean and Jerk Biomechanics')}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] md:text-xs font-bold border border-slate-200 dark:border-white/5 hover:border-brand-green/50 transition-all shrink-0"
                        >
                          <Activity className="w-3 h-3 text-brand-green" /> Clean & Jerk
                        </button>
                        <button
                          type="button"
                          onClick={() => setTopic('Strict Muscle-Up Transition Phase')}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] md:text-xs font-bold border border-slate-200 dark:border-white/5 hover:border-brand-green/50 transition-all shrink-0"
                        >
                          <Activity className="w-3 h-3 text-brand-green" /> Muscle-Up
                        </button>
                        <button
                          type="button"
                          onClick={() => setTopic('Overhead Squat Stability Cues')}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] md:text-xs font-bold border border-slate-200 dark:border-white/5 hover:border-brand-green/50 transition-all shrink-0"
                        >
                          <Activity className="w-3 h-3 text-brand-green" /> OH Squat
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-2 p-2 mt-2">
                      <div className="flex-1 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-white/5 px-4 py-3 flex items-center gap-3 hover:border-brand-green/30 transition-colors relative overflow-hidden group/item">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-brand-green shrink-0 shadow-sm">
                          <GraduationCap className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col z-10 w-full overflow-hidden">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Expertise Level
                          </label>
                          <select
                            value={complexityLevel}
                            onChange={e => setComplexityLevel(e.target.value as ComplexityLevel)}
                            className="bg-transparent border-none text-base font-bold text-slate-900 dark:text-slate-100 focus:ring-0 cursor-pointer p-0 w-full hover:text-brand-green transition-colors truncate pr-4"
                          >
                            <option value="New to Exercise">Foundation</option>
                            <option value="Some Experience">Intermediate</option>
                            <option value="Advanced Athlete">Performance</option>
                            <option value="Elite Athlete">Mastery/Pro</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex-1 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-white/5 px-4 py-3 flex items-center gap-3 hover:border-brand-lime/30 transition-colors relative overflow-hidden group/item">
                        <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-brand-lime shrink-0 shadow-sm">
                          <Palette className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col z-10 w-full overflow-hidden">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Visual Framework
                          </label>
                          <select
                            value={visualStyle}
                            onChange={e => setVisualStyle(e.target.value as VisualStyle)}
                            className="bg-transparent border-none text-base font-bold text-slate-900 dark:text-slate-100 focus:ring-0 cursor-pointer p-0 w-full hover:text-brand-lime transition-colors truncate pr-4"
                          >
                            <option value="Default">Anatomical Study</option>
                            <option value="Realistic">Hyper-Realistic</option>
                            <option value="Futuristic">Biometric Overlay</option>
                            <option value="Sketch">Kinetic Notebook</option>
                            <option value="3D Render">Isometric Model</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full md:w-auto bg-gradient-to-r from-brand-green to-brand-lime text-brand-dark px-8 py-4 rounded-2xl font-bold font-display tracking-wide hover:brightness-110 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Activity className="w-5 h-5" />
                        <span>VISUALIZE KINETICS</span>
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* This div acts as the scroll target */}
            <div ref={resultsRef} className="scroll-mt-20">
              {isLoading && (
                <Loading status={loadingMessage} step={loadingStep} facts={loadingFacts} />
              )}

              {error && (
                <div className="max-w-2xl mx-auto mt-8 p-6 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-2xl flex items-center gap-4 text-red-800 dark:text-red-200 animate-in fade-in slide-in-from-bottom-4">
                  <AlertCircle className="w-6 h-6 flex-shrink-0 text-red-500 dark:text-red-400" />
                  <p className="font-medium">{error}</p>
                </div>
              )}

              {imageHistory.length > 0 && !isLoading && (
                <>
                  <Infographic
                    image={imageHistory[0]}
                    onEdit={handleEdit}
                    isEditing={isLoading}
                    refinementCount={refinementCount}
                  />
                  <ThinkingProcess thinking={imageHistory[0].thinking || ''} />
                  <ExerciseFAQ details={imageHistory[0].details || []} />
                  <SearchResults results={currentSearchResults} />
                </>
              )}
            </div>
          </main>
        </div>
      )}
    </>
  )
}

export default App
