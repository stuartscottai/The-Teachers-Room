import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { translateInterfaceText as ui, useInterfaceLanguage } from '../utils/interfaceLanguage';
import { getSiteTheme, setSiteTheme, SiteTheme } from '../utils/theme';

export const ProfileWebsiteSettings: React.FC = () => {
  const { language, setLanguage, t } = useInterfaceLanguage();
  const [siteTheme, updateSiteTheme] = useState<SiteTheme>(getSiteTheme);

  useEffect(() => {
    const syncTheme = () => updateSiteTheme(getSiteTheme());
    window.addEventListener('storage', syncTheme);
    return () => window.removeEventListener('storage', syncTheme);
  }, []);

  return (
    <section translate="no" lang={language === 'es' ? 'es-ES' : 'en'} className="notranslate profile-panel profile-website-settings" aria-labelledby="profile-settings-heading">
      <h2 id="profile-settings-heading" className="text-lg font-bold text-slate-800">{t('settings.title')}</h2>
      <div>
        <p id="profile-language-label" className="mb-2 text-sm font-semibold text-slate-600">{t('settings.language')}</p>
        <div className="profile-theme-options" role="group" aria-labelledby="profile-language-label">
          <button type="button" lang="en" className="profile-theme-choice" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>English</button>
          <button type="button" lang="es-ES" className="profile-theme-choice" aria-pressed={language === 'es'} onClick={() => setLanguage('es')}>Español (España)</button>
        </div>
      </div>
      <div>
        <p id="profile-appearance-label" className="mb-2 text-sm font-semibold text-slate-600">{ui('Appearance')}</p>
        <div className="profile-theme-options" role="group" aria-labelledby="profile-appearance-label">
          {([
            { value: 'light' as const, label: ui('Light'), Icon: Sun },
            { value: 'dark' as const, label: ui('Dark'), Icon: Moon },
          ]).map(({ value, label, Icon }) => (
            <button key={value} type="button" className="profile-theme-choice" aria-pressed={siteTheme === value}
              onClick={() => { setSiteTheme(value); updateSiteTheme(value); }}>
              <Icon size={18} aria-hidden="true" /><span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
