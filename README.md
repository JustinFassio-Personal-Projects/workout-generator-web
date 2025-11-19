# Workout Generator - Modern Landing Page

A modern, single-page landing site built with Next.js 14 App Router featuring a hyper-modern glass morphism design.

## Features

- **Hero Section** - Eye-catching hero with gradient text, CTA buttons, and floating icons
- **Features Section** - Grid layout showcasing key features with glass morphism cards
- **Journey Section** - Interactive timeline with expandable step cards
- **Testimonials Section** - Carousel slider with auto-play functionality
- **Pricing Section** - Three-tier pricing plans with highlighted popular option
- **Footer** - Comprehensive footer with navigation, social links, and newsletter signup

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + SCSS Modules
- **Icons**: Lucide React
- **Animations**: AOS (Animate On Scroll)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

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
│   ├── sections/                # Section components
│   └── ui/                      # Reusable UI components
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
