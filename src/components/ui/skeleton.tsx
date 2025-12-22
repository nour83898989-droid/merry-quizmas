'use client';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const variantStyles = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={`
        bg-foreground/10
        ${variantStyles[variant]}
        ${animationStyles[animation]}
        ${className}
      `}
      style={style}
    />
  );
}

// Pre-built skeleton components for common use cases
export function SkeletonCard() {
  return (
    <div className="bg-surface rounded-xl p-4 space-y-3">
      <Skeleton height={20} width="75%" />
      <Skeleton height={16} width="50%" />
      <div className="flex gap-4 pt-4 border-t border-foreground/10">
        <Skeleton height={16} width={80} />
        <Skeleton height={16} width={100} />
      </div>
    </div>
  );
}

export function SkeletonQuizCard() {
  return (
    <div className="bg-surface rounded-xl p-4 space-y-3">
      <div className="flex justify-between">
        <Skeleton height={24} width="60%" />
        <Skeleton height={20} width={60} variant="text" />
      </div>
      <Skeleton height={16} width="80%" />
      <div className="flex gap-4 pt-4 border-t border-foreground/10">
        <Skeleton height={16} width={100} />
        <Skeleton height={16} width={80} />
        <Skeleton height={16} width={60} className="ml-auto" />
      </div>
    </div>
  );
}

export function SkeletonButton({ fullWidth = false }: { fullWidth?: boolean }) {
  return (
    <Skeleton 
      height={44} 
      width={fullWidth ? '100%' : 120} 
      className="rounded-lg"
    />
  );
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return (
    <Skeleton 
      variant="circular" 
      width={size} 
      height={size} 
    />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton 
          key={i} 
          height={16} 
          width={i === lines - 1 ? '60%' : '100%'} 
          variant="text"
        />
      ))}
    </div>
  );
}
