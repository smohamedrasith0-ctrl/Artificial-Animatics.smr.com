import React from 'react';
import { useStudioData } from '../context/StudioDataContext';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showWordmark = true,
  className = '',
}) => {
  const { brand } = useStudioData();

  const imgHeightClass =
    size === 'sm' ? 'h-8' : size === 'lg' ? 'h-14 sm:h-16' : 'h-9 sm:h-10';

  const markSizeClass =
    size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-14 h-14' : 'w-9 h-9';

  const textSizeClass =
    size === 'sm'
      ? 'text-sm tracking-[0.14em]'
      : size === 'lg'
        ? 'text-xl sm:text-2xl tracking-[0.18em]'
        : 'text-base tracking-[0.14em]';

  // When official logo asset is uploaded/configured, render strictly with original proportions & colours
  if (brand.logoUrl) {
    return (
      <span className={`inline-flex items-center gap-3 shrink-0 ${className}`}>
        <img
          src={brand.logoUrl}
          alt={brand.companyName || 'Artificial Animatics'}
          referrerPolicy="no-referrer"
          className={`${imgHeightClass} w-auto max-w-[220px] object-contain shrink-0`}
        />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-3 whitespace-nowrap shrink-0 ${className}`}>
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${markSizeClass} shrink-0`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="aaPrismGrad" x1="6" y1="42" x2="42" y2="6" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="45%" stopColor="#06B6D4" />
            <stop offset="75%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
        </defs>
        <rect
          x="2"
          y="2"
          width="44"
          height="44"
          rx="11"
          fill="#0B101D"
          stroke="url(#aaPrismGrad)"
          strokeWidth="2"
        />
        <path
          d="M24 11L35.5 34H30.2L27.6 28.4H20.4L17.8 34H12.5L24 11ZM24 18.7L21.9 23.6H26.1L24 18.7Z"
          fill="url(#aaPrismGrad)"
        />
        <polygon points="33,14 37,16.5 33,19" fill="#FB923C" />
      </svg>
      {showWordmark && (
        <span className={`font-display font-bold uppercase text-white ${textSizeClass}`}>
          {brand.companyName || 'ARTIFICIAL ANIMATICS'}
        </span>
      )}
    </span>
  );
};
