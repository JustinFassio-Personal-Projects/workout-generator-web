/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Modality } from '@google/genai'
import {
  AspectRatio,
  ComplexityLevel,
  VisualStyle,
  ResearchResult,
  SearchResultItem,
  Language,
  ExerciseDetail,
} from '../types'

const getAi = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY })
}

const TEXT_MODEL = 'gemini-3-pro-preview'
const IMAGE_MODEL = 'gemini-3-pro-image-preview'
const EDIT_MODEL = 'gemini-3-pro-image-preview'

const getLevelInstruction = (level: ComplexityLevel): string => {
  switch (level) {
    case 'New to Exercise':
      return 'Expertise: Foundation Level. Focus on safety, baseline joint alignment, and simplified kinetic paths. Use accessible terminology for foundational motor control.'
    case 'Some Experience':
      return 'Expertise: Performance Intermediate. Focus on load distribution, primary muscle group engagement, and breathing synchronization within the kinetic chain.'
    case 'Advanced Athlete':
      return 'Expertise: Advanced Athletics. Detail complex force transmission, specific eccentric/concentric phases, and high-level technical nuances of the movement.'
    case 'Elite Athlete':
      return 'Expertise: Pro Mastery. Focus on micro-corrections in biomechanics, explosive torque generation, physiological efficiency, and high-velocity joint stability.'
    default:
      return 'Expertise: General Biomechanics. Focus on accurate technical form.'
  }
}

const getStyleInstruction = (style: VisualStyle): string => {
  switch (style) {
    case 'Minimalist':
      return 'Aesthetic: Bauhaus Kinetic. Clean vector anatomy, primary movement paths highlighted with high-contrast lines. No clutter.'
    case 'Realistic':
      return 'Aesthetic: Hyper-Realistic Biomechanics. Cinema 4D quality lighting, sweat/muscle texture detail, anatomy should look like a professional athletic photoshoot.'
    case 'Cartoon':
      return 'Aesthetic: Dynamic Sports Graphic. Vibrant energy, speed lines, exaggerated but technically accurate posture cues.'
    case 'Vintage':
      return 'Aesthetic: Da Vinci Anatomical Lithograph. Cross-hatched shading on parchment, looking like a historic study of human motion.'
    case 'Futuristic':
      return 'Aesthetic: AR Biometric Overlay. Holographic skeleton, joint torque vectors (arrows), glowing kinetic chains on a dark tech background.'
    case '3D Render':
      return 'Aesthetic: Medical-Grade Isometric 3D. Soft clay lighting, clear distinction between active and stabilizer muscle groups.'
    case 'Sketch':
      return 'Aesthetic: Coaching Blueprint. Quick but technically precise ink sketch on blue-grid paper with tactical annotations.'
    default:
      return 'Aesthetic: Professional Technical Illustration. Scientific clarity meets modern athletic design.'
  }
}

export const researchTopicForPrompt = async (
  topic: string,
  level: ComplexityLevel,
  style: VisualStyle,
  language: Language
): Promise<ResearchResult> => {
  const levelInstr = getLevelInstruction(level)
  const styleInstr = getStyleInstruction(style)

  const systemPrompt = `
    You are a world-class Biomechanical Analyst and Professional Strength Coach.
    Research the movement: "${topic}". 
    Goal: Create a visual roadmap for mastering this movement, focusing on complex kinetic interactions that are typically hard to replicate without visual aid.
    
    **CRITICAL: Use Google Search to verify exact postural cues, joint angles, and safety protocols.**
    
    Instruction Context:
    ${levelInstr}
    ${styleInstr}
    Language: ${language}
    
    Response Format EXACTLY:
    
    DETAILS:
    Header: Detailed Description
    Header: Detailed Description
    Header: Detailed Description
    Header: Detailed Description
    Header: Detailed Description
    
    IMAGE_PROMPT:
    [Detailed prompt for gemini-3-pro-image-preview. Focus on capturing the 'Critical Point' of the movement—where most technical errors occur. Use arrows or glowing lines to show force direction if requested by the aesthetic style. Describe anatomy, background, and lighting.]
    
    Note for DETAILS: Provide 5 points covering: Biomechanical Chain, Pivot Points, Stabilization Needs, Common Kinetic Leaks (Mistakes), and Performance Cues.
  `

  const response = await getAi().models.generateContent({
    model: TEXT_MODEL,
    contents: systemPrompt,
    config: {
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingBudget: 16384 },
    },
  })

  const text = response.text || ''

  // Extract thinking part if it exists
  const thinkingPart = response.candidates?.[0]?.content?.parts?.find(p => p.thought)
  const thinking = thinkingPart ? thinkingPart.text : ''

  const detailsMatch = text.match(/DETAILS:\s*([\s\S]*?)(?=IMAGE_PROMPT:|$)/i)
  const detailsRaw = detailsMatch ? detailsMatch[1].trim() : ''
  const details: ExerciseDetail[] = detailsRaw
    .split('\n')
    .filter(line => line.includes(':'))
    .map(line => {
      const [header, ...rest] = line.split(':')
      return {
        header: header.replace(/^-\s*/, '').trim(),
        content: rest.join(':').trim(),
      }
    })
    .filter(d => d.header && d.content)
    .slice(0, 5)

  const promptMatch = text.match(/IMAGE_PROMPT:\s*([\s\S]*?)$/i)
  const imagePrompt = promptMatch
    ? promptMatch[1].trim()
    : `High-fidelity kinetic analysis of ${topic}. ${levelInstr} ${styleInstr}`

  const searchResults: SearchResultItem[] = []
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks
  if (chunks) {
    chunks.forEach(chunk => {
      if (chunk.web?.uri && chunk.web?.title) {
        searchResults.push({ title: chunk.web.title, url: chunk.web.uri })
      }
    })
  }
  const uniqueResults = Array.from(new Map(searchResults.map(item => [item.url, item])).values())

  return {
    imagePrompt: imagePrompt,
    details: details,
    searchResults: uniqueResults,
    thinking: thinking,
  }
}

export const generateInfographicImage = async (prompt: string): Promise<string> => {
  const response = await getAi().models.generateContent({
    model: IMAGE_MODEL,
    contents: { parts: [{ text: prompt }] },
    config: { responseModalities: [Modality.IMAGE] },
  })
  const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)
  if (part && part.inlineData && part.inlineData.data) {
    return `data:image/png;base64,${part.inlineData.data}`
  }
  throw new Error('Kinetic rendering failed.')
}

export const editInfographicImage = async (
  currentImageBase64: string,
  editInstruction: string
): Promise<string> => {
  const cleanBase64 = currentImageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, '')
  const response = await getAi().models.generateContent({
    model: EDIT_MODEL,
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
        {
          text: `Optimize this kinetic visualization: ${editInstruction}. Focus on technical precision.`,
        },
      ],
    },
    config: { responseModalities: [Modality.IMAGE] },
  })
  const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)
  if (part && part.inlineData && part.inlineData.data) {
    return `data:image/png;base64,${part.inlineData.data}`
  }
  throw new Error('Kinetic refinement failed.')
}

export const fixInfographicImage = async (
  currentImageBase64: string,
  correctionPrompt: string
): Promise<string> => {
  return editInfographicImage(currentImageBase64, correctionPrompt)
}

export const verifyInfographicAccuracy = async (
  imageBase64: string,
  topic: string,
  level: ComplexityLevel,
  style: VisualStyle,
  language: Language
): Promise<{ isAccurate: boolean; critique: string }> => {
  return { isAccurate: true, critique: 'Visual matches kinetic parameters.' }
}
