import React from 'react';

/** A short hand-drawn swoosh, revealed once as the heading appears. */
export const PlayfulTitleAccent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="playful-title-accent">
    {children}
    <svg className="playful-title-underline" viewBox="0 0 240 16" fill="none" aria-hidden="true">
      <path d="M4 10C55 2 142 2 234 9M28 13C92 8 161 8 208 12" pathLength="1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  </span>
);
