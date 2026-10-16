import React, { useRef, useState, useEffect } from 'react';

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  glowColor?: string;
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  onClick,
  glowColor = 'rgba(56, 189, 248, 0.15)',
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [glowPosition, setGlowPosition] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [canTilt, setCanTilt] = useState(true);

  useEffect(() => {
    // Respect reduced motion or touch devices
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (media.matches || isTouch) {
      setCanTilt(false);
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canTilt || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -4;
    const rotateY = ((x - centerX) / centerX) * 4;

    setRotation({ x: rotateX, y: rotateY });
    setGlowPosition({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100,
    });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotation({ x: 0, y: 0 });
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: canTilt && isHovered
          ? `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) translateY(-2px)`
          : 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)',
        transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className={`relative overflow-hidden rounded-xl border border-white/[0.08] bg-slate-900/50 backdrop-blur-md transition-all duration-300 ${
        isHovered ? 'shadow-[0_16px_36px_-12px_rgba(0,0,0,0.8)] border-cyan-500/30' : 'shadow-md'
      } ${className}`}
    >
      {/* Dynamic ambient highlight */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(circle 260px at ${glowPosition.x}% ${glowPosition.y}%, ${glowColor}, transparent 70%)`,
        }}
      />
      {children}
    </div>
  );
};
