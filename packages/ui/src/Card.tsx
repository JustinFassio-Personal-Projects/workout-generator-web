import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'strong' | 'elevated';
  hover?: boolean;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  hover = true,
  children,
  className,
  ...props
}) => {
  const baseStyles = 'rounded-lg border transition-all';
  const variants = {
    default: 'bg-zinc-900/80 border-zinc-700/50 text-zinc-100',
    strong: 'bg-zinc-800 border-zinc-600 text-zinc-100',
    elevated: 'bg-zinc-800 border-zinc-600 shadow-xl shadow-black/20 text-zinc-100',
  };
  const hoverStyles = hover
    ? 'hover:border-zinc-500/70 hover:bg-zinc-800/90 cursor-default'
    : '';

  return (
    <div
      className={twMerge(clsx(baseStyles, variants[variant], hoverStyles), className)}
      data-variant={variant}
      {...props}
    >
      {children}
    </div>
  );
};
