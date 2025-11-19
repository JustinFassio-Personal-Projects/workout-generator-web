'use client'

import React from 'react'
import classNames from 'classnames'
import styles from './Card.module.scss'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'strong' | 'elevated'
  hover?: boolean
  children: React.ReactNode
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  hover = true,
  children,
  className,
  ...props
}) => {
  const cardClasses = classNames(
    styles.card,
    styles[`card--${variant}`],
    {
      [styles['card--hover']]: hover,
    },
    className
  )

  return (
    <div className={cardClasses} {...props}>
      {children}
    </div>
  )
}

