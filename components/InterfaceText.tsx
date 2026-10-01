import React from 'react';
import { InterfaceTextKey, useInterfaceLanguage } from '../utils/interfaceLanguage';

/** Website-owned UI copy stays separate from teacher-authored quiz content. */
export const InterfaceText: React.FC<{ textKey: InterfaceTextKey }> = ({ textKey }) => {
  const { language, t } = useInterfaceLanguage();
  return <span translate="no" lang={language === 'es' ? 'es-ES' : 'en'} className="notranslate">{t(textKey)}</span>;
};
