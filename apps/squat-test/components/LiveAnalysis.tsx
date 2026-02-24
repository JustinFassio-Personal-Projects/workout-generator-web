import React, { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { FilesetResolver, PoseLandmarker, PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import { ArrowLeft, Play, Square, Video, AlertCircle, Volume2, Info, CheckCircle2 } from 'lucide-react';
import { Button } from './Button';
import { ViewState, WorkoutSession, RepData, LiftPhase, POSE_LANDMARKS, APP_NAME, calculateDistance } from '@workout-generator/squat-logic';

interface LiveAnalysisProps {
  onEndSession: (session: WorkoutSession) => void;
  onBack: () => void;
}

export const LiveAnalysis: React.FC<LiveAnalysisProps> = ({ onEndSession, onBack }) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(null);
  const [isAnalyzerReady, setIsAnalyzerReady] = useState(false);
  const [isIntroOpen, setIsIntroOpen] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [reps, setReps] = useState<RepData[]>([]);
  const [currentPhase, setCurrentPhase] = useState<LiftPhase>(LiftPhase.SETUP);
  const [feedback, setFeedback] = useState<string>("Align Left Side");

  const startTimeRef = useRef<number>(0);
  const requestRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);
  const sessionStartTimeRef = useRef<number>(0);

  // State Machine Variables
  const minHipYRef = useRef<number>(0); // 0 is top, 1 is bottom. Higher value = lower physical position
  const maxHipYRef = useRef<number>(0);
  const repStartTimeRef = useRef<number>(0);
  const standingLegLengthRef = useRef<number>(0);
  const minHipAnkleDistRef = useRef<number>(1000);
  const isCurrentRepValidRef = useRef<boolean>(false);

  // --- Initialization ---
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
        setIsAnalyzerReady(true);
      } catch (error) {
        console.error("Failed to load MediaPipe:", error);
        setFeedback("Error initializing vision engine.");
      }
    };
    initPoseLandmarker();

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // --- Analysis Loop ---
  const analyzePose = useCallback((result: PoseLandmarkerResult) => {
    if (!result.landmarks || result.landmarks.length === 0) {
        // No user found
        return; 
    }

    const landmarks = result.landmarks[0];
    const hip = landmarks[POSE_LANDMARKS.LEFT_HIP]; // Using left side for 2D logic
    const knee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const ankle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const shoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];

    if (!hip || !knee || !shoulder) return;

    // Draw Skeleton
    const canvas = canvasRef.current;
    if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Animation Pulse
            const time = Date.now() / 1000;
            const pulse = (Math.sin(time * 6) + 1) / 2; // 0 to 1
            const radius = 6 + pulse * 2;

            // Draw connections
            ctx.lineWidth = 4;
            ctx.strokeStyle = "#3b82f6"; // Blue 500
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            
            ctx.beginPath();
            ctx.moveTo(shoulder.x * canvas.width, shoulder.y * canvas.height);
            ctx.lineTo(hip.x * canvas.width, hip.y * canvas.height);
            ctx.lineTo(knee.x * canvas.width, knee.y * canvas.height);
            ctx.lineTo(ankle.x * canvas.width, ankle.y * canvas.height);
            ctx.stroke();

            // Draw points with Pulse
            [shoulder, hip, knee, ankle].forEach(pt => {
                 // Glow
                 ctx.shadowBlur = 15;
                 ctx.shadowColor = "rgba(59, 130, 246, 0.8)";
                 
                 // Main Circle
                 ctx.beginPath();
                 ctx.fillStyle = "#fff";
                 ctx.arc(pt.x * canvas.width, pt.y * canvas.height, radius, 0, 2 * Math.PI);
                 ctx.fill();
                 
                 ctx.shadowBlur = 0; // Reset

                 // Outer Ripple
                 ctx.beginPath();
                 ctx.strokeStyle = `rgba(255, 255, 255, ${1 - pulse})`;
                 ctx.lineWidth = 1;
                 ctx.arc(pt.x * canvas.width, pt.y * canvas.height, radius + 4 + pulse * 2, 0, 2 * Math.PI);
                 ctx.stroke();
            });
        }
    }

    // --- Biomechanical State Machine ---
    if (!isRecording) return;

    const hipY = hip.y; 
    const currentTime = Date.now();

    // 1. Setup / Top
    if (currentPhase === LiftPhase.SETUP || currentPhase === LiftPhase.COMPLETED) {
        // If hip drops significantly, we entered Eccentric
        if (hipY > minHipYRef.current + 0.05) { // Threshold
            setCurrentPhase(LiftPhase.DESCENDING);
            repStartTimeRef.current = currentTime;
            setFeedback("Descending...");
            minHipAnkleDistRef.current = Math.abs(hip.y - ankle.y); // Reset depth tracker
        } else {
             // Calibrate "Top"
             minHipYRef.current = hipY;
             standingLegLengthRef.current = Math.abs(hip.y - ankle.y); // Capture standing leg length
        }
    }

    // 2. Descending (Eccentric)
    if (currentPhase === LiftPhase.DESCENDING) {
        if (hipY > maxHipYRef.current) {
            maxHipYRef.current = hipY; // Track lowest point (highest Y value)
        }
        
        // Track compression (distance between hip and ankle)
        const currentDist = Math.abs(hip.y - ankle.y);
        if (currentDist < minHipAnkleDistRef.current) {
            minHipAnkleDistRef.current = currentDist;
        }

        // If hip starts going up
        if (hipY < maxHipYRef.current - 0.02) {
             setCurrentPhase(LiftPhase.BOTTOM);
        }
    }

    // 3. Bottom / Transition
    if (currentPhase === LiftPhase.BOTTOM) {
        // Check Depth at bottom
        // Standard: Hip crease below top of knee
        const isBelowParallel = maxHipYRef.current > knee.y;
        
        // Robust: Hip center close to ankle (relative to standing height)
        // Useful for high camera angles where hip may not visually cross knee
        const isCompressed = minHipAnkleDistRef.current < (standingLegLengthRef.current * 0.55);
        
        const isDepthValid = isBelowParallel || isCompressed;
        isCurrentRepValidRef.current = isDepthValid;
        
        if (isDepthValid) {
             speakFeedback("Good Depth");
        } else {
             speakFeedback("Lower");
        }

        setCurrentPhase(LiftPhase.ASCENDING);
        setFeedback("Drive Up!");
    }

    // 4. Ascending (Concentric)
    if (currentPhase === LiftPhase.ASCENDING) {
        // If we return near the start height
        if (hipY < minHipYRef.current + 0.05) {
            completeRep(maxHipYRef.current, knee.y);
            setCurrentPhase(LiftPhase.COMPLETED);
            minHipYRef.current = hipY; // Reset top
            maxHipYRef.current = 0; // Reset bottom tracker
            setFeedback("Rep Complete");
        }
    }

  }, [isRecording, currentPhase]);

  const speakFeedback = (text: string) => {
      // Throttle speech
      if (!window.speechSynthesis.speaking) {
          const u = new SpeechSynthesisUtterance(text);
          u.rate = 1.2;
          window.speechSynthesis.speak(u);
      }
  };

  const completeRep = (bottomHipY: number, kneeY: number) => {
      const isValid = isCurrentRepValidRef.current;
      const duration = (Date.now() - repStartTimeRef.current) / 1000;
      
      const newRep: RepData = {
          id: reps.length + 1,
          timestamp: Date.now(),
          duration: duration,
          depth: bottomHipY,
          rom: bottomHipY - minHipYRef.current,
          velocity: 1 / duration, // Simple avg velocity proxy
          isValid: isValid,
          notes: isValid ? [] : ['Depth miss']
      };

      setReps(prev => [...prev, newRep]);
  };

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
        
        // Ensure canvas matches video size
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


  const handleToggleRecord = () => {
      if (isRecording) {
          // Finish session
          const session: WorkoutSession = {
              id: Date.now().toString(),
              type: 'SQUAT',
              startTime: sessionStartTimeRef.current,
              endTime: Date.now(),
              reps: reps
          };
          onEndSession(session);
      } else {
          setReps([]);
          sessionStartTimeRef.current = Date.now();
          setIsRecording(true);
          setFeedback("Get in position...");
      }
  };

  return (
    <div className="relative h-full flex flex-col bg-black">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent">
        <Button variant="ghost" size="sm" onClick={onBack} disabled={isRecording}>
          <ArrowLeft className="w-5 h-5 mr-2" /> Cancel
        </Button>
        <div className="flex flex-col items-end">
            <span className="text-xs font-mono text-zinc-400">STATUS</span>
            {isAnalyzerReady ? (
                <span className="text-green-400 font-bold flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>ONLINE</span>
            ) : (
                <span className="text-yellow-400 font-bold flex items-center"><span className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></span>INITIALIZING</span>
            )}
        </div>
      </div>

      {/* Main Video Area */}
      <div className="relative flex-1 bg-zinc-900 flex items-center justify-center overflow-hidden">
        {/* Webcam */}
        <Webcam
          ref={webcamRef}
          className="absolute inset-0 w-full h-full object-cover opacity-90"
          mirrored={false}
          videoConstraints={{ facingMode: "user", width: 1280, height: 720 }}
        />
        {/* AR Overlay Canvas */}
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover z-10"
        />

        {/* INTRO MODAL */}
        {isIntroOpen && (
            <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <div className="max-w-md space-y-6">
                   <h2 className="text-3xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-400">
                       Left-Side Bio-Audit
                   </h2>
                   <div className="bg-zinc-900/80 p-6 rounded-xl border border-zinc-700 text-left space-y-4">
                       <p className="text-zinc-300 leading-relaxed">
                           This mode is designed for <strong>corrective instruction</strong>. Unlike the standardized evaluation, you will receive real-time audio cues to fix your left-side mechanics.
                       </p>
                       <ul className="space-y-3">
                           <li className="flex items-start text-zinc-400 text-sm">
                               <CheckCircle2 className="w-5 h-5 mr-3 text-blue-500 shrink-0" />
                               <span>Position camera for a clear <strong>Side Profile</strong>.</span>
                           </li>
                           <li className="flex items-start text-zinc-400 text-sm">
                               <CheckCircle2 className="w-5 h-5 mr-3 text-blue-500 shrink-0" />
                               <span>Ensure your <strong>Left Shoulder & Hip</strong> are facing the camera.</span>
                           </li>
                           <li className="flex items-start text-zinc-400 text-sm">
                               <Volume2 className="w-5 h-5 mr-3 text-blue-500 shrink-0" />
                               <span>Turn <strong>Volume Up</strong> for audio depth cues.</span>
                           </li>
                       </ul>
                   </div>
                   <Button onClick={() => setIsIntroOpen(false)} size="lg" className="w-full">
                       Start Correction Loop <Play className="ml-2 w-4 h-4" />
                   </Button>
                </div>
            </div>
        )}
        
        {/* Center Guide/Feedback if not recording and not in intro */}
        {!isRecording && isAnalyzerReady && !isIntroOpen && (
            <div className="absolute z-20 flex flex-col items-center justify-center pointer-events-none">
                <div className="w-64 h-64 border-2 border-dashed border-white/30 rounded-xl mb-4 flex items-center justify-center">
                    <span className="text-white/50 text-sm">Align Left Side Here</span>
                </div>
            </div>
        )}
      </div>

      {/* Control Deck */}
      <div className="bg-zinc-900 border-t border-zinc-800 p-6 z-20 safe-area-bottom">
        <div className="max-w-md mx-auto flex items-center justify-between">
           
           {/* Rep Counter */}
           <div className="text-center">
               <div className="text-xs text-zinc-500 font-bold tracking-wider uppercase">Reps</div>
               <div className="text-3xl font-mono font-bold text-white">{reps.length}</div>
           </div>

           {/* Main Action */}
           <div className="relative -top-8">
               <button 
                onClick={handleToggleRecord}
                disabled={!isAnalyzerReady}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-2xl ${
                    isRecording 
                    ? 'bg-red-500 hover:bg-red-600 ring-4 ring-red-500/30' 
                    : 'bg-blue-600 hover:bg-blue-500 ring-4 ring-blue-600/30'
                }`}
               >
                   {isRecording ? <Square fill="currentColor" size={32} className="text-white" /> : <Play fill="currentColor" size={32} className="text-white translate-x-1" />}
               </button>
           </div>

           {/* Feedback Status */}
           <div className="text-center w-20">
                <div className="text-xs text-zinc-500 font-bold tracking-wider uppercase">Cue</div>
                <div className="text-sm font-medium text-blue-400 truncate">{feedback}</div>
           </div>
        </div>
      </div>
    </div>
  );
};