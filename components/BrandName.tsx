import React from 'react';

interface BrandNameProps {
  className?: string;
}

export const BrandName: React.FC<BrandNameProps> = ({ className }) => (
  <span translate="no" className={['notranslate', className].filter(Boolean).join(' ')} lang="en">
    The Teachers' Room
  </span>
);
