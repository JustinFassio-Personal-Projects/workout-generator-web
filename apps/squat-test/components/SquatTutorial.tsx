import React, { useEffect, useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { FilesetResolver, PoseLandmarker, PoseLandmarkerResult } from '@mediapipe/tasks-vision';
import { ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2, Play, Info, Target, AlertCircle, Footprints, Heart } from 'lucide-react';
import { InstructionModal } from './InstructionModal';
import { Button } from './Button';
import { POSE_LANDMARKS } from '@workout-generator/squat-logic';

interface SquatTutorialProps {
  onBack: () => void;
}

type TutorialPhase = 'INTRO' | 'SETUP' | 'DESCENT' | 'DEPTH_CHECK' | 'PAIN_CHECK' | 'COMPLETE';

export const SquatTutorial: React.FC<SquatTutorialProps> = ({ onBack }) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [phase, setPhase] = useState<TutorialPhase>('INTRO');
  const [feedback, setFeedback] = useState<string>("");
  
  // Logic Refs
  const requestRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);
  const hitDepthRef = useRef<boolean>(false);

  // Audio Helper
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
       window.speechSynthesis.cancel(); // Stop previous speech
       const u = new SpeechSynthesisUtterance(text);
       u.rate = 1.1;
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
      window.speechSynthesis.cancel();
    };
  }, []);

  // Phase Management
  useEffect(() => {
    switch (phase) {
        case 'INTRO':
            // No auto speech, wait for user click
            break;
        case 'SETUP':
            speak("Stand facing the camera. Ensure your full body is visible from head to toe.");
            setFeedback("Align in frame");
            break;
        case 'DESCENT':
            speak("Slowly lower yourself into a squat. Keep your chest up and heels down.");
            setFeedback("Descend slowly...");
            break;
        case 'DEPTH_CHECK':
            // Handled in loop
            break;
        case 'PAIN_CHECK':
            speak("Hold this position. Do you feel any sharp pain in your knees, hips, or back?");
            break;
        case 'COMPLETE':
            speak("Tutorial complete. You are ready for the audit.");
            break;
    }
  }, [phase]);

  const analyzePose = useCallback((result: PoseLandmarkerResult) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!result.landmarks || result.landmarks.length === 0) return;
    const landmarks = result.landmarks[0];

    const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP];
    const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP];
    const leftKnee = landmarks[POSE_LANDMARKS.LEFT_KNEE];
    const rightKnee = landmarks[POSE_LANDMARKS.RIGHT_KNEE];
    const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE];
    const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE];

    if (!leftHip || !rightHip || !leftKnee || !rightKnee) return;

    // Draw Skeleton
    const drawPoint = (pt: any, color: string) => {
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 6, 0, 2 * Math.PI);
        ctx.fill();
    }
    
    // Draw Hip Line
    ctx.strokeStyle = hitDepthRef.current ? "#22c55e" : "#3b82f6";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(leftHip.x * canvas.width, leftHip.y * canvas.height);
    ctx.lineTo(rightHip.x * canvas.width, rightHip.y * canvas.height);
    ctx.stroke();

    [leftHip, rightHip, leftKnee, rightKnee, leftAnkle, rightAnkle].forEach(pt => drawPoint(pt, "#fff"));

    // Depth Logic
    const hipY = (leftHip.y + rightHip.y) / 2;
    const kneeY = (leftKnee.y + rightKnee.y) / 2;
    const ankleY = (leftAnkle.y + rightAnkle.y) / 2;

    // Robust Depth Logic
    // Primary check: Hip crease below top of knee (standard powerlifting depth)
    // Secondary check: Hip has descended significantly from standing position
    const isDepthHit = hipY >= (kneeY - 0.02);

    if (isDepthHit) {
        hitDepthRef.current = true;
        if (phase === 'DESCENT') {
            setPhase('DEPTH_CHECK');
            speak("Good depth. Hold here.");
            setTimeout(() => setPhase('PAIN_CHECK'), 2000);
        }
    } else {
        hitDepthRef.current = false;
    }

    // Visual Feedback for Depth
    if (phase === 'DESCENT' || phase === 'DEPTH_CHECK' || phase === 'PAIN_CHECK') {
        const yPos = kneeY * canvas.height;
        ctx.beginPath();
        ctx.strokeStyle = isDepthHit ? "#22c55e" : "#ef4444";
        ctx.setLineDash([10, 10]);
        ctx.moveTo(0, yPos);
        ctx.lineTo(canvas.width, yPos);
        ctx.stroke();
        ctx.setLineDash([]);
        
        ctx.fillStyle = isDepthHit ? "#22c55e" : "#ef4444";
        ctx.font = "bold 16px Inter";
        ctx.fillText(isDepthHit ? "DEPTH REACHED" : "TARGET DEPTH", 20, yPos - 10);
    }

  }, [phase]);

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

  return (
    <div className="relative h-full flex flex-col bg-black">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-5 h-5 mr-2" /> Exit Tutorial
        </Button>
        <div className="bg-zinc-900/80 backdrop-blur px-3 py-1 rounded-full border border-zinc-700">
           <span className="text-xs font-mono text-blue-400 font-bold">MODE: FORM CHECK</span>
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

        {/* OVERLAYS */}
        
        {/* INTRO */}
        {phase === 'INTRO' && isReady && (
          <InstructionModal
            icon={<Info className="w-8 h-8 text-blue-500" />}
            title="Squat Tutorial"
            items={[
              { 
                label: 'Verify Full Range of Motion', 
                icon: <Target className="w-5 h-5 mr-2 text-green-500 shrink-0" /> 
              },
              { 
                label: 'Identify Valgus Collapse', 
                icon: <AlertCircle className="w-5 h-5 mr-2 text-red-500 shrink-0" /> 
              },
              { 
                label: 'Check Foot Stability', 
                icon: <Footprints className="w-5 h-5 mr-2 text-blue-500 shrink-0" /> 
              },
              { 
                label: 'Ensure Pain-Free Movement', 
                icon: <Heart className="w-5 h-5 mr-2 text-pink-500 shrink-0" /> 
              },
            ]}
            warningText="If you experience any sharp pain during this check, discontinue test immediately."
            startLabel="Start Check"
            onStart={() => setPhase('SETUP')}
          />
        )}

        {/* SETUP */}
        {phase === 'SETUP' && (
            <div className="absolute bottom-10 left-0 right-0 z-40 flex justify-center">
                <div className="bg-black/70 backdrop-blur-md px-8 py-4 rounded-full border border-white/10">
                    <p className="text-xl font-bold text-white">Step back and face the camera</p>
                    <Button onClick={() => setPhase('DESCENT')} className="mt-4 w-full" size="sm">I'm Ready</Button>
                </div>
            </div>
        )}

        {/* PAIN CHECK */}
        {phase === 'PAIN_CHECK' && (
             <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                 <div className="max-w-md bg-zinc-900 p-8 rounded-2xl border border-zinc-700 shadow-2xl">
                    <h2 className="text-2xl font-bold text-white mb-4">Pain Check</h2>
                    <p className="text-zinc-300 mb-8">
                        Did you feel any sharp pain or discomfort reaching full depth?
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                        <Button 
                            onClick={() => {
                                speak("Please stop immediately. Do not proceed with the audit.");
                                onBack();
                            }} 
                            variant="destructive"
                            className="h-auto py-4 flex flex-col items-center space-y-2"
                        >
                            <AlertTriangle className="w-6 h-6" />
                            <span>Yes, I felt pain</span>
                        </Button>
                        <Button 
                            onClick={() => setPhase('COMPLETE')} 
                            className="h-auto py-4 bg-green-600 hover:bg-green-700 flex flex-col items-center space-y-2"
                        >
                            <CheckCircle2 className="w-6 h-6" />
                            <span>No, I'm good</span>
                        </Button>
                    </div>
                 </div>
             </div>
        )}

        {/* COMPLETE */}
        {phase === 'COMPLETE' && (
             <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                 <div className="max-w-md space-y-6">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                    <h2 className="text-3xl font-bold text-white">You're Ready</h2>
                    <p className="text-zinc-300">
                        Your mechanics look safe for the audit. Remember to maintain this depth for every rep.
                    </p>
                    <Button onClick={onBack} size="lg" className="w-full">
                        Return to Dashboard
                    </Button>
                 </div>
             </div>
        )}

      </div>
    </div>
  );
};
