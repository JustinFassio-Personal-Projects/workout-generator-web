import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { ReportView } from './components/ReportView';
import { Blueprint } from './components/Blueprint';
import { SquatEvaluation } from './components/SquatEvaluation';
import { SquatTest } from './components/SquatTest';
import { SquatProgram } from './components/SquatProgram';
import { SquatTutorial } from './components/SquatTutorial';
import { ViewState, WorkoutSession } from '@workout-generator/squat-logic';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [lastSession, setLastSession] = useState<WorkoutSession | null>(null);
  const [lastTestReps, setLastTestReps] = useState<number>(0);
  const [lastEvalScore, setLastEvalScore] = useState<number>(75); // Default passing score
  
  // Initialize from localStorage
  const [isSquatTestUnlocked, setIsSquatTestUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('kinetic_squat_test_unlocked') === 'true';
  });

  const [isProgramUnlocked, setIsProgramUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('kinetic_squat_program_unlocked') === 'true';
  });

  const handleEndSession = (session: WorkoutSession, destination: ViewState = ViewState.REPORT) => {
    setLastSession(session);

    // Evaluation Logic
    if (currentView === ViewState.SQUAT_EVALUATION) {
        if (session.overallScore && session.overallScore >= 75) {
            setIsSquatTestUnlocked(true);
            localStorage.setItem('kinetic_squat_test_unlocked', 'true');
            setLastEvalScore(session.overallScore);
        }
    } 
    // Test Logic
    else if (currentView === ViewState.SQUAT_TEST) {
        // Unlock Program automatically after test completion
        setIsProgramUnlocked(true);
        localStorage.setItem('kinetic_squat_program_unlocked', 'true');
        
        // Store reps for the program generator
        const totalReps = session.reps.filter(r => r.isValid).length;
        setLastTestReps(totalReps);
    } 
    
    setCurrentView(destination);
  };

  const renderView = () => {
    switch (currentView) {
      case ViewState.DASHBOARD:
        return (
            <Dashboard 
                onNavigate={setCurrentView} 
                isSquatTestUnlocked={isSquatTestUnlocked}
                isProgramUnlocked={isProgramUnlocked}
            />
        );
      case ViewState.REPORT:
        return <ReportView session={lastSession} onHome={() => setCurrentView(ViewState.DASHBOARD)} />;
      case ViewState.BLUEPRINT:
        return <Blueprint onNavigate={setCurrentView} />;
      case ViewState.SQUAT_EVALUATION:
        return <SquatEvaluation onBack={() => setCurrentView(ViewState.DASHBOARD)} onComplete={handleEndSession} />;
      case ViewState.SQUAT_TEST:
        return <SquatTest onBack={() => setCurrentView(ViewState.DASHBOARD)} onComplete={handleEndSession} />;
      case ViewState.SQUAT_PROGRAM:
        return (
            <SquatProgram 
                onBack={() => setCurrentView(ViewState.DASHBOARD)} 
                lastTestReps={lastTestReps}
                lastEvalScore={lastEvalScore}
            />
        );
      case ViewState.SQUAT_TUTORIAL:
        return <SquatTutorial onBack={() => setCurrentView(ViewState.DASHBOARD)} />;
      default:
        return <Dashboard onNavigate={setCurrentView} isSquatTestUnlocked={isSquatTestUnlocked} />;
    }
  };

  return (
    <div className="h-screen w-screen bg-black text-white overflow-hidden">
      {renderView()}
    </div>
  );
}