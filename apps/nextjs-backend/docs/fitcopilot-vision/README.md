# Fitcopilot Vision - Reference Architecture Documentation

## Overview

**Fitcopilot Vision** is a professional-grade visual exercise engine that leverages Google Gemini 3 Pro models to generate biomechanically accurate visualizations of complex human movements. This reference architecture demonstrates advanced AI integration patterns, sophisticated UI/UX design, and real-time image generation workflows.

## Purpose

This reference app serves as a blueprint for implementing:

- **AI-powered visual generation** using Google Gemini models
- **Research-grounded content** via Google Search grounding
- **Interactive refinement workflows** for iterative image editing
- **Multi-level complexity adaptation** based on user expertise
- **Professional UI/UX patterns** for AI-powered applications

## Architecture

### Technology Stack

- **Frontend Framework**: React 19.2.0 + TypeScript
- **Build Tool**: Vite 6.2.0
- **AI SDK**: `@google/genai` v1.29.0
- **UI Components**: Lucide React icons
- **Styling**: Tailwind CSS with custom design system
- **Models**:
  - Text: `gemini-3-pro-preview` (research and prompt generation)
  - Image: `gemini-3-pro-image-preview` (visual generation and editing)

### Component Structure

```
_reference-architecture/fitcopilot-vision/
├── App.tsx                    # Main application orchestrator
├── components/
│   ├── IntroScreen.tsx        # Animated landing/intro experience
│   ├── Infographic.tsx        # Image display with edit controls
│   ├── Loading.tsx            # Multi-step loading states
│   ├── SearchResults.tsx      # Research results display
│   ├── ExerciseFAQ.tsx       # Exercise details/FAQ component
│   └── ThinkingProcess.tsx    # AI reasoning visualization
├── services/
│   └── geminiService.ts       # AI service layer abstraction
├── types.ts                   # TypeScript type definitions
└── vite.config.ts            # Build configuration
```

## Key Features

### 1. Visual Kinetics Engine

Generates high-fidelity 16:9 technical visualizations of human motion using the Gemini 3 Pro Image model. Renders complex postures with anatomical precision.

**Implementation Pattern:**

- Research phase → Prompt generation → Image generation → Refinement loop
- Base64 image handling for immediate display
- Image history management for iterative refinement

### 2. Grounded Biomechanical Research

Every query is researched via Google Search grounding before visualization. Verifies:

- Exact joint angles
- Postural cues
- Safety protocols
- Authoritative athletic/medical sources

**Implementation Pattern:**

```typescript
researchTopicForPrompt(topic, level, style, language)
  → Returns: ResearchResult with imagePrompt, details, searchResults
```

### 3. Interactive Technical Refinement

Users can refine existing visualizations using natural language commands:

- "Highlight the lumbar positioning"
- "Add vector arrows for force direction"
- "Show muscle engagement zones"

**Limitations:**

- Maximum 3 refinements per image
- Each refinement creates a new image in history

### 4. Adaptive Complexity Levels

The engine adapts output based on user expertise:

| Level                | Focus Areas                                                  |
| -------------------- | ------------------------------------------------------------ |
| **New to Exercise**  | Safety, baseline joint alignment, simplified kinetic paths   |
| **Some Experience**  | Load distribution, primary muscle groups, breathing sync     |
| **Advanced Athlete** | Complex force transmission, eccentric/concentric phases      |
| **Elite Athlete**    | Micro-corrections, explosive torque, efficiency optimization |

### 5. Visual Style Options

Multiple aesthetic frameworks for different learning styles:

- **Minimalist**: Clean vector anatomy, high-contrast lines
- **Realistic**: Hyper-realistic biomechanics, professional photoshoot quality
- **Cartoon**: Dynamic sports graphics, vibrant energy
- **Vintage**: Da Vinci anatomical lithograph style
- **Futuristic**: AR biometric overlay, holographic skeleton
- **3D Render**: Medical-grade isometric 3D
- **Sketch**: Coaching blueprint on grid paper

### 6. Multi-Language Support

Supports 10 languages: English, Spanish, French, German, Mandarin, Japanese, Hindi, Arabic, Portuguese, Russian

## Component Deep Dive

### App.tsx - Main Orchestrator

**Key Responsibilities:**

- State management for entire application
- API key validation and selection
- Workflow orchestration (research → generate → refine)
- Image history management
- Error handling and user feedback

**State Management Pattern:**

```typescript
- useState for local component state
- useRef for DOM references (scroll behavior)
- useEffect for side effects (dark mode, API key checking)
```

**Notable Features:**

- Auto-scroll to results when loading/generating
- Dark mode toggle with system preference
- API key modal with secure selection
- Loading states with step indicators
- Error recovery and user guidance

### IntroScreen.tsx - Landing Experience

**Purpose:** Animated introduction sequence that sets the tone for the application.

**Features:**

- Multi-phase animation sequence
- Globe visualization with data extraction effects
- Particle effects and scan lines
- Professional branding presentation
- Smooth transition to main app

**Animation Phases:**

1. Initial globe spin (0-1.2s)
2. Data extraction animation (1.2-4s)
3. Scan line effect (4-5.5s)
4. Ready state (5.5s+)

### Infographic.tsx - Image Display & Editing

**Key Features:**

- Fullscreen image viewing
- Zoom controls (0.5x - 4x)
- Download functionality
- Edit prompt input
- Refinement counter display
- Lock state after max refinements

**UI Patterns:**

- Overlay controls on hover
- Responsive image container
- Keyboard shortcuts support
- Smooth transitions

### Loading.tsx - Multi-Step Loading States

**Loading Steps:**

1. **Analyzing Biomechanics** - Research phase
2. **Mapping Kinetic Chains** - Image generation phase

**Features:**

- Step indicator with progress
- Educational facts display during loading
- Smooth transitions between steps
- Error state handling

### geminiService.ts - AI Service Layer

**Core Functions:**

1. **`researchTopicForPrompt()`**
   - Takes: topic, complexity level, visual style, language
   - Returns: ResearchResult with imagePrompt, details, searchResults
   - Uses: Gemini 3 Pro with Google Search grounding

2. **`generateInfographicImage()`**
   - Takes: image prompt
   - Returns: Base64 image data
   - Uses: Gemini 3 Pro Image model

3. **`editInfographicImage()`**
   - Takes: existing image (base64), edit prompt
   - Returns: Modified base64 image data
   - Uses: Gemini 3 Pro Image model with image editing

**Prompt Engineering:**

- System prompts tailored to complexity level
- Style instructions for visual aesthetics
- Language-specific formatting
- Safety and accuracy emphasis

## Design System

### Color Palette

**Primary Colors:**

- **Brand Green**: `#22c55e` - Primary actions, accents
- **Brand Lime**: `#84cc16` - Secondary actions, highlights
- **Deep Slate**: `#0a0e1a` - Dark background
- **White/Slate**: Light mode backgrounds

**Usage:**

- Gradient combinations: `from-brand-green to-brand-lime`
- Dark mode: `dark:bg-brand-dark`
- Accents: `text-brand-green dark:text-brand-lime`

### Typography

- **Display Font**: Used for branding and headers
- **Sans Font**: Body text and UI elements
- **Tracking**: Tight for headers, relaxed for body

### UI Patterns

**Cards:**

- Rounded corners (`rounded-xl`, `rounded-2xl`)
- Border styling: `border-2 border-brand-lime/50`
- Shadow effects: `shadow-2xl`
- Backdrop blur: `backdrop-blur-md`

**Buttons:**

- Gradient backgrounds for primary actions
- Hover scale effects: `hover:scale-[1.02]`
- Icon + text combinations
- Loading states

**Modals:**

- Fixed overlay with backdrop blur
- Centered content with max-width constraints
- Smooth animations: `animate-in fade-in duration-300`

## Integration Points

### API Key Management

**Pattern:**

```typescript
// Check for API key
window.aistudio?.hasSelectedApiKey()

// Open key selector
window.aistudio?.openSelectKey()
```

**Implementation:**

- Modal for key selection
- Error handling for missing/invalid keys
- Graceful degradation

### Google Search Grounding

**Usage:**

- Automatic research before image generation
- Search results displayed to users
- Verified sources for credibility

### Image Handling

**Format:** Base64 data URLs
**Storage:** In-memory state (imageHistory array)
**Operations:**

- Generate new images
- Edit existing images
- Download images
- Fullscreen viewing

## Cherry-Picking Opportunities

### UI Components

1. **IntroScreen Pattern**
   - Animated landing sequences
   - Multi-phase transitions
   - Professional branding presentation

2. **Loading States**
   - Multi-step progress indicators
   - Educational content during wait times
   - Smooth state transitions

3. **Image Display & Controls**
   - Fullscreen viewing
   - Zoom functionality
   - Overlay controls pattern

4. **Search Results Display**
   - Research credibility indicators
   - Source attribution
   - External link handling

### Service Layer Patterns

1. **AI Service Abstraction**
   - Clean separation of AI logic
   - Error handling patterns
   - Type-safe interfaces

2. **Prompt Engineering**
   - Complexity level adaptation
   - Style instruction templates
   - Multi-language support

3. **Image Generation Workflow**
   - Research → Generate → Refine pattern
   - Base64 handling
   - History management

### State Management

1. **Complex State Orchestration**
   - Multiple interdependent states
   - Loading state management
   - Error recovery patterns

2. **History Management**
   - Image history array
   - Refinement tracking
   - State persistence considerations

### Design System Elements

1. **Color System**
   - Brand color palette
   - Dark mode implementation
   - Gradient usage patterns

2. **Component Styling**
   - Card patterns
   - Button styles
   - Modal implementations

3. **Responsive Design**
   - Mobile-first approach
   - Breakpoint usage
   - Touch-friendly controls

## Implementation Considerations

### Prerequisites

- **Paid Google Cloud API Key** with billing enabled
- **Gemini 3 Pro access** (preview models)
- **Environment variables** for API keys

### Performance

- **Image Size**: Base64 encoding increases payload size
- **API Rate Limits**: Consider caching and throttling
- **Loading States**: Long generation times require good UX

### Error Handling

- API key validation
- Network error recovery
- Model availability checks
- User-friendly error messages

### Security

- API key management (never expose in client code)
- Secure key selection flow
- Input validation for prompts

## Future Enhancements

Potential improvements for production use:

1. **Caching Layer**
   - Cache generated images
   - Store research results
   - Reduce API calls

2. **User Accounts**
   - Save image history
   - Favorite exercises
   - Custom preferences

3. **Export Options**
   - Multiple image formats
   - PDF generation
   - Video export for sequences

4. **Advanced Editing**
   - More refinement iterations
   - Batch operations
   - Comparison views

5. **Analytics**
   - Usage tracking
   - Popular exercises
   - Performance metrics

## Related Documentation

- [Google Gemini API Documentation](https://ai.google.dev/)
- [Google Search Grounding](https://ai.google.dev/docs/grounding_with_google_search)
- [Vite Configuration](https://vitejs.dev/config/)
- [React 19 Features](https://react.dev/blog/2024/04/25/react-19)

---

**Note:** This is a reference architecture for learning and cherry-picking patterns. The actual implementation may require adjustments based on your specific use case and requirements.
