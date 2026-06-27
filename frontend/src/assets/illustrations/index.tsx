import React from 'react';

export const TrackIllustration: React.FC = () => (
  <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <circle cx="100" cy="100" r="80" fill="url(#trackGrad)" opacity="0.15" />
    <circle cx="100" cy="100" r="60" stroke="url(#trackGrad)" strokeWidth="6" strokeDasharray="10 5" />
    {/* Concentric growth lines */}
    <path d="M60 120 L85 95 L115 125 L145 90" stroke="url(#trackGrad)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="145" cy="90" r="10" fill="#10B981" />
    <defs>
      <linearGradient id="trackGrad" x1="60" y1="90" x2="145" y2="125" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3730A3" />
        <stop offset="100%" stopColor="#10B981" />
      </linearGradient>
    </defs>
  </svg>
);

export const ReminderIllustration: React.FC = () => (
  <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <circle cx="100" cy="100" r="80" fill="url(#remGrad)" opacity="0.15" />
    {/* Calendar card */}
    <rect x="60" y="60" width="80" height="80" rx="16" fill="#FFFFFF" stroke="url(#remGrad)" strokeWidth="4" className="shadow-sm" />
    <path d="M60 90 H140" stroke="url(#remGrad)" strokeWidth="4" />
    <circle cx="85" cy="115" r="8" fill="#F59E0B" />
    <circle cx="115" cy="115" r="8" fill="#E2E8F0" />
    {/* Bell */}
    <path d="M100 35 C90 35 85 45 85 55 V65 H115 V55 C115 45 110 35 100 35 Z" fill="#3730A3" />
    <circle cx="100" cy="70" r="5" fill="#3730A3" />
    <defs>
      <linearGradient id="remGrad" x1="60" y1="60" x2="140" y2="140" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#3730A3" />
        <stop offset="100%" stopColor="#F59E0B" />
      </linearGradient>
    </defs>
  </svg>
);

export const SimulatorIllustration: React.FC = () => (
  <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <circle cx="100" cy="100" r="80" fill="url(#simGrad)" opacity="0.15" />
    {/* Flowing repayment timeline */}
    <path d="M50 140 C80 140 70 80 110 80 C130 80 135 100 160 60" stroke="#E2E8F0" strokeWidth="6" strokeLinecap="round" />
    {/* Accelerated line */}
    <path d="M50 140 C70 140 80 60 120 60" stroke="url(#simGrad)" strokeWidth="8" strokeLinecap="round" strokeDasharray="300" />
    <circle cx="120" cy="60" r="10" fill="#10B981" />
    <path d="M115 60 L119 64 L126 56" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <defs>
      <linearGradient id="simGrad" x1="50" y1="140" x2="120" y2="60" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#6366F1" />
        <stop offset="100%" stopColor="#10B981" />
      </linearGradient>
    </defs>
  </svg>
);
