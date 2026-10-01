import { translateInterfaceText as ui, useInterfaceLanguage as useUiLanguage } from '../../utils/interfaceLanguage';
import React from 'react';
import { GameConfig } from '../../types';

export const GameWebSources: React.FC<{ config: GameConfig }> = ({ config }) => {
  useUiLanguage();
  const sources = (config.webSearchSources || []).filter(source => /^https?:\/\//i.test(source.url));
  if (!sources.length) return null;
  return (
    <details className="my-4 text-sm text-slate-600">
      <summary className="cursor-pointer font-semibold text-slate-700 hover:text-brand-blue">{ui("View sources")}</summary>
      <p className="mt-1 text-xs">{config.webSearchCheckedAt ? ui("Searched on {config.webSearchCheckedAt.slice(0, 10)}.", { "config.webSearchCheckedAt.slice(0, 10)": (config.webSearchCheckedAt.slice(0, 10)) }) : ''}{ui("Figures may change. Review the sources before playing.")}</p>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
        {sources.map(source => (
          <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" className="text-brand-blue underline underline-offset-2">{source.title}</a></li>
        ))}
      </ul>
    </details>
  );
};
