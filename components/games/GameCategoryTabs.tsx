import React, { useId, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { translateInterfaceText as ui, useInterfaceLanguage as useUiLanguage } from '../../utils/interfaceLanguage';

export const GameCategoryTabs: React.FC<{
  groups: { name: string }[];
  activeIndex: number;
  onChange: (index: number) => void;
  groupLabel: string;
  panelId?: string;
  tabIdPrefix?: string;
}> = ({ groups, activeIndex, onChange, groupLabel, panelId, tabIdPrefix }) => {
  useUiLanguage();
  const uniqueId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTabs = (direction: number) => {
    const element = scrollRef.current;
    if (element) element.scrollBy({ left: direction * Math.round(element.clientWidth * 0.6), behavior: 'smooth' });
  };
  return <div className="relative">
    <div ref={scrollRef} className="notranslate flex overflow-x-auto bg-slate-100 border-b border-slate-200 no-scrollbar"
      translate="no" role="tablist" aria-label={groupLabel}>
      {groups.map((group, index) => <button key={index} type="button" role="tab"
        id={`${tabIdPrefix || uniqueId}-${index}`} aria-controls={panelId} aria-selected={activeIndex === index}
        tabIndex={activeIndex === index ? 0 : -1}
        onClick={() => onChange(index)}
        onKeyDown={event => {
          const nextIndex = event.key === 'ArrowRight' ? (index + 1) % groups.length
            : event.key === 'ArrowLeft' ? (index + groups.length - 1) % groups.length
            : event.key === 'Home' ? 0 : event.key === 'End' ? groups.length - 1 : null;
          if (nextIndex === null) return;
          event.preventDefault();
          onChange(nextIndex);
          const nextTab = scrollRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex];
          nextTab?.focus({ preventScroll: true });
          nextTab?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }}
        className={`px-4 py-3 sm:px-6 sm:py-4 font-bold text-xs sm:text-sm whitespace-normal sm:whitespace-nowrap text-center sm:text-left leading-tight break-words transition-colors min-w-[110px] sm:min-w-[120px] max-w-[140px] sm:max-w-none border-r border-slate-200 sm:border-r-0 cursor-pointer last:border-r-0
          ${activeIndex === index
            ? 'bg-white text-sky-600 border-t-2 border-t-sky-600 shadow-sm relative z-10'
            : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`}>
        {group.name || `${groupLabel} ${index + 1}`}
      </button>)}
    </div>
    <button type="button" onClick={() => scrollTabs(-1)}
      className="sm:hidden absolute z-20 left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/90 border border-slate-200 text-slate-400 shadow-sm hover:text-slate-600 transition-colors"
      aria-label={ui('Scroll tabs left')}><ChevronLeft size={16} className="mx-auto" /></button>
    <button type="button" onClick={() => scrollTabs(1)}
      className="sm:hidden absolute z-20 right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-white/90 border border-slate-200 text-slate-400 shadow-sm hover:text-slate-600 transition-colors"
      aria-label={ui('Scroll tabs right')}><ChevronRight size={16} className="mx-auto" /></button>
  </div>;
};
