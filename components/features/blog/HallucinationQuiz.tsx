'use client'

import React, { useState } from 'react'
import { FaTriangleExclamation, FaCircleCheck, FaSkull, FaArrowRight } from 'react-icons/fa6'

interface Question {
  prompt: string
  text: string
  isFake: boolean
  feedbackTitle: string
  feedbackText: string
}

const questions: Question[] = [
  {
    prompt: 'Prompt: "Give me an advanced leg exercise"',
    text: '"Perform a single-leg squat while standing on a stability ball to activate the deep stabilizers."',
    isFake: true,
    feedbackTitle: 'Dangerous Hallucination!',
    feedbackText:
      'Stability balls are for core work, not heavy loading. Standing on one is a circus trick with high injury risk, not a legitimate hypertrophy tool.',
  },
  {
    prompt: 'Prompt: "How do I build chest strength?"',
    text: '"Superset Heavy Bench Press (5 reps) with Plyometric Pushups to failure."',
    isFake: false,
    feedbackTitle: 'Real Science (Post-Activation Potentiation)',
    feedbackText:
      'This is a legitimate advanced technique called Contrast Training. The heavy lift excites the nervous system, making the explosive movement more powerful.',
  },
  {
    prompt: 'Prompt: "I have shoulder pain. What should I do?"',
    text: '"Do high-rep Upright Rows to strengthen the rotator cuff through the pain."',
    isFake: true,
    feedbackTitle: 'Major Hallucination!',
    feedbackText:
      "Upright Rows can cause shoulder impingement. Doing them 'through pain' is the exact opposite of medical guidelines. An AI suggestion like this could cause permanent damage.",
  },
]

export const HallucinationQuiz: React.FC = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [showFeedback, setShowFeedback] = useState(false)
  const [userAnswer, setUserAnswer] = useState<'real' | 'fake' | null>(null)

  const question = questions[currentQuestion]
  const isCorrect =
    userAnswer !== null &&
    ((userAnswer === 'fake' && question.isFake) || (userAnswer === 'real' && !question.isFake))

  const checkAnswer = (answer: 'real' | 'fake') => {
    setUserAnswer(answer)
    setShowFeedback(true)
  }

  const nextQuestion = () => {
    setCurrentQuestion(prev => (prev + 1) % questions.length)
    setShowFeedback(false)
    setUserAnswer(null)
  }

  return (
    <div className="my-12 bg-[#0f172a] rounded-2xl shadow-lg border border-white/10 overflow-hidden">
      <div className="p-4 bg-[#0a0e1a] text-white flex justify-between items-center flex-wrap gap-4">
        <h3 className="font-bold m-0 text-lg flex items-center gap-2">
          <FaTriangleExclamation className="text-yellow-400" aria-hidden="true" /> Can You Spot the
          Fake?
        </h3>
        <span className="text-xs bg-white/10 px-2 py-1 rounded">Round {currentQuestion + 1}/3</span>
      </div>

      <div className="p-8 text-center min-h-[300px] flex flex-col justify-center items-center relative">
        {/* Question Text */}
        {!showFeedback && (
          <div id="quiz-question" className="mb-8">
            <p className="text-sm uppercase tracking-widest text-[#849288] font-bold mb-2">
              {question.prompt}
            </p>
            <h4 className="text-2xl font-bold text-white">{question.text}</h4>
          </div>
        )}

        {/* Feedback Area */}
        {showFeedback && (
          <div
            id="quiz-feedback"
            className="absolute inset-0 bg-[#0f172a]/95 z-10 flex flex-col justify-center items-center p-6 backdrop-blur-sm"
          >
            {isCorrect ? (
              <FaCircleCheck className="text-[#10b981] text-5xl mb-4" aria-hidden="true" />
            ) : (
              <FaSkull className="text-[#ef4444] text-5xl mb-4" aria-hidden="true" />
            )}
            <h4
              className={`text-2xl font-bold mb-2 ${
                isCorrect ? 'text-[#10b981]' : 'text-[#ef4444]'
              }`}
            >
              {isCorrect ? 'Correct!' : 'Wrong!'}
            </h4>
            <p className="text-slate-300 mb-6 max-w-md">
              <span className="font-semibold">{question.feedbackTitle}</span>{' '}
              {question.feedbackText}
            </p>
            <button
              onClick={nextQuestion}
              className="bg-[#0a0e1a] text-white px-6 py-2 rounded-full hover:bg-[#1a1e2a] transition-colors flex items-center gap-2 border border-white/10"
            >
              Next Round <FaArrowRight className="text-sm" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Buttons */}
        {!showFeedback && (
          <div className="flex gap-4 w-full max-w-md">
            <button
              onClick={() => checkAnswer('real')}
              className="flex-1 py-4 px-6 rounded-xl border-2 border-[#10b981]/20 hover:bg-[#10b981]/10 hover:border-[#10b981] text-white font-bold transition-all group"
            >
              <FaCircleCheck className="text-[#10b981] mb-1 block text-xl mx-auto group-hover:scale-110 transition-transform" />
              Real Science
            </button>
            <button
              onClick={() => checkAnswer('fake')}
              className="flex-1 py-4 px-6 rounded-xl border-2 border-[#ef4444]/20 hover:bg-[#ef4444]/10 hover:border-[#ef4444] text-white font-bold transition-all group"
            >
              <FaSkull className="text-[#ef4444] mb-1 block text-xl mx-auto group-hover:scale-110 transition-transform" />
              Hallucination
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
