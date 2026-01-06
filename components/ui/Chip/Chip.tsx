'use client'

import React from 'react'
import classNames from 'classnames'
import styles from './Chip.module.scss'

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  children: React.ReactNode
}

export const Chip: React.FC<ChipProps> = ({ selected = false, children, className, ...props }) => {
  const chipClasses = classNames(
    styles.chip,
    {
      [styles['chip--selected']]: selected,
    },
    className
  )

  return (
    <button type="button" className={chipClasses} aria-pressed={selected} {...props}>
      {children}
    </button>
  )
}
