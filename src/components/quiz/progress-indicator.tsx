'use client';

interface ProgressIndicatorProps {
  current: number;
  total: number;
  showDots?: boolean;
}

export function ProgressIndicator({
  current,
  total,
  showDots = false,
}: ProgressIndicatorProps) {
  const progress = (current / total) * 100;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-foreground-muted">Progress</span>
        <span className="text-sm font-medium text-foreground">
          {current} of {total}
        </span>
      </div>

      {showDots ? (
        <div className="flex gap-2 justify-center">
          {Array.from({ length: total }, (_, i) => (
            <div
              key={i}
              className={`
                w-3 h-3 rounded-full transition-all duration-300
                ${i < current 
                  ? 'bg-success' 
                  : i === current 
                    ? 'bg-primary scale-125' 
                    : 'bg-foreground/20'
                }
              `}
            />
          ))}
        </div>
      ) : (
        <div className="h-2 bg-surface rounded-full overflow-hidden border border-foreground/10">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
