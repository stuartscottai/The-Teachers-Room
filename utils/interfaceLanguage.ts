import { useSyncExternalStore } from 'react';
import copy from '../data/i18n/interface.json';
import spanish from '../data/i18n/spanish-spain.json';

export type InterfaceLanguage = 'en' | 'es';
export type InterfaceTextKey = keyof typeof copy;
export const LANGUAGE_STORAGE_KEY = 'teachers-room-language';
const LANGUAGE_EVENT = 'teachers-room-language-change';

export const getInterfaceLanguage = (): InterfaceLanguage => {
  if (typeof window === 'undefined') return 'en';
  try { return localStorage.getItem(LANGUAGE_STORAGE_KEY) === 'es' ? 'es' : 'en'; }
  catch { return 'en'; }
};
let memoryLanguage: InterfaceLanguage | null = null;
const snapshot = () => memoryLanguage ?? getInterfaceLanguage();

const decodeInterfaceEntities = (text: string) => text
  .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'")
  .replace(/&nbsp;/g, ' ').replace(/&rarr;/g, '→').replace(/&amp;/g, '&');
const normalizeInterfaceText = (text: string) => decodeInterfaceEntities(text).replace(/\s+/g, ' ').trim();
const spanishCopy = Object.fromEntries(Object.entries(spanish).map(([en, es]) => [normalizeInterfaceText(en), es]));

/** Only call for website-owned interface copy, never for saved questions/answers. */
export const translateInterfaceText = (english: string, values: Record<string, unknown> = {}): string => {
  const original = decodeInterfaceEntities(english);
  const translated = snapshot() === 'es' ? spanishCopy[normalizeInterfaceText(original)] : undefined;
  let result = translated === undefined ? original : (original.match(/^\s*/)?.[0] ?? '') + translated + (original.match(/\s*$/)?.[0] ?? '');
  // Replace in one pass: inserted quiz content is never translated or re-interpolated.
  result = result.replace(/\{([^{}]+)\}/g, (token, name: string) => Object.hasOwn(values, name) ? String(values[name] ?? '') : token);
  return result;
};

/** Localise generated default names at display time; leave custom names untouched. */
export const displayTeamName = (name: string | undefined): string => {
  if (!name) return '';
  const generated = /^(Team|Player) (\d+)$/.exec(name);
  return generated ? translateInterfaceText(`${generated[1]} {number}`, { number: generated[2] }) : name;
};

export const setInterfaceLanguage = (language: InterfaceLanguage) => {
  memoryLanguage = language;
  try { localStorage.setItem(LANGUAGE_STORAGE_KEY, language); } catch { /* Private browsers can block storage. */ }
  window.dispatchEvent(new Event(LANGUAGE_EVENT));
};

const subscribe = (notify: () => void) => {
  const storage = (event: StorageEvent) => {
    if (event.key === LANGUAGE_STORAGE_KEY || event.key === null) {
      memoryLanguage = null;
      notify();
    }
  };
  window.addEventListener(LANGUAGE_EVENT, notify);
  window.addEventListener('storage', storage);
  return () => {
    window.removeEventListener(LANGUAGE_EVENT, notify);
    window.removeEventListener('storage', storage);
  };
};

export const useInterfaceLanguage = () => {
  const language = useSyncExternalStore(subscribe, snapshot, () => 'en' as const);
  const t = (key: InterfaceTextKey) => copy[key][language];
  return { language, setLanguage: setInterfaceLanguage, t };
};
