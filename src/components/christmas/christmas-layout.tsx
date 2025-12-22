'use client';

import { Snowfall } from './snowfall';
import { FloatingDecorations } from './decorations';
import { Navbar } from '@/components/layout/navbar';

interface ChristmasLayoutProps {
  children: React.ReactNode;
  showSnow?: boolean;
  showDecorations?: boolean;
  showNavbar?: boolean;
}

// Pre-generate stars data outside component for purity
const STARS_DATA = Array.from({ length: 50 }, (_, i) => ({
  id: i,
  left: (i * 17 + 7) % 100,
  top: (i * 13 + 5) % 60,
  size: 1 + (i % 3),
  isGold: i % 5 === 0,
  delay: (i * 0.2) % 3,
  duration: 2 + (i % 3),
}));

// Stars background component
function StarryNight() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Static stars */}
      {STARS_DATA.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full animate-twinkle"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            backgroundColor: star.isGold ? '#fbbf24' : 'white',
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        />
      ))}
      {/* Moon */}
      <div 
        className="absolute top-8 right-12 w-16 h-16 rounded-full"
        style={{
          background: 'radial-gradient(circle at 30% 30%, #fef3c7 0%, #fcd34d 50%, #f59e0b 100%)',
          boxShadow: '0 0 40px rgba(251, 191, 36, 0.4)',
        }}
      />
    </div>
  );
}

export function ChristmasLayout({ 
  children, 
  showSnow = true, 
  showDecorations = true,
  showNavbar = true,
}: ChristmasLayoutProps) {
  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(to bottom, #0a1628 0%, #1a2744 50%, #0f1f3d 100%)' }}>
      {/* Starry night background */}
      <StarryNight />
      
      {/* Snow effect */}
      {showSnow && <Snowfall />}
      
      {/* Floating decorations */}
      {showDecorations && <FloatingDecorations />}
      
      {/* Navbar */}
      {showNavbar && <Navbar />}
      
      {/* Main content */}
      <div className="relative z-10">
        {children}
      </div>
      
      {/* Bottom snow ground effect */}
      <div 
        className="fixed bottom-0 left-0 right-0 h-12 pointer-events-none z-0"
        style={{
          background: 'linear-gradient(to top, rgba(226, 232, 240, 0.3) 0%, transparent 100%)',
        }}
      />
    </div>
  );
}
