# Workout Generator - Modern Landing Page

A modern, single-page landing site built with Next.js 14 App Router featuring a hyper-modern glass morphism design.

## Features

- **Hero Section** - Eye-catching hero with gradient text, CTA buttons, and floating icons
- **Features Section** - Grid layout showcasing key features with glass morphism cards
- **Journey Section** - Interactive timeline with expandable step cards
- **Testimonials Section** - Carousel slider with auto-play functionality
- **Pricing Section** - Three-tier pricing plans with highlighted popular option
- **Chat Widget** - Floating AI chat assistant powered by ChatKit Studio
- **Footer** - Comprehensive footer with navigation, social links, and newsletter signup

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + SCSS Modules
- **Icons**: Lucide React
- **Animations**: AOS (Animate On Scroll)
- **Chat**: OpenAI ChatKit React (@openai/chatkit-react)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

Create a `.env.local` file in the root directory and add the following:

```bash
# Site Configuration
NEXT_PUBLIC_SITE_URL=https://workoutgenerator.com

# ChatKit Studio Configuration
# Get your workflow ID from https://widgets.chatkit.studio
NEXT_PUBLIC_CHATKIT_WORKFLOW_ID=wf_691f16921c608190858a647f4c8459b60da29e275dd77b81

# OpenAI API Configuration (required for ChatKit)
# Get your API key from https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here
```

**Note**: The ChatWidget component will not display if `NEXT_PUBLIC_CHATKIT_CLIENT_TOKEN` is not set. You can get your credentials from [ChatKit Studio](https://widgets.chatkit.studio).

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
Workout Generator/
├── app/
│   ├── layout.tsx              # Root layout with metadata
│   ├── page.tsx                 # Main page with all sections
│   └── globals.scss             # Global styles
├── components/
│   ├── landing/                 # Landing page sections
│   └── ui/                      # Reusable UI components
│       └── ChatWidget/          # Floating chat widget
├── data/                        # Static data files
├── styles/
│   └── design-system/           # Design tokens and system files
└── public/                      # Static assets
```

## Design System

The project uses a comprehensive design system with:

- CSS custom properties for colors and tokens
- Glass morphism effects throughout
- Responsive breakpoints
- Smooth animations and transitions

## Deployment

The project is ready for deployment on Vercel:

1. Push your code to GitHub
2. Import the project in Vercel
3. Deploy automatically on push

## License

ISC
