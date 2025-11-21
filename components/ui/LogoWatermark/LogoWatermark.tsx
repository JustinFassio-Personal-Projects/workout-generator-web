'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import styles from './LogoWatermark.module.scss'

interface LogoWatermarkProps {
  opacity?: number
  size?: number
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  rotation?: number
  className?: string
}

export const LogoWatermark: React.FC<LogoWatermarkProps> = ({
  opacity = 0.05,
  size = 300,
  position = 'center',
  rotation = 0,
  className = '',
}) => {
  const [logoError, setLogoError] = useState(false)

  if (logoError) {
    return null
  }

  const transformStyle =
    position === 'center'
      ? `translate(-50%, -50%) rotate(${rotation}deg)`
      : `rotate(${rotation}deg)`

  return (
    <div
      className={`${styles.watermark} ${styles[`watermark--${position}`]} ${className}`}
      style={{
        opacity,
        transform: transformStyle,
      }}
    >
      <Image
        src="/logo.png"
        alt=""
        width={size}
        height={size}
        className={styles.watermarkImage}
        unoptimized
        style={{ backgroundColor: 'transparent' }}
        onError={() => setLogoError(true)}
      />
    </div>
  )
}
