import React from 'react';
import { Turnstile } from '@marsidev/react-turnstile';

const CLOUDFLARE_ALWAYS_PASS_TEST_SITE_KEY = '1x00000000000000000000AA';

const configuredSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim();
const siteKey = configuredSiteKey || (import.meta.env.DEV ? CLOUDFLARE_ALWAYS_PASS_TEST_SITE_KEY : '');

interface AuthTurnstileProps {
  resetKey: number;
  onTokenChange: (token: string | null) => void;
  discreet?: boolean;
}

export const AuthTurnstile: React.FC<AuthTurnstileProps> = ({
  resetKey,
  onTokenChange,
  discreet = false
}) => {
  if (!siteKey) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Human verification is not configured. Please contact support.
      </div>
    );
  }

  return (
    <div
      className={`flex w-full items-center justify-center overflow-hidden ${
        discreet ? 'min-h-0' : 'min-h-[65px]'
      }`}
    >
      <Turnstile
        key={resetKey}
        siteKey={siteKey}
        onSuccess={(token) => onTokenChange(token)}
        onExpire={() => onTokenChange(null)}
        onError={() => onTokenChange(null)}
        onTimeout={() => onTokenChange(null)}
        onUnsupported={() => onTokenChange(null)}
        options={{
          ...(discreet ? { appearance: 'interaction-only' as const } : {}),
          refreshExpired: 'auto',
          refreshTimeout: 'auto',
          size: 'flexible',
          theme: 'light'
        }}
      />
    </div>
  );
};
