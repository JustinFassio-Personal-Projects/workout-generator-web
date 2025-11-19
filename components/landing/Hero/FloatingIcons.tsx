'use client'

import React, { useState, useEffect } from 'react'
import { Dumbbell, Activity, Target, Zap, Heart, TrendingUp, Award, Flame } from 'lucide-react'

const icons = [Dumbbell, Activity, Target, Zap, Heart, Heart, Heart, TrendingUp, Award, Flame]

interface IconPosition {
  top: number
  left: number
  animationDelay: number
  duration: number
}

export const FloatingIcons: React.FC = () => {
  // Only generate positions on client to avoid hydration mismatch
  const [iconPositions, setIconPositions] = useState<IconPosition[]>([])

  useEffect(() => {
    // Generate positions only on client side
    setIconPositions(
      icons.map(() => ({
        top: Math.random() * 80 + 10, // 10% to 90% to avoid edges
        left: Math.random() * 80 + 10,
        animationDelay: Math.random() * 2,
        duration: 6 + Math.random() * 4,
      }))
    )
  }, [])

  // Don't render until positions are generated (client-side only)
  if (iconPositions.length === 0) {
    return null
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {icons.map((Icon, index) => {
        const position = iconPositions[index]

        return (
          <div
            key={index}
            className="absolute opacity-20 pointer-events-none animate-float"
            style={{
              top: `${position.top}%`,
              left: `${position.left}%`,
              animationDelay: `${position.animationDelay}s`,
              animationDuration: `${position.duration}s`,
              color: '#84cc16', // accent color
            }}
          >
            <Icon size={24} className="drop-shadow-[0_0_10px_rgba(132,204,22,0.3)]" />
          </div>
        )
      })}
    </div>
  )
}
