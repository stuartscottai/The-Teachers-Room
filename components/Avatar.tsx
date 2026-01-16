import React, { useEffect, useMemo, useState } from 'react';

interface AvatarProps {
  name: string;
  src?: string | null;
  className?: string;
  imgClassName?: string;
  textClassName?: string;
  title?: string;
}

const getInitials = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '';
  return (first + last).toUpperCase();
};

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  className,
  imgClassName,
  textClassName,
  title
}) => {
  const [imgError, setImgError] = useState(false);
  const initials = useMemo(() => getInitials(name), [name]);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const showImage = !!src && !imgError;

  return (
    <div
      className={`rounded-full overflow-hidden flex items-center justify-center bg-slate-100 text-slate-600 font-bold uppercase ${className || ''}`}
      title={title || name}
    >
      {showImage ? (
        <img
          src={src || undefined}
          alt={name}
          crossOrigin="anonymous"
          onError={() => setImgError(true)}
          className={`w-full h-full object-cover ${imgClassName || ''}`}
        />
      ) : (
        <span className={textClassName || 'text-xs'}>{initials}</span>
      )}
    </div>
  );
};
