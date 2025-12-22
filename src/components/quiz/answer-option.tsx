'use client';

interface AnswerOptionProps {
  index: number;
  text: string;
  isSelected: boolean;
  isCorrect?: boolean; // Only shown after submission
  isRevealed?: boolean; // Whether to show correct/incorrect state
  disabled?: boolean;
  onSelect: () => void;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

export function AnswerOption({
  index,
  text,
  isSelected,
  isCorrect,
  isRevealed = false,
  disabled = false,
  onSelect,
}: AnswerOptionProps) {
  const label = OPTION_LABELS[index] || String(index + 1);

  const getStateStyles = () => {
    if (isRevealed) {
      if (isCorrect) {
        return 'border-success bg-success/10 text-success';
      }
      if (isSelected && !isCorrect) {
        return 'border-error bg-error/10 text-error';
      }
    }
    
    if (isSelected) {
      return 'border-primary bg-primary/10 shadow-[0_0_0_2px_rgba(99,102,241,0.3)]';
    }
    
    return 'border-foreground/20 hover:border-foreground/40 hover:bg-surface';
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`
        w-full min-h-[56px] p-4
        flex items-center gap-4
        border-2 rounded-xl
        text-left
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-[0.98]
        ${getStateStyles()}
      `}
    >
      <span 
        className={`
          flex-shrink-0 w-10 h-10
          flex items-center justify-center
          rounded-lg font-bold text-lg
          ${isSelected 
            ? 'bg-primary text-white' 
            : 'bg-foreground/10 text-foreground'
          }
          ${isRevealed && isCorrect ? 'bg-success text-white' : ''}
          ${isRevealed && isSelected && !isCorrect ? 'bg-error text-white' : ''}
        `}
      >
        {label}
      </span>
      
      <span className="flex-1 text-foreground font-medium">
        {text}
      </span>

      {isRevealed && (
        <span className="flex-shrink-0">
          {isCorrect ? (
            <CheckIcon className="w-6 h-6 text-success" />
          ) : isSelected ? (
            <XIcon className="w-6 h-6 text-error" />
          ) : null}
        </span>
      )}
    </button>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
