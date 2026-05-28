import React, { useState } from 'react';
import { Bot, Brain, Crown, Flame, Gamepad2, Ghost, GraduationCap, Rocket, Sparkles, Star, Zap } from 'lucide-react';

const FALLBACK_ICONS = [Rocket, Zap, Gamepad2, Brain, Sparkles, Bot, Crown, Flame, Star, Ghost, GraduationCap] as const;
const FALLBACK_STYLES = [
  ['from-sky-400 to-cyan-200', 'text-sky-950'],
  ['from-yellow-300 to-amber-500', 'text-amber-950'],
  ['from-violet-400 to-fuchsia-300', 'text-violet-950'],
  ['from-pink-300 to-rose-400', 'text-rose-950'],
  ['from-lime-300 to-emerald-400', 'text-emerald-950'],
  ['from-slate-200 to-slate-400', 'text-slate-950'],
  ['from-orange-300 to-yellow-300', 'text-orange-950'],
  ['from-red-400 to-orange-300', 'text-red-950'],
  ['from-indigo-300 to-blue-400', 'text-indigo-950'],
  ['from-teal-200 to-blue-200', 'text-teal-950'],
  ['from-amber-200 to-lime-200', 'text-lime-950'],
] as const;

export const LIVE_QUIZ_AVATAR_OPTIONS = Array.from({ length: 24 }, (_, index) => {
  const [colors, ink] = FALLBACK_STYLES[index % FALLBACK_STYLES.length];
  return {
    id: `a${index + 1}`,
    Icon: FALLBACK_ICONS[index % FALLBACK_ICONS.length],
    colors,
    ink,
    image: `/assets/avatars/live-quiz/avatar-${index + 1}.png`,
  };
});

export const LIVE_QUIZ_NAME_MAX_LENGTH = 20;

const AVATAR_TOKEN_PATTERN = /^(?:\[\[avatar:([a-z0-9-]+)\]\]|~([a-z0-9-]+)~)\s*/i;

export const makeLiveQuizDisplayName = (avatarId: string, name: string) => `~${avatarId}~ ${name.trim().slice(0, LIVE_QUIZ_NAME_MAX_LENGTH)}`;

export const parseLiveQuizDisplayName = (displayName: string) => {
  const value = String(displayName || '').trim();
  const match = value.match(AVATAR_TOKEN_PATTERN);
  return {
    avatarId: match?.[1] || match?.[2] || '',
    name: value.replace(AVATAR_TOKEN_PATTERN, '').trim(),
  };
};

export const LiveQuizAvatarIcon: React.FC<{ avatarId?: string; className?: string; iconSize?: number }> = ({
  avatarId,
  className = 'h-10 w-10',
  iconSize = 22,
}) => {
  const [imageFailed, setImageFailed] = useState(false);
  const avatar = LIVE_QUIZ_AVATAR_OPTIONS.find((option) => option.id === avatarId) || LIVE_QUIZ_AVATAR_OPTIONS[0];
  const Icon = avatar.Icon;

  if (!imageFailed) {
    return (
      <img
        src={avatar.image}
        alt=""
        className={`${className} shrink-0 rounded-full bg-white object-contain p-[2px] ring-2 ring-white/70`}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span className={`${className} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatar.colors} ${avatar.ink} ring-2 ring-white/70`}>
      <Icon size={iconSize} />
    </span>
  );
};

export const LiveQuizPlayerName: React.FC<{
  displayName: string;
  className?: string;
  nameClassName?: string;
  avatarClassName?: string;
  iconSize?: number;
}> = ({ displayName, className = '', nameClassName = '', avatarClassName = 'h-10 w-10', iconSize = 22 }) => {
  const parsed = parseLiveQuizDisplayName(displayName);
  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      {parsed.avatarId && <LiveQuizAvatarIcon avatarId={parsed.avatarId} className={avatarClassName} iconSize={iconSize} />}
      <span className={`min-w-0 truncate ${nameClassName}`}>{parsed.name || displayName}</span>
    </span>
  );
};
