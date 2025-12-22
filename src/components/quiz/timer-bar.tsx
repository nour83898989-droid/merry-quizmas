'use client';

import { useEffect, useState, useRef } from 'react';

interface TimerBarProps {
  duration: number; // Total duration in seconds
  onTimeout?: () => void;
  isPaused?: boolean;
  warningThreshold?: number; // Seconds remaining to show warning (default 5)
}

export function TimerBar({
  duration,
  onTimeout,
  isPaused = false,
  warningThreshold = 5,
}: TimerBarProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const startTimeRef = useRef<number | null>(null);
  
  // Initialize start time on first render
  useEffect(() => {
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }
  }, []);

  useEffect(() => {
    if (isPaused) return;
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
    }

    const interval = setInterval(() => {
      const elapsed = (Date.now() - (startTimeRef.current ?? Date.now())) / 1000;
      const remaining = Math.max(0, duration - elapsed);
      
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onTimeout?.();
      }
    }, 100); // Update every 100ms for smooth animation

    return () => clearInterval(interval);
  }, [duration, isPaused, onTimeout]);

  const progress = (timeRemaining / duration) * 100;
  const isWarning = timeRemaining <= warningThreshold;
  const isCritical = timeRemaining <= 2;

  // Determine color based on time remaining
  const getBarColor = () => {
    if (isCritical) return 'bg-error';
    if (isWarning) return 'bg-warning';
    if (progress > 66) return 'bg-primary';
    if (progress > 33) return 'bg-warning';
    return 'bg-error';
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-foreground-muted">Time Remaining</span>
        <span 
          className={`
            text-lg font-bold tabular-nums
            ${isWarning ? 'text-error animate-pulse' : 'text-foreground'}
          `}
        >
          {Math.ceil(timeRemaining)}s
        </span>
      </div>
      
      <div className="h-2 bg-surface rounded-full overflow-hidden border border-foreground/10">
        <div
          className={`
            h-full rounded-full transition-all duration-100 ease-linear
            ${getBarColor()}
            ${isWarning ? 'animate-pulse' : ''}
          `}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
