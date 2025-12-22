'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className = '',
      label,
      error,
      helperText,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full h-11 px-4
            bg-surface border rounded-lg
            text-foreground placeholder:text-foreground-muted
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error 
              ? 'border-error focus:ring-error/50 focus:border-error' 
              : 'border-foreground/20 hover:border-foreground/40'
            }
            ${className}
          `}
          {...props}
        />
        {(error || helperText) && (
          <p className={`mt-1.5 text-sm ${error ? 'text-error' : 'text-foreground-muted'}`}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className = '',
      label,
      error,
      helperText,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`
            w-full min-h-[100px] px-4 py-3
            bg-surface border rounded-lg
            text-foreground placeholder:text-foreground-muted
            transition-all duration-200 resize-y
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error 
              ? 'border-error focus:ring-error/50 focus:border-error' 
              : 'border-foreground/20 hover:border-foreground/40'
            }
            ${className}
          `}
          {...props}
        />
        {(error || helperText) && (
          <p className={`mt-1.5 text-sm ${error ? 'text-error' : 'text-foreground-muted'}`}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
