import React, { useEffect, useState } from 'react';

interface MotionNumberProps {
  value: number;
  duration?: number;
  decimals?: number;
  currency?: string;
  className?: string;
}

export const MotionNumber: React.FC<MotionNumberProps> = ({
  value,
  duration = 800,
  decimals = 2,
  currency,
  className = '',
}) => {
  // Initialize directly to value so it never flashes or cycles through numbers from 0
  const [displayValue, setDisplayValue] = useState<number>(value);

  useEffect(() => {
    // If target value is 0, or if both are 0, immediately show 0 without animating through intermediate numbers!
    if (value === 0) {
      setDisplayValue(0);
      return;
    }

    // Respect reduced-motion preferences
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(value);
      return;
    }

    let startTimestamp: number | null = null;
    const startValue = displayValue;
    const targetValue = value;

    if (startValue === targetValue) return;

    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Smooth cubic-bezier easeOut curve
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (targetValue - startValue) * easeProgress;
      
      setDisplayValue(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setDisplayValue(targetValue);
      }
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value, duration]);

  const formatted = displayValue.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  // User-friendly currency symbols including Indian Rupee (INR)
  const getCurrencyPrefix = (curr?: string): string => {
    if (!curr) return '';
    const upper = curr.toUpperCase().trim();
    if (upper === 'INR' || upper === '₹') return '₹';
    if (upper === 'USD' || upper === '$') return '$';
    if (upper === 'EUR' || upper === '€') return '€';
    if (upper === 'GBP' || upper === '£') return '£';
    if (upper === 'JPY' || upper === '¥') return '¥';
    if (upper === 'CAD') return 'CA$';
    if (upper === 'AUD') return 'AU$';
    return `${curr} `;
  };

  return (
    <span className={`font-mono tabular-nums tracking-tight ${className}`}>
      {getCurrencyPrefix(currency)}
      {formatted}
    </span>
  );
};
