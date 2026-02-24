import React, { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { FilesetResolver, PoseLandmarker, PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import { ArrowLeft, RefreshCw, AlertCircle, CheckCircle2, RotateCcw, XCircle, LayoutDashboard } from 'lucide-react';
import { InstructionModal } from './InstructionModal';
import { Button } from './Button';
import { ViewState, RepData, WorkoutSession, POSE_LANDMARKS, calculateAngle } from '@workout-generator/squat-logic';

interface SquatEvaluationProps {
  onBack: () => void;
  onComplete: (session: WorkoutSession, destination?: ViewState) => void;
}

type EvalPhase = 'IDLE' | 'COUNTDOWN' | 'FRONT_PHASE' | 'TRANSITION' | 'SIDE_PHASE' | 'COMPLETE';

export const SquatEvaluation: React.FC<SquatEvaluationProps> = ({ onBack, onComplete }) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  // Logic Variables
  const [phase, setPhase] = useState<EvalPhase>('IDLE');
  const [countdown, setCountdown] = useState(10);
  const [feedback, setFeedback] = useState<string>("Align yourself in frame");
  const [frontReps, setFrontReps] = useState<number>(0);
  const [sideReps, setSideReps] = useState<number>(0);
  const [repsData, setRepsData] = useState<RepData[]>([]);

  // Refs for logic loop
  const squatStageRef = useRef<'up' | 'down' | null>(null);
  const hitDepthRef = useRef<boolean>(false);
  const requestRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);
  const repStartTimeRef = useRef<number>(0);
  const lastSoundTimeRef = useRef<number>(0);
  const minMetricRef = useRef<number>(1000); // Track deepest point (ratio or angle)

  // Audio Helper - Speech
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
       window.speechSynthesis.cancel(); // Stop previous speech to prevent overlap
       const u = new SpeechSynthesisUtterance(text);
       u.rate = 1.2;
       window.speechSynthesis.speak(u);
    }
  };

  // Audio Helper - SFX (Clack)
  const playClack = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        
        const audioCtx = new AudioContext();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        // Sharp square wave for "clack" / metronome sound
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.08);

        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.08);
    } catch (e) {
        console.error("Audio play failed", e);
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

  // Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (phase === 'COUNTDOWN' && countdown > 0) {
        interval = setInterval(() => {
            setCountdown(prev => prev - 1);
        }, 1000);
    } else if (phase === 'COUNTDOWN' && countdown === 0) {
        if (frontReps < 5) {
             setPhase('FRONT_PHASE');
             speak("Start Front Squats");
        } else {
             setPhase('SIDE_PHASE');
             speak("Start Side Squats");
        }
    }
    return () => clearInterval(interval);
  }, [phase, countdown, frontReps]);

  const handleStart = () => {
      setCountdown(10);
      setPhase('COUNTDOWN');
      speak("Ten seconds to get in position.");
  };

  const handleStartSidePhase = () => {
      setCountdown(5); // Shorter countdown for transition
      setPhase('COUNTDOWN'); 
      speak("5 seconds. Turn to the side.");
  };

  const recordRep = (isValid: boolean, depthVal: number) => {
      const duration = (Date.now() - repStartTimeRef.current) / 1000;
      // Cap duration to avoid outliers if user pauses too long
      const safeDuration = duration > 10 ? 10 : duration;
      
      const newRep: RepData = {
          id: repsData.length + 1,
          timestamp: Date.now(),
          duration: safeDuration,
          depth: depthVal,
          rom: 0, // Placeholder
          velocity: safeDuration > 0 ? 1 / safeDuration : 0,
          isValid: isValid,
          notes: phase === 'FRONT_PHASE' ? ['Front View'] : ['Side View']
      };
      setRepsData(prev => [...prev, newRep]);
      repStartTimeRef.current = Date.now(); // Reset for next rep
  };

  const analyzePose = useCallback((result: PoseLandmarkerResult) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!result.landmarks || result.landmarks.length === 0) return;
    const landmarks = result.landmarks[0];

    // Animation Pulse
    const time = Date.now() / 1000;
    const pulse = (Math.sin(time * 8) + 1) / 2;
    const baseRadius = 5;
    const activeRadius = baseRadius + pulse * 2;

    // Common Drawing Helper
    const drawPoint = (idx: number, color: string = '#fff') => {
        const pt = landmarks[idx];
        if(pt) {
            // Glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
            
            // Main Dot
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.arc(pt.x * canvas.width, pt.y * canvas.height, activeRadius, 0, 2 * Math.PI);
            ctx.fill();
            
            ctx.shadowBlur = 0; // Reset

            // Ripple
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.globalAlpha = 1 - pulse; // Fade out as it expands
            ctx.lineWidth = 1;
            ctx.arc(pt.x * canvas.width, pt.y * canvas.height, activeRadius + 4 + pulse * 4, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    };

    // --- VISUAL INDICATORS ---
    const drawDepthZone = (yThreshold: number, isHit: boolean) => {
        const yPos = yThreshold * canvas.height;
        
        // Gradient Zone (Below parallel)
        const gradient = ctx.createLinearGradient(0, yPos, 0, canvas.height);
        if (isHit) {
            gradient.addColorStop(0, 'rgba(34, 197, 94, 0.05)'); 
            gradient.addColorStop(1, 'rgba(34, 197, 94, 0.2)');
        } else {
            gradient.addColorStop(0, 'rgba(239, 68, 68, 0.05)'); // Red tint
            gradient.addColorStop(1, 'rgba(239, 68, 68, 0.2)');
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, yPos, canvas.width, canvas.height - yPos);
        
        // Target Depth Line
        ctx.beginPath();
        ctx.strokeStyle = isHit ? "#4ade80" : "#ef4444"; // Green if hit, Red if not
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 10]);
        ctx.moveTo(0, yPos);
        ctx.lineTo(canvas.width, yPos);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Target Label
        ctx.fillStyle = isHit ? "#4ade80" : "#ef4444";
        ctx.font = "bold 12px Inter, sans-serif";
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 4;
        ctx.fillText(isHit ? "DEPTH REACHED" : "TARGET DEPTH", 10, yPos + 20);
        ctx.shadowBlur = 0;
    };

    const drawAlignmentGuide = (ankle: any, knee: any, isBad: boolean) => {
        const idealX = ankle.x * canvas.width;
        const kneeX = knee.x * canvas.width;
        const kneeY = knee.y * canvas.height;
        const ankleY = ankle.y * canvas.height;

        // 1. Vertical Reference (Ideal Knee Path - purely vertical from ankle)
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.moveTo(idealX, ankleY);
        ctx.lineTo(idealX, kneeY - 50); // Extend slightly above knee
        ctx.stroke();
        ctx.setLineDash([]);

        // 2. "Ghost" Target (Where the knee should be)
        ctx.beginPath();
        // Red fill/stroke if bad, Green/White if good
        ctx.fillStyle = isBad ? "rgba(239, 68, 68, 0.1)" : "rgba(255, 255, 255, 0.05)";
        ctx.strokeStyle = isBad ? "#ef4444" : "rgba(34, 197, 94, 0.3)";
        ctx.lineWidth = isBad ? 2 : 1;
        ctx.arc(idealX, kneeY, 15, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // 3. Deviation Indicator (If Valgus)
        if (isBad) {
            // Draw red line connecting current knee to ideal
            ctx.beginPath();
            ctx.strokeStyle = "#ef4444"; // Red
            ctx.lineWidth = 2;
            ctx.moveTo(kneeX, kneeY);
            ctx.lineTo(idealX, kneeY);
            ctx.stroke();
            
            // X Icon at knee
            ctx.beginPath();
            ctx.strokeStyle = "#ef4444";
            ctx.moveTo(kneeX - 6, kneeY - 6);
            ctx.lineTo(kneeX + 6, kneeY + 6);
            ctx.moveTo(kneeX + 6, kneeY - 6);
            ctx.lineTo(kneeX - 6, kneeY + 6);
            ctx.stroke();
        } else {
             // Subtle connection if good
             ctx.beginPath();
             ctx.strokeStyle = "rgba(34, 197, 94, 0.2)";
             ctx.lineWidth = 1;
             ctx.moveTo(kneeX, kneeY);
             ctx.lineTo(idealX, kneeY);
             ctx.stroke();
        }
    };
    
    // ----------- PHASE 1: FRONT VIEW LOGIC -----------
    if (phase === 'FRONT_PHASE') {
        const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
        const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
        const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
        const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
        const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
        const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

        // Strict safety check for all required landmarks
        if (!leftHip || !rightHip || !leftKnee || !rightKnee || !leftAnkle || !rightAnkle) return;

        // 1. Calculate Metrics
        const hipY = (leftHip.y + rightHip.y) / 2;
        const kneeY = (leftKnee.y + rightKnee.y) / 2;
        const ankleY = (leftAnkle.y + rightAnkle.y) / 2;
        
        // Robust Depth Logic: 
        // 1. Primary: Hip Crease below Top of Knee (Standard)
        // 2. Secondary: Hip Center relative to Ankle (for camera angles)
        // If camera is high, hipY might not cross kneeY even at depth.
        // We check if hip gets close to ankle height (normalized by leg length)
        
        const legLength = Math.abs(hipY - ankleY); // Approx leg length in frame
        const currentHipHeight = Math.abs(hipY - ankleY); // Distance from hip to ankle
        
        // If hip is within 40% of leg length from ankle, it's deep
        // OR standard check: hipY >= kneeY
        const isDepthHit = (hipY >= (kneeY - 0.02)) || (currentHipHeight < legLength * 0.45);

        // KNEE VALGUS DETECTION
        // Calculate stance widths
        const hipWidth = Math.abs(leftHip.x - rightHip.x);
        const kneeWidth = Math.abs(leftKnee.x - rightKnee.x);
        const ankleWidth = Math.abs(leftAnkle.x - rightAnkle.x);
        
        // Ratio for descent detection
        const thighProj = kneeY - hipY; 
        const shankProj = ankleY - kneeY;
        const rawRatio = shankProj > 0.01 ? thighProj / shankProj : 0;
        
        let isValgus = false;

        // Check for valgus during the active movement phase (when not fully standing)
        // Rule: Knees should generally track inline or outside hips/ankles.
        // If knee width collapses significantly relative to hip width or ankle width, flag it.
        if (rawRatio < 0.90) { 
             // Valgus Condition:
             // 1. Knees narrower than ankles (traditional valgus)
             // 2. Knees significantly narrower than hips (femoral internal rotation/adduction)
             if (kneeWidth < ankleWidth * 0.8 || kneeWidth < hipWidth * 0.8) {
                 isValgus = true;
             }
        }

        // 2. Draw Visuals (After calculations to use current state)
        drawDepthZone(kneeY, isDepthHit);
        drawAlignmentGuide(leftAnkle, leftKnee, isValgus);
        drawAlignmentGuide(rightAnkle, rightKnee, isValgus);

        // Draw Hip Line (Changes color on depth)
        ctx.strokeStyle = hitDepthRef.current ? "#22c55e" : "#3b82f6";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(leftHip.x * canvas.width, leftHip.y * canvas.height);
        ctx.lineTo(rightHip.x * canvas.width, rightHip.y * canvas.height);
        ctx.stroke();
        
        [POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.RIGHT_HIP].forEach(i => drawPoint(i));

        // 3. State Machine Logic
        if (isDepthHit) {
            hitDepthRef.current = true;
            if (squatStageRef.current === 'down') {
                if (isValgus) {
                    setFeedback("KNEES OUT! (Valgus)");
                } else {
                    setFeedback("Good Depth! (Front)");
                }
            }
        }

        // Ratio < 0.6 indicates descent has started
        if (rawRatio < 0.6 && squatStageRef.current !== 'down') {
            squatStageRef.current = 'down';
            repStartTimeRef.current = Date.now();
            minMetricRef.current = rawRatio;
            setFeedback("Descend...");
        }

        // Active Cueing during movement
        if (squatStageRef.current === 'down') {
            // Track minimum ratio (maximum depth)
            if (rawRatio < minMetricRef.current) {
                minMetricRef.current = rawRatio;
            }

            if (!hitDepthRef.current) {
                if (isValgus) {
                    setFeedback("KNEES OUT! (Valgus)");
                    // Trigger Audio Clack
                    const now = Date.now();
                    if (now - lastSoundTimeRef.current > 800) { // Throttle to prevent machine gun effect
                        playClack();
                        lastSoundTimeRef.current = now;
                    }
                }
            }
        }

        // Ratio > 0.85 indicates return to standing
        if (rawRatio > 0.85 && squatStageRef.current === 'down') {
            squatStageRef.current = 'up';
            
            const isValid = hitDepthRef.current;
            recordRep(isValid, minMetricRef.current); // Store min ratio as depth metric

            if (isValid) {
                setFrontReps(prev => {
                    const newVal = prev + 1;
                    if (newVal >= 5) {
                        speak("Front set complete. Rest and prepare for side view.");
                        setPhase('TRANSITION');
                        squatStageRef.current = null;
                        return 5;
                    }
                    speak(newVal.toString());
                    return newVal;
                });
                setFeedback("Valid Rep!");
            } else {
                setFeedback("Missed Depth!");
                speak("Missed depth");
            }
            hitDepthRef.current = false;
        }
    }

    // ----------- PHASE 2: SIDE VIEW LOGIC -----------
    if (phase === 'SIDE_PHASE') {
         // Side view landmarks (Assuming Left side for now)
         const hip = landmarks[POSE_LANDMARKS.LEFT_HIP];
         const knee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
         const ankle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
         const shoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER];

         if (!hip || !knee || !ankle || !shoulder) return;

         // 1. Logic: Knee Flexion Angle & Hip Height
         const angle = calculateAngle(hip, knee, ankle); 
         
         // Depth Check: Hip Joint lower than Knee Joint (Y value higher)
         // Adding tolerance to make detection more reliable
         const isDepthHit = hip.y >= (knee.y - 0.02);
         
         if (isDepthHit) {
             hitDepthRef.current = true;
             if (squatStageRef.current === 'down') {
                setFeedback("Good Depth! (Side)");
             }
         }

         // 2. Visuals
         drawDepthZone(knee.y, isDepthHit);

         ctx.strokeStyle = hitDepthRef.current ? "#22c55e" : "#a855f7"; // Green if depth, else Purple
         ctx.lineWidth = 4;
         ctx.beginPath();
         ctx.moveTo(shoulder.x * canvas.width, shoulder.y * canvas.height);
         ctx.lineTo(hip.x * canvas.width, hip.y * canvas.height);
         ctx.lineTo(knee.x * canvas.width, knee.y * canvas.height);
         ctx.lineTo(ankle.x * canvas.width, ankle.y * canvas.height);
         ctx.stroke();

         [POSE_LANDMARKS.LEFT_SHOULDER, POSE_LANDMARKS.LEFT_HIP, POSE_LANDMARKS.LEFT_KNEE, POSE_LANDMARKS.LEFT_ANKLE].forEach(i => drawPoint(i));

         // 3. State Machine (Using Angle)
         // Standing ~170, Bottom ~70-100
         if (angle < 140 && squatStageRef.current !== 'down') {
             squatStageRef.current = 'down';
             repStartTimeRef.current = Date.now();
             minMetricRef.current = angle;
             setFeedback("Descend...");
         }

         if (squatStageRef.current === 'down') {
             // Track minimum angle (maximum depth)
             if (angle < minMetricRef.current) {
                 minMetricRef.current = angle;
             }
         }

         if (angle > 160 && squatStageRef.current === 'down') {
             squatStageRef.current = 'up';
             
             const isValid = hitDepthRef.current;
             recordRep(isValid, minMetricRef.current); // Store min angle as depth metric

             if (isValid) {
                 setSideReps(prev => {
                    const newVal = prev + 1;
                    if (newVal >= 5) {
                        speak("Session complete.");
                        setPhase('COMPLETE');
                        return 5;
                    }
                    speak(newVal.toString());
                    return newVal;
                 });
                 setFeedback("Valid Rep!");
             } else {
                 setFeedback("Missed Depth!");
                 speak("Missed depth");
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
        <div className="bg-zinc-900/80 backdrop-blur px-3 py-1 rounded-full border border-zinc-700">
           <span className="text-xs font-mono text-green-400 font-bold">MODE: STANDARDIZED EVALUATION</span>
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
          audio={false}
          disablePictureInPicture
          forceScreenshotSourceSize={false}
          imageSmoothing
          screenshotFormat="image/webp"
          screenshotQuality={1}
          videoConstraints={{ facingMode: "user", width: 1280, height: 720 }}
          onUserMedia={() => {}}
          onUserMediaError={() => {}}
        />
        <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-cover z-10"
        />

        {/* OVERLAYS based on Phase */}
        
        {/* IDLE */}
        {phase === 'IDLE' && isReady && (
          <InstructionModal
            title="Squat Evaluation Protocol"
            items={[
              '10 Second Setup Timer',
              '5 Reps: Facing Camera',
              '5 Reps: Side Profile (90° turn)',
            ]}
            footer={
              <p className="text-xs text-zinc-500 italic">
                Estimated time: 2-3 minutes
              </p>
            }
            onStart={handleStart}
          />
        )}

        {/* COUNTDOWN */}
        {phase === 'COUNTDOWN' && (
             <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
                 <div className="text-[120px] font-bold text-blue-500 animate-pulse drop-shadow-2xl">
                    {countdown}
                 </div>
             </div>
        )}

        {/* TRANSITION */}
        {phase === 'TRANSITION' && (
             <div className="absolute inset-0 z-40 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                 <RotateCcw className="w-16 h-16 text-purple-500 mb-4 animate-spin-slow" />
                 <h2 className="text-2xl font-bold text-white mb-2">Phase 1 Complete</h2>
                 <p className="text-zinc-300 mb-6">Turn 90 degrees to show your side profile.</p>
                 <Button onClick={handleStartSidePhase} size="lg" className="bg-purple-600 hover:bg-purple-700">Start Side Phase</Button>
             </div>
        )}

        {/* COMPLETE */}
        {phase === 'COMPLETE' && (
             <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                 {(() => {
                     const totalAttempts = repsData.length;
                     const validReps = repsData.filter(r => r.isValid).length;
                     // Prevent division by zero
                     const score = totalAttempts > 0 ? (validReps / totalAttempts) * 100 : 0;
                     const passed = score >= 75;

                     // Calculate Consistency Score
                     const calculateConsistency = () => {
                        const frontValid = repsData.filter(r => r.notes.includes('Front View') && r.isValid);
                        const sideValid = repsData.filter(r => r.notes.includes('Side View') && r.isValid);
                        
                        let frontScore = 100;
                        let sideScore = 100;
                        let hasFront = false;
                        let hasSide = false;

                        if (frontValid.length >= 2) {
                            hasFront = true;
                            const values = frontValid.map(r => r.depth);
                            const mean = values.reduce((a, b) => a + b, 0) / values.length;
                            const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
                            const sd = Math.sqrt(variance);
                            // Front depth is ratio (e.g. -0.1 to 0.3). SD ~ 0.05 is good.
                            frontScore = Math.max(0, 100 - (sd * 200)); 
                        }

                        if (sideValid.length >= 2) {
                            hasSide = true;
                            const values = sideValid.map(r => r.depth); // depth here is angle
                            const mean = values.reduce((a, b) => a + b, 0) / values.length;
                            const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
                            const sd = Math.sqrt(variance);
                            // Side depth is angle (e.g. 70-90). SD ~ 3 is good.
                            sideScore = Math.max(0, 100 - (sd * 3));
                        }

                        if (!hasFront && !hasSide) return 0;
                        if (!hasFront) return sideScore;
                        if (!hasSide) return frontScore;
                        return (frontScore + sideScore) / 2;
                     };

                     const consistencyScore = calculateConsistency();

                     return (
                         <div className="bg-zinc-900/90 p-8 rounded-2xl border border-zinc-700 max-w-md w-full shadow-2xl">
                             <div className="flex justify-center mb-6">
                                 {passed ? (
                                     <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
                                         <CheckCircle2 className="w-10 h-10 text-green-500" />
                                     </div>
                                 ) : (
                                     <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center">
                                         <AlertCircle className="w-10 h-10 text-yellow-500" />
                                     </div>
                                 )}
                             </div>
                             
                             <h2 className="text-3xl font-bold text-white mb-2">
                                 {passed ? "Evaluation Passed" : "Technique Audit"}
                             </h2>
                             
                             <p className="text-zinc-400 mb-8 leading-relaxed">
                                 {passed 
                                     ? "Your biomechanics are stable. You are cleared for high-intensity volume testing." 
                                     : "Detected inconsistencies in depth or stability. We recommend a foundational block first."}
                             </p>

                             <div className="bg-black/40 p-4 rounded-xl border border-white/5 mb-8">
                                 <div className="text-xs text-zinc-500 uppercase font-bold tracking-widest mb-2">Recommended Protocol</div>
                                 <div className={`text-xl font-bold ${passed ? 'text-blue-400' : 'text-yellow-400'}`}>
                                     {passed ? "30-Second Max Effort Test" : "4-Week Stability Program"}
                                 </div>
                             </div>

                             <div className="flex items-center justify-between text-sm text-zinc-500 mb-2 px-4">
                                 <span>Pass Rate</span>
                                 <span className="font-mono text-white">{Math.round(score)}%</span>
                             </div>
                             <div className="flex items-center justify-between text-sm text-zinc-500 mb-8 px-4">
                                 <span>Rep Consistency</span>
                                 <span className={`font-mono font-bold ${consistencyScore > 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                                     {Math.round(consistencyScore)}/100
                                 </span>
                             </div>

                             <div className="space-y-3">
                                <Button onClick={() => handleFinish(ViewState.REPORT)} size="lg" className={`w-full ${passed ? 'bg-blue-600 hover:bg-blue-700' : 'bg-zinc-700 hover:bg-zinc-600'}`}>
                                    {passed ? "Continue to Report" : "View Detailed Report"}
                                </Button>
                                <Button onClick={() => handleFinish(ViewState.DASHBOARD)} variant="ghost" size="md" className="w-full text-zinc-400 hover:text-white">
                                    <LayoutDashboard className="w-4 h-4 mr-2" /> Return to Dashboard
                                </Button>
                             </div>
                         </div>
                     );
                 })()}
             </div>
        )}

        
        {/* ACTIVE HUD (Front or Side) */}
        {(phase === 'FRONT_PHASE' || phase === 'SIDE_PHASE') && (
            <div className="absolute top-20 left-4 z-20 space-y-2">
                <div className="bg-black/60 backdrop-blur p-4 rounded-xl border border-white/10 w-64">
                    <div className="flex justify-between items-center mb-2">
                         <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                             {phase === 'FRONT_PHASE' ? 'Front View' : 'Side View'}
                         </span>
                         <span className="text-xs text-zinc-500">
                             {phase === 'FRONT_PHASE' ? `${frontReps}/5` : `${sideReps}/5`}
                         </span>
                    </div>
                    <div className="w-full bg-zinc-800 h-2 rounded-full mb-3">
                         <div 
                           className="bg-blue-500 h-full rounded-full transition-all duration-300"
                           style={{ width: phase === 'FRONT_PHASE' ? `${(frontReps/5)*100}%` : `${(sideReps/5)*100}%` }}
                         />
                    </div>
                    <div className="border-t border-white/10 pt-2 mb-2">
                        <span className="text-zinc-400 text-xs font-bold tracking-wider block mb-1">LIVE CUE</span>
                        <span className="text-lg text-white font-medium leading-tight">{feedback}</span>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};