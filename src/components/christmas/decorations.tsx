'use client';

export function ChristmasLights() {
  const colors = ['#ef4444', '#22c55e', '#fbbf24', '#3b82f6', '#ec4899'];
  
  return (
    <div className="flex justify-center gap-4 py-2">
      {colors.map((color, i) => (
        <div
          key={i}
          className="w-3 h-3 rounded-full animate-twinkle"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}`,
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}

export function ChristmasTree({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      {/* Tree */}
      <polygon points="32,4 48,24 40,24 52,40 42,40 56,56 8,56 22,40 12,40 24,24 16,24" fill="#165b33" />
      {/* Trunk */}
      <rect x="28" y="56" width="8" height="6" fill="#8B4513" />
      {/* Star */}
      <polygon points="32,2 33,6 37,6 34,9 35,13 32,10 29,13 30,9 27,6 31,6" fill="#ffd700" />
      {/* Ornaments */}
      <circle cx="28" cy="20" r="2" fill="#ef4444" />
      <circle cx="36" cy="28" r="2" fill="#3b82f6" />
      <circle cx="24" cy="36" r="2" fill="#fbbf24" />
      <circle cx="40" cy="44" r="2" fill="#ec4899" />
      <circle cx="32" cy="48" r="2" fill="#22c55e" />
    </svg>
  );
}

export function Gift({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      {/* Box */}
      <rect x="8" y="24" width="48" height="36" fill="#ef4444" rx="2" />
      {/* Lid */}
      <rect x="4" y="16" width="56" height="12" fill="#c41e3a" rx="2" />
      {/* Ribbon vertical */}
      <rect x="28" y="16" width="8" height="44" fill="#ffd700" />
      {/* Ribbon horizontal */}
      <rect x="4" y="18" width="56" height="6" fill="#ffd700" />
      {/* Bow */}
      <ellipse cx="32" cy="14" rx="8" ry="6" fill="#ffd700" />
      <circle cx="32" cy="14" r="3" fill="#ffed4a" />
    </svg>
  );
}

export function Stocking({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      {/* Stocking body */}
      <path
        d="M20 8 L44 8 L44 28 L52 48 C54 54 50 58 44 58 L28 58 C22 58 18 54 20 48 L28 28 L20 28 Z"
        fill="#ef4444"
      />
      {/* White trim */}
      <rect x="18" y="6" width="28" height="8" rx="4" fill="white" />
      {/* Decorations */}
      <circle cx="32" cy="24" r="2" fill="#22c55e" />
      <circle cx="38" cy="36" r="2" fill="#ffd700" />
      <circle cx="34" cy="48" r="2" fill="white" />
    </svg>
  );
}

export function Santa({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      {/* Face */}
      <circle cx="32" cy="36" r="16" fill="#fcd5b8" />
      {/* Hat */}
      <path d="M16 32 L32 8 L48 32 Z" fill="#ef4444" />
      <rect x="14" y="30" width="36" height="6" rx="3" fill="white" />
      <circle cx="32" cy="10" r="4" fill="white" />
      {/* Beard */}
      <ellipse cx="32" cy="48" rx="14" ry="10" fill="white" />
      {/* Eyes */}
      <circle cx="26" cy="34" r="2" fill="#333" />
      <circle cx="38" cy="34" r="2" fill="#333" />
      {/* Nose */}
      <circle cx="32" cy="38" r="3" fill="#ef9a9a" />
      {/* Cheeks */}
      <circle cx="22" cy="40" r="3" fill="#ffcdd2" />
      <circle cx="42" cy="40" r="3" fill="#ffcdd2" />
    </svg>
  );
}

export function Snowman({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      {/* Body */}
      <circle cx="32" cy="50" r="12" fill="white" stroke="#e0e0e0" strokeWidth="1" />
      <circle cx="32" cy="32" r="10" fill="white" stroke="#e0e0e0" strokeWidth="1" />
      <circle cx="32" cy="16" r="8" fill="white" stroke="#e0e0e0" strokeWidth="1" />
      {/* Hat */}
      <rect x="24" y="4" width="16" height="6" fill="#333" />
      <rect x="22" y="8" width="20" height="3" fill="#333" />
      {/* Eyes */}
      <circle cx="28" cy="14" r="1.5" fill="#333" />
      <circle cx="36" cy="14" r="1.5" fill="#333" />
      {/* Nose */}
      <polygon points="32,16 32,18 38,17" fill="#ff9800" />
      {/* Buttons */}
      <circle cx="32" cy="28" r="1.5" fill="#333" />
      <circle cx="32" cy="34" r="1.5" fill="#333" />
      <circle cx="32" cy="40" r="1.5" fill="#333" />
      {/* Scarf */}
      <rect x="22" y="22" width="20" height="4" rx="2" fill="#ef4444" />
      <rect x="38" y="22" width="4" height="12" rx="2" fill="#ef4444" />
    </svg>
  );
}

export function CandyCane({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      <path
        d="M32 56 L32 24 C32 16 40 8 48 8 C56 8 56 16 48 16 C44 16 40 20 40 24"
        stroke="#ef4444"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M32 56 L32 24 C32 16 40 8 48 8 C56 8 56 16 48 16 C44 16 40 20 40 24"
        stroke="white"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray="8 8"
        fill="none"
      />
    </svg>
  );
}

export function Bell({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      {/* Bell body */}
      <path
        d="M32 8 C20 8 12 20 12 32 L12 44 L52 44 L52 32 C52 20 44 8 32 8"
        fill="#ffd700"
      />
      {/* Bell bottom */}
      <ellipse cx="32" cy="44" rx="22" ry="6" fill="#ffd700" />
      {/* Clapper */}
      <circle cx="32" cy="52" r="4" fill="#8B4513" />
      {/* Ribbon */}
      <rect x="28" y="4" width="8" height="8" rx="2" fill="#ef4444" />
      {/* Shine */}
      <ellipse cx="24" cy="28" rx="4" ry="8" fill="#ffed4a" opacity="0.5" />
    </svg>
  );
}

export function Wreath({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      {/* Wreath circle */}
      <circle cx="32" cy="32" r="20" stroke="#165b33" strokeWidth="12" fill="none" />
      {/* Berries */}
      <circle cx="32" cy="12" r="3" fill="#ef4444" />
      <circle cx="28" cy="14" r="2" fill="#ef4444" />
      <circle cx="36" cy="14" r="2" fill="#ef4444" />
      {/* Bow */}
      <ellipse cx="26" cy="52" rx="6" ry="4" fill="#ef4444" />
      <ellipse cx="38" cy="52" rx="6" ry="4" fill="#ef4444" />
      <circle cx="32" cy="52" r="3" fill="#c41e3a" />
      {/* Ribbon tails */}
      <rect x="28" y="54" width="3" height="8" rx="1" fill="#ef4444" />
      <rect x="33" y="54" width="3" height="8" rx="1" fill="#ef4444" />
    </svg>
  );
}

export function ChristmasBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute -top-2 left-0 right-0">
        <ChristmasLights />
      </div>
      <div className="christmas-card rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-20 h-20 opacity-10">
          <ChristmasTree className="w-full h-full" />
        </div>
        {children}
      </div>
    </div>
  );
}

// Floating decorations for background
export function FloatingDecorations() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Left side decorations */}
      <div className="absolute top-20 left-4 opacity-20 animate-float">
        <Santa className="w-16 h-16" />
      </div>
      <div className="absolute top-1/3 left-2 opacity-15 animate-float-delayed">
        <Stocking className="w-12 h-12" />
      </div>
      <div className="absolute bottom-1/4 left-6 opacity-20 animate-float">
        <CandyCane className="w-10 h-10" />
      </div>
      
      {/* Right side decorations */}
      <div className="absolute top-32 right-4 opacity-20 animate-float-delayed">
        <ChristmasTree className="w-14 h-14" />
      </div>
      <div className="absolute top-1/2 right-2 opacity-15 animate-float">
        <Gift className="w-12 h-12" />
      </div>
      <div className="absolute bottom-1/3 right-6 opacity-20 animate-float-delayed">
        <Bell className="w-10 h-10" />
      </div>
      
      {/* Bottom decorations */}
      <div className="absolute bottom-20 left-1/4 opacity-15 animate-float">
        <Snowman className="w-14 h-14" />
      </div>
      <div className="absolute bottom-16 right-1/4 opacity-15 animate-float-delayed">
        <Wreath className="w-12 h-12" />
      </div>
    </div>
  );
}

// Christmas background pattern
export function ChristmasBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 christmas-bg-pattern opacity-5" />
  );
}
