import React, { useEffect, useRef, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import { CheckCircle2, AlertTriangle, Play } from 'lucide-react';
import { Button } from './Button';

type ListItem = string | { label: string; icon?: React.ReactNode };

export interface InstructionModalProps {
  title: string;
  items: ListItem[];
  onStart: () => void;
  onBack?: () => void;
  warningText?: string;
  startLabel?: string;
  description?: string;
  variant?: 'blue' | 'yellow' | 'green' | 'purple';
  icon?: React.ReactNode;
  iconClassName?: string;
  footer?: React.ReactNode;
}

const variantStyles = {
  blue: 'bg-blue-600 hover:bg-blue-700',
  yellow: 'bg-yellow-600 hover:bg-yellow-700 text-white border-none',
  green: 'bg-green-600 hover:bg-green-700',
  purple: 'bg-purple-600 hover:bg-purple-700',
};

export const InstructionModal: React.FC<InstructionModalProps> = ({
  title,
  items,
  onStart,
  onBack,
  warningText,
  startLabel = 'Start Session',
  description,
  variant = 'blue',
  icon,
  iconClassName,
  footer,
}) => {
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Trigger animation on mount
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Focus start button on mount
  useEffect(() => {
    startButtonRef.current?.focus();
  }, []);

  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onBack) {
        onBack();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onBack]);

  return (
    <FocusTrap>
      <div 
        className={`absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="instruction-modal-title"
        aria-describedby="instruction-modal-content"
      >
        <div className={`max-w-md space-y-6 transition-all duration-300 ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
          {/* Icon */}
          {icon && (
            <div className={iconClassName || "w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto"}>
              {icon}
            </div>
          )}
          
          {/* Title */}
          <h2 id="instruction-modal-title" className="text-3xl font-bold text-white">
            {title}
          </h2>
          
          {/* Content */}
          <div id="instruction-modal-content">
            {description && (
              <p className="text-left text-zinc-300">{description}</p>
            )}
            {items.length > 0 && (
              <ul className="text-left space-y-3 text-zinc-300">
                {items.map((item) => {
                  const isString = typeof item === 'string';
                  const label = isString ? item : item.label;
                  const itemIcon = isString ? <CheckCircle2 className="w-5 h-5 mr-2 text-blue-500 shrink-0" /> : (item.icon || <CheckCircle2 className="w-5 h-5 mr-2 text-blue-500 shrink-0" />);
                  
                  return (
                    <li key={label} className="flex items-start">
                      {itemIcon}
                      {label}
                    </li>
                  );
                })}
              </ul>
            )}
            {warningText && (
              <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-left">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-200">
                    <strong>Warning:</strong> {warningText}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          {footer && <div className="text-left">{footer}</div>}
          
          {/* Buttons */}
          {onBack && (
            <Button 
              onClick={onBack} 
              variant="ghost" 
              size="md" 
              className="w-full text-zinc-400 hover:text-white"
            >
              Back
            </Button>
          )}
          <Button 
            ref={startButtonRef}
            onClick={onStart} 
            size="lg" 
            className={`w-full ${variantStyles[variant]}`}
          >
            {startLabel} <Play className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    </FocusTrap>
  );
};
