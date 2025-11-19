'use client'

import React from 'react'
import { LucideIcon } from 'lucide-react'
import classNames from 'classnames'
import styles from './Button.module.scss'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary'
  size?: 'sm' | 'md' | 'lg'
  icon?: LucideIcon
  iconPosition?: 'left' | 'right'
  loading?: boolean
  children: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  children,
  className,
  disabled,
  ...props
}) => {
  const buttonClasses = classNames(
    styles.button,
    styles[`button--${variant}`],
    styles[`button--${size}`],
    {
      [styles['button--loading']]: loading,
      [styles['button--disabled']]: disabled || loading,
    },
    className
  )

  return (
    <button className={buttonClasses} disabled={disabled || loading} {...props}>
      {loading ? (
        <span className={styles.spinner} />
      ) : (
        <>
          {Icon && iconPosition === 'left' && (
            <Icon
              className={styles['button__icon--left']}
              size={size === 'sm' ? 16 : size === 'md' ? 20 : 24}
            />
          )}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && (
            <Icon
              className={styles['button__icon--right']}
              size={size === 'sm' ? 16 : size === 'md' ? 20 : 24}
            />
          )}
        </>
      )}
    </button>
  )
}
