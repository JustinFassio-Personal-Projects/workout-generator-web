import { GoogleGenAI, Type } from "@google/genai";
import { WorkoutSession, AnalysisResult } from "@workout-generator/squat-logic";

const GEMINI_MODEL = "gemini-3-pro-preview";

export const generatePostSetAnalysis = async (session: WorkoutSession): Promise<AnalysisResult> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Construct a context-rich prompt
    const repSummary = session.reps.map(r => 
      `Rep ${r.id}: Depth=${r.depth.toFixed(2)}, Velocity=${r.velocity.toFixed(2)}, Valid=${r.isValid}, Notes=${r.notes.join(',')}`
    ).join('\n');

    const prompt = `
      Role: You are a PhD-level Biomechanics Coach for elite powerlifters.
      Task: Analyze the provided squat session data and return a JSON object containing a structured assessment.
      
      Data:
      Type: ${session.type}
      Duration: ${(session.endTime! - session.startTime) / 1000} seconds
      Reps:
      ${repSummary}

      Requirements:
      1. 'executiveSummary': A concise 2-3 sentence summary of the set using HTML tags (<b>, <i>) for emphasis.
      2. 'scores': Estimate 4 numerical scores (0-100) based on the data:
         - 'eccentricControl': Ability to lower weight under control.
         - 'concentricExplosiveness': Speed and drive up.
         - 'depthConsistency': How consistent the depth metric was.
         - 'stability': inferred stability based on validity.
      3. 'detailedAnalysis': A comprehensive breakdown of the biomechanics. Use HTML for formatting:
         - Use <h3> for section headers (e.g., "Sticking Point", "Path Deviation").
         - Use <ul> and <li> for bullet points.
         - Use <strong> for key terms.
      4. 'prescribedCues': An array of 3 short, punchy corrective cues (strings).

      Output must be valid JSON.
    `;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                executiveSummary: { type: Type.STRING },
                scores: {
                    type: Type.OBJECT,
                    properties: {
                        eccentricControl: { type: Type.NUMBER },
                        concentricExplosiveness: { type: Type.NUMBER },
                        depthConsistency: { type: Type.NUMBER },
                        stability: { type: Type.NUMBER }
                    }
                },
                detailedAnalysis: { type: Type.STRING },
                prescribedCues: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    // Return mock fallback
    return {
        executiveSummary: "<b>Connection Error:</b> Unable to generate live analysis.",
        scores: { eccentricControl: 0, concentricExplosiveness: 0, depthConsistency: 0, stability: 0 },
        detailedAnalysis: "<p>Please check your network connection and try again.</p>",
        prescribedCues: ["Check Network", "Retry Analysis"]
    };
  }
};

export const generateWorkoutPlan = async (name: string, testReps: number, evalScore: number): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const prompt = `
          Role: You are a PhD Strength & Conditioning Coach.
          Task: Write a personalized "Squat Correction & Capacity" workout for a user named ${name}.
          
          User Stats:
          - 30-Second Max Effort Squats: ${testReps} reps (Average is 15-20. >25 is elite. <12 is novice).
          - Biomechanical Stability Score: ${evalScore.toFixed(0)}/100.
          
          Requirements:
          1. The workout must be BODYWEIGHT ONLY. No equipment.
          2. Focus on fixing form (based on stability score) and increasing capacity (based on rep count).
          3. Structure: Warmup -> 3 Main Movements (Sets/Reps) -> Cool Down.
          4. Format: Return ONLY raw HTML (no markdown code blocks, no JSON).
             - Use <h2 class="text-2xl font-bold text-blue-400 mb-4"> for the main title (include User Name).
             - Use <div class="bg-zinc-800 p-4 rounded-xl mb-4"> for each exercise block.
             - Use <h3 class="font-bold text-white text-lg"> for exercise names.
             - Use <p class="text-zinc-400 text-sm"> for instructions/rationale.
             - Include a "Coaches Note" at the top explaining why this specific plan was chosen based on their stats.
        `;
    
        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: prompt,
        });
    
        return response.text || "<p>Error generating workout.</p>";
    
      } catch (error) {
        console.error("Gemini Workout Gen Failed:", error);
        return "<p>Unable to generate workout at this time. Please check your connection.</p>";
      }
};