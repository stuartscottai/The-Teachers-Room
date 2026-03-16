import React from 'react';

interface CompanyLogoProps {
  className?: string;
  imageClassName?: string;
  showName?: boolean;
  nameClassName?: string;
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  className,
  imageClassName,
  showName = false,
  nameClassName
}) => {
  return (
    <div className={className}>
      <img
        src="/favicon.svg"
        alt="The Teachers' Room logo"
        className={imageClassName || 'w-16 h-16 object-contain'}
      />
      {showName && (
        <p className={nameClassName || 'mt-2 text-sm font-bold text-slate-700'}>
          The Teachers&apos; Room
        </p>
      )}
    </div>
  );
};
