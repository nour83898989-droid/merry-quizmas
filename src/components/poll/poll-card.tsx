'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PollOption {
  index: number;
  text: string;
  votes: number;
}

interface PollCardProps {
  id: string;
  title: string;
  description?: string | null;
  options: PollOption[];
  totalVotes: number;
  endsAt?: string | null;
  isMultipleChoice?: boolean;
  hasVoted?: boolean;
  votedOptions?: number[];
  onVote?: (optionIndexes: number[]) => void;
  onClick?: () => void;
  showResults?: boolean;
}

export function PollCard({
  title,
  description,
  options,
  totalVotes,
  endsAt,
  isMultipleChoice,
  hasVoted,
  votedOptions = [],
  onVote,
  onClick,
  showResults = false,
}: PollCardProps) {
  const isEnded = endsAt ? new Date(endsAt) < new Date() : false;
  const shouldShowResults = showResults || hasVoted || isEnded;

  const getTimeLeft = () => {
    if (!endsAt) return null;
    const end = new Date(endsAt);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ended';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d left`;
    }
    return `${hours}h ${minutes}m left`;
  };

  return (
    <Card 
      className="christmas-card cursor-pointer hover:scale-[1.01] transition-transform"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">📊</span>
            <h3 className="font-semibold text-foreground line-clamp-1">{title}</h3>
          </div>
          {description && (
            <p className="text-sm text-foreground-muted line-clamp-2">{description}</p>
          )}
        </div>
        {isMultipleChoice && (
          <span className="px-2 py-0.5 text-xs bg-primary/20 text-primary rounded-full">
            Multi
          </span>
        )}
      </div>

      {/* Options */}
      <div className="space-y-2 mb-3">
        {options.slice(0, 4).map((option) => {
          const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
          const isVoted = votedOptions.includes(option.index);

          return (
            <div
              key={option.index}
              className={`relative rounded-lg overflow-hidden ${
                isVoted ? 'ring-2 ring-primary' : ''
              }`}
            >
              {shouldShowResults && (
                <div
                  className="absolute inset-0 bg-primary/20 transition-all"
                  style={{ width: `${percentage}%` }}
                />
              )}
              <div className="relative px-3 py-2 flex items-center justify-between bg-surface/50">
                <span className="text-sm text-foreground">{option.text}</span>
                {shouldShowResults && (
                  <span className="text-xs font-medium text-foreground-muted">
                    {percentage.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {options.length > 4 && (
          <p className="text-xs text-foreground-muted text-center">
            +{options.length - 4} more options
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-foreground/10">
        <div className="flex items-center gap-3 text-xs text-foreground-muted">
          <span>🗳️ {totalVotes} votes</span>
          {getTimeLeft() && <span>⏱️ {getTimeLeft()}</span>}
        </div>
        {!hasVoted && !isEnded && onVote && (
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); }}>
            Vote
          </Button>
        )}
      </div>
    </Card>
  );
}
