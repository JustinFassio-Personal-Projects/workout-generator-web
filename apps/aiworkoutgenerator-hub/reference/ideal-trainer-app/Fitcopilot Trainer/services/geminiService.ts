import { GoogleGenAI, Type, Schema } from '@google/genai';
import { UserProfile, DailyContext, TrainerType, WorkoutPlan } from '../types';

// Initialize API Key management
const STORAGE_KEY = 'GEMINI_API_KEY';
const DEFAULT_KEY = 'AIzaSyCPgDl4SY_etT74EPzIU_iPxwfCFA-KEUk';

let currentApiKey =
  typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) || DEFAULT_KEY : DEFAULT_KEY;

export const updateGeminiApiKey = (key: string) => {
  currentApiKey = key;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, key);
  }
};

export const getGeminiApiKey = () => currentApiKey;

// Define the response schema for structured output
const workoutSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: 'Catchy title for the workout' },
    description: { type: Type.STRING, description: 'Brief overview of what to expect' },
    difficulty: { type: Type.STRING, description: 'Estimated difficulty level' },
    trainerNotes: {
      type: Type.STRING,
      description:
        "Motivational quote or specific advice based on the trainer persona and user's current state (sleep/energy)",
    },
    totalDuration: { type: Type.NUMBER, description: 'Total estimated duration in minutes' },
    estimatedCalories: { type: Type.NUMBER, description: 'Estimated calories burned' },
    personalization: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          attribute: {
            type: Type.STRING,
            description:
              "The specific user attribute (e.g. 'Low Sleep (4/10)', 'Knee Injury', 'Goal: Hypertrophy')",
          },
          adjustment: {
            type: Type.STRING,
            description: 'How the workout was adjusted based on this attribute',
          },
        },
      },
    },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ['Warmup', 'Main Workout', 'Cooldown', 'Finisher'] },
          durationEstimate: { type: Type.STRING, description: "e.g., '10 mins'" },
          exercises: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                sets: { type: Type.NUMBER },
                muscleTarget: { type: Type.STRING },
                tempo: { type: Type.STRING, description: 'e.g., 3-0-1-0 or N/A' },
                cues: { type: Type.ARRAY, items: { type: Type.STRING } },
                detailedInstructions: {
                  type: Type.STRING,
                  description:
                    'Step-by-step instructions suitable for a beginner to safely perform the exercise. Also phrased to be used as a prompt for an AI image generator to visualize the movement.',
                },
                setDetails: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      reps: { type: Type.STRING, description: "e.g., '12' or 'AMRAP'" },
                      weight: {
                        type: Type.STRING,
                        description: "Suggested intensity e.g. 'RPE 8' or 'Heavy' or '% of 1RM'",
                      },
                      duration: {
                        type: Type.STRING,
                        description: "Time if applicable, e.g., '45s'",
                      },
                      rest: { type: Type.STRING, description: 'Rest after set' },
                      notes: { type: Type.STRING },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

export const generateWorkout = async (
  profile: UserProfile,
  daily: DailyContext,
  trainerType: TrainerType,
): Promise<WorkoutPlan> => {
  // Re-initialize client on every request to ensure it uses the latest key
  const ai = new GoogleGenAI({ apiKey: currentApiKey });

  const weightUnit = profile.units === 'standard' ? 'lbs' : 'kg';

  const systemInstruction = `
    You are an expert Personal Trainer specialized in ${trainerType}. 
    Your goal is to generate a highly specific, safe, and effective workout plan based on the user's static profile and their daily bio-feedback.
    
    TONE AND STYLE:
    - Adopt the persona of a ${trainerType}.
    - If sleep or energy is low, adjust intensity accordingly and be encouraging.
    - If injuries are present, strictly avoid aggravating exercises and suggest alternatives.
    - Be precise with numbers (reps, sets, rest).
    - **CRITICAL**: The user prefers ${profile.units} units. All weights must be implied to be in ${weightUnit} unless specifying RPE. If referencing distance, use ${profile.units === 'standard' ? 'miles' : 'km'}.
    
    PERSONALIZATION:
    - You MUST explain 3-5 specific choices you made based on the user's data.
    - Populate the 'personalization' array with these insights.
    - Link specific attributes (e.g. "Knee Injury", "Low Energy") to concrete plan adjustments (e.g. "Swapped squats for leg press", "Reduced volume by 20%").

    OUTPUT FORMAT:
    - You must return valid JSON conforming to the provided schema.
    - No markdown formatting outside the JSON structure.
  `;

  const prompt = `
    USER PROFILE:
    - Age: ${profile.age}, Gender: ${profile.gender}
    - Stats: ${profile.weight}${weightUnit}, ${profile.height}${profile.units === 'standard' ? 'in' : 'cm'}
    - Level: ${profile.fitnessLevel}
    - Injuries: ${profile.injuries.join(', ') || 'None'}
    - Goals: ${profile.goals.join(', ')}
    
    DAILY CONTEXT (Use this to adjust today's workout):
    - Primary Objective/Focus: ${daily.selectedFocus} (Crucial: Design the entire plan around this)
    - Available Time: ${daily.duration} mins
    - Sleep Quality: ${daily.sleepQuality}/10
    - Energy Level: ${daily.energyLevel}/10
    - Soreness: ${daily.soreness.join(', ') || 'None'}
    - Specific Target Muscles: ${daily.targetMuscleGroups.join(', ')}
    - Equipment: ${daily.equipmentAvailable.join(', ')}
    
    Generate the workout now.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: workoutSchema,
        temperature: 0.7, // Some creativity for variety
      },
    });

    const text = response.text;
    if (!text) throw new Error('No response from Gemini');

    const plan = JSON.parse(text) as WorkoutPlan;
    // Attach the trainer type and focus to the plan object manually
    plan.trainerType = trainerType;
    plan.focus = daily.selectedFocus;
    return plan;
  } catch (error) {
    console.error('Error generating workout:', error);
    throw error;
  }
};
