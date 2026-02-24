import React, { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { FilesetResolver, PoseLandmarker, PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import { ArrowLeft, RefreshCw, Zap, LayoutDashboard, Flame } from 'lucide-react';
import { InstructionModal } from './InstructionModal';
import { Button } from './Button';
import { ViewState, RepData, WorkoutSession, POSE_LANDMARKS } from '@workout-generator/squat-logic';

interface SquatTestProps {
  onBack: () => void;
  onComplete: (session: WorkoutSession, destination?: ViewState) => void;
}

type TestPhase = 'IDLE' | 'COUNTDOWN' | 'ACTIVE' | 'COMPLETE';

export const SquatTest: React.FC<SquatTestProps> = ({ onBack, onComplete }) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  // Logic Variables
  const [phase, setPhase] = useState<TestPhase>('IDLE');
  const [countdown, setCountdown] = useState(5);
  const [timeLeft, setTimeLeft] = useState(30);
  const [reps, setReps] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>("Face Camera");
  
  const [repsData, setRepsData] = useState<RepData[]>([]);

  // Refs for logic loop
  const squatStageRef = useRef<'up' | 'down' | null>(null);
  const hitDepthRef = useRef<boolean>(false);
  const requestRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);
  const repStartTimeRef = useRef<number>(0);

  // Audio Helper
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
       window.speechSynthesis.cancel(); // Stop previous speech
       const u = new SpeechSynthesisUtterance(text);
       u.rate = 1.4; // Faster speech for high intensity
       window.speechSynthesis.speak(u);
    }
  };

  useEffect(() => {
    const initPoseLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
        });
        setPoseLandmarker(landmarker);
        setIsReady(true);
      } catch (error) {
        console.error("Failed to load MediaPipe:", error);
      }
    };
    initPoseLandmarker();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Timer: Setup Countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (phase === 'COUNTDOWN' && countdown > 0) {
        interval = setInterval(() => {
            setCountdown(prev => prev - 1);
            if(countdown <= 3) speak(countdown.toString());
        }, 1000);
    } else if (phase === 'COUNTDOWN' && countdown === 0) {
        setPhase('ACTIVE');
        speak("GO GO GO!");
    }
    return () => clearInterval(interval);
  }, [phase, countdown]);

  // Timer: Active Test
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (phase === 'ACTIVE' && timeLeft > 0) {
        interval = setInterval(() => {
            setTimeLeft(prev => prev - 1);
            if (timeLeft === 15) speak("Half way!");
            if (timeLeft <= 5) speak((timeLeft - 1).toString());
        }, 1000);
    } else if (phase === 'ACTIVE' && timeLeft === 0) {
        speak("Time!");
        setPhase('COMPLETE');
    }
    return () => clearInterval(interval);
  }, [phase, timeLeft]);

  const handleStart = () => {
      setCountdown(5);
      setTimeLeft(30);
      setReps(0);
      setRepsData([]);
      setPhase('COUNTDOWN');
      speak("Get ready. 30 seconds max effort.");
  };

  const recordRep = (isValid: boolean, depthVal: number) => {
      const duration = (Date.now() - repStartTimeRef.current) / 1000;
      const newRep: RepData = {
          id: repsData.length + 1,
          timestamp: Date.now(),
          duration: duration,
          depth: depthVal,
          rom: 0, 
          velocity: duration > 0 ? 1 / duration : 0,
          isValid: isValid,
          notes: ['Test Mode']
      };
      setRepsData(prev => [...prev, newRep]);
      repStartTimeRef.current = Date.now();
  };

  const analyzePose = useCallback((result: PoseLandmarkerResult) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!result.landmarks || result.landmarks.length === 0) return;
    const landmarks = result.landmarks[0];

    // Using Front View Logic for Speed
    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

    if (!leftHip || !rightHip || !leftKnee || !rightKnee) return;

    // Pulse Animation
    const time = Date.now() / 1000;
    const pulse = (Math.sin(time * 12) + 1) / 2; // Faster for test mode
    const radius = 5 + pulse * 3;

    // Averages
    const hipY = (leftHip.y + rightHip.y) / 2;
    const kneeY = (leftKnee.y + rightKnee.y) / 2;
    const ankleY = (leftAnkle.y + rightAnkle.y) / 2;

    // Visuals
    // Draw Depth Line
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.setLineDash([5, 5]);
    ctx.moveTo(0, kneeY * canvas.height);
    ctx.lineTo(canvas.width, kneeY * canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Hip Line
    ctx.strokeStyle = hitDepthRef.current ? "#eab308" : "#3b82f6"; // Yellow for test mode success
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(leftHip.x * canvas.width, leftHip.y * canvas.height);
    ctx.lineTo(rightHip.x * canvas.width, rightHip.y * canvas.height);
    ctx.stroke();

    // Draw Points
    const drawPoint = (pt: any, color: string) => {
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.arc(pt.x * canvas.width, pt.y * canvas.height, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
    
    [leftHip, rightHip, leftKnee, rightKnee].forEach(pt => drawPoint(pt, hitDepthRef.current ? "#eab308" : "#3b82f6"));

    // Logic: Ratio for descent detection
    const thighProj = kneeY - hipY; 
    const shankProj = ankleY - kneeY;
    const rawRatio = shankProj > 0.01 ? thighProj / shankProj : 0;
    
    // Valid Depth Check (Hip lower than knee)
    // Robust Logic: Hip Crease below Knee OR Hip Center close to Ankle (for high camera angles)
    const legLength = Math.abs(hipY - ankleY);
    const currentHipHeight = Math.abs(hipY - ankleY);
    
    if ((hipY >= (kneeY - 0.02)) || (currentHipHeight < legLength * 0.45)) {
        hitDepthRef.current = true;
    }

    if (phase === 'ACTIVE') {
        // Descent
        if (rawRatio < 0.6 && squatStageRef.current !== 'down') {
            squatStageRef.current = 'down';
            repStartTimeRef.current = Date.now();
            setFeedback("DOWN");
        }

        // Ascent
        if (rawRatio > 0.85 && squatStageRef.current === 'down') {
            squatStageRef.current = 'up';
            
            const isValid = hitDepthRef.current;
            recordRep(isValid, rawRatio);

            if (isValid) {
                setReps(prev => prev + 1);
                setFeedback("GOOD");
            } else {
                setFeedback("NO REP");
            }
            hitDepthRef.current = false;
        }
    }

  }, [phase, recordRep]);

  const renderLoop = useCallback(() => {
    if (
      webcamRef.current &&
      webcamRef.current.video &&
      webcamRef.current.video.readyState === 4 &&
      poseLandmarker
    ) {
      const video = webcamRef.current.video;
      const videoTime = video.currentTime;

      if (videoTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = videoTime;
        if (canvasRef.current) {
            canvasRef.current.width = video.videoWidth;
            canvasRef.current.height = video.videoHeight;
        }
        const result = poseLandmarker.detectForVideo(video, performance.now());
        analyzePose(result);
      }
    }
    requestRef.current = requestAnimationFrame(renderLoop);
  }, [poseLandmarker, analyzePose]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [renderLoop]);

  const handleFinish = (destination: ViewState = ViewState.REPORT) => {
      const session: WorkoutSession = {
          id: Date.now().toString(),
          type: 'SQUAT',
          startTime: repsData[0]?.timestamp || Date.now(),
          endTime: Date.now(),
          reps: repsData,
          overallScore: (repsData.filter(r => r.isValid).length / repsData.length) * 100
      };
      onComplete(session, destination);
  };

  return (
    <div className="relative h-full flex flex-col bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-5 h-5 mr-2" /> Cancel
        </Button>
        <div className="bg-zinc-900/80 backdrop-blur px-3 py-1 rounded-full border border-zinc-700 flex items-center space-x-2">
           <Zap className="w-4 h-4 text-yellow-500 fill-current" />
           <span className="text-xs font-mono text-yellow-400 font-bold">MODE: MAX EFFORT TEST</span>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="relative flex-1 bg-zinc-900 flex items-center justify-center overflow-hidden">
        {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center z-30 bg-zinc-900">
                <RefreshCw className="animate-spin text-zinc-500 w-8 h-8" />
                <span className="ml-3 text-zinc-400">Loading Vision Model...</span>
            </div>
        )}
        <Webcam
          ref={webcamRef}
          className="absolute inset-0 w-full h-full object-cover"
          mirrored={false}
          videoConstraints={{ facingMode: "user", width: 1280, height: 720 }}
        />
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover z-10"
        />

        {/* HUD - TIMER & REPS */}
        {(phase === 'ACTIVE' || phase === 'COUNTDOWN') && (
            <div className="absolute top-24 left-1/2 transform -translate-x-1/2 flex flex-col items-center z-20">
                <div className={`text-6xl font-black font-mono tracking-tighter drop-shadow-2xl ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                    {phase === 'COUNTDOWN' ? countdown : `00:${timeLeft.toString().padStart(2, '0')}`}
                </div>
                {phase === 'ACTIVE' && (
                    <div className="mt-4 bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-yellow-500/30 flex items-center space-x-3">
                        <span className="text-zinc-400 text-sm font-bold uppercase">Score</span>
                        <span className="text-3xl font-bold text-yellow-400">{reps}</span>
                    </div>
                )}
            </div>
        )}

        {/* FEEDBACK OVERLAY */}
        {phase === 'ACTIVE' && feedback && (
            <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-20">
                <div className="text-4xl font-black text-white italic uppercase tracking-widest drop-shadow-lg stroke-black">
                    {feedback}
                </div>
            </div>
        )}

        {/* IDLE SCREEN */}
        {phase === 'IDLE' && isReady && (
          <InstructionModal
            icon={<Flame className="w-10 h-10 text-yellow-500" />}
            iconClassName="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto border border-yellow-500/50"
            variant="yellow"
            title="30 Second Max Effort"
            items={[
              'Perform as many valid squats as possible in 30 seconds',
              'Maintain hip crease below knee for the rep to count',
            ]}
            startLabel="Start Test"
            onStart={handleStart}
          />
        )}

        {/* COMPLETE SCREEN */}
        {phase === 'COMPLETE' && (
             <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                 <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-700 max-w-sm w-full relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 via-red-500 to-yellow-500"></div>
                     
                     <h2 className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-4">Anaerobic Capacity Result</h2>
                     <div className="text-8xl font-black text-white mb-2">{reps}</div>
                     <div className="text-xl font-medium text-yellow-500 mb-8">Reps Completed</div>

                     <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-zinc-800 p-3 rounded-lg">
                            <div className="text-xs text-zinc-500">Avg Speed</div>
                            <div className="font-mono text-white">{(reps / 30).toFixed(2)} r/s</div>
                        </div>
                        <div className="bg-zinc-800 p-3 rounded-lg">
                             <div className="text-xs text-zinc-500">Accuracy</div>
                             <div className="font-mono text-white">
                                {repsData.length > 0 ? Math.round((reps / repsData.length) * 100) : 0}%
                             </div>
                        </div>
                     </div>

                     <div className="space-y-3">
                        <Button onClick={() => handleFinish(ViewState.REPORT)} size="lg" className="w-full bg-white text-black hover:bg-zinc-200">
                             Analyze Performance
                        </Button>
                        <Button onClick={() => handleFinish(ViewState.DASHBOARD)} variant="ghost" size="md" className="w-full text-zinc-400 hover:text-white">
                            <LayoutDashboard className="w-4 h-4 mr-2" /> Return to Dashboard
                        </Button>
                     </div>
                 </div>
             </div>
        )}
      </div>
    </div>
  );
};