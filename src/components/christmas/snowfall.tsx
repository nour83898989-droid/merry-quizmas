'use client';

interface Snowflake {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  opacity: number;
}

// Pre-generate snowflakes data outside component for purity
const SNOWFLAKES_DATA: Snowflake[] = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  left: (i * 1.25) % 100,
  delay: (i * 0.125) % 10,
  duration: 8 + (i % 12),
  size: 2 + (i % 6),
  opacity: 0.4 + ((i % 6) * 0.1),
}));

export function Snowfall() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-20">
      {SNOWFLAKES_DATA.map((flake) => (
        <div
          key={flake.id}
          className="absolute rounded-full"
          style={{
            left: `${flake.left}%`,
            top: '-20px',
            width: `${flake.size}px`,
            height: `${flake.size}px`,
            backgroundColor: 'white',
            opacity: flake.opacity,
            boxShadow: '0 0 4px rgba(255, 255, 255, 0.8)',
            animation: `snowfall ${flake.duration}s linear infinite`,
            animationDelay: `${flake.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
