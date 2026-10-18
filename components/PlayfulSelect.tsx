import React, { forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';

type Choice = { value: string; label: string; disabled: boolean; group?: string };

/** Keep the real form control; provide one animated picker across browsers. */
export const PlayfulSelect = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>((props, forwardedRef) => {
  const select = useRef<HTMLSelectElement | null>(null);
  const menu = useRef<HTMLDivElement>(null);
  const id = useId();
  const [open, setOpen] = useState(false);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, height: 320, above: false });
  const search = useRef({ text: '', time: 0 });
  const nativePicker = props.multiple || (props.size || 0) > 1;

  const place = useCallback(() => {
    if (!select.current) return;
    const box = select.current.getBoundingClientRect();
    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop || 0;
    const viewportBottom = viewportTop + (viewport?.height || innerHeight);
    const below = viewportBottom - box.bottom - 12;
    const above = box.top - viewportTop - 12;
    const flip = below < 200 && above > below;
    const height = Math.max(44, Math.min(320, flip ? above : below));
    const width = Math.min(Math.max(box.width, 180), innerWidth - 16);
    setPosition({ left: Math.max(8, Math.min(box.left, innerWidth - width - 8)), top: flip ? box.top - 6 : box.bottom + 6, width, height, above: flip });
  }, []);

  const show = () => {
    const node = select.current;
    if (!node || props.disabled || nativePicker) return;
    const next = Array.from(node.options).map(option => ({ value: option.value, label: option.label, disabled: option.disabled || (option.parentElement instanceof HTMLOptGroupElement && option.parentElement.disabled), group: option.parentElement instanceof HTMLOptGroupElement ? option.parentElement.label : undefined }));
    setChoices(next);
    setActive(Math.max(0, node.selectedIndex));
    place();
    setOpen(true);
    node.focus({ preventScroll: true });
  };

  const choose = (index: number) => {
    const node = select.current;
    const choice = choices[index];
    if (!node || !choice || choice.disabled) return;
    if (node.value !== choice.value) {
      node.value = choice.value;
      node.dispatchEvent(new Event('change', { bubbles: true }));
    }
    setOpen(false);
    node.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target !== select.current && !menu.current?.contains(event.target as Node)) setOpen(false);
    };
    const scroll = (event: Event) => { if (!menu.current?.contains(event.target as Node)) place(); };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('scroll', scroll, true);
    window.addEventListener('resize', place);
    window.visualViewport?.addEventListener('resize', place);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('scroll', scroll, true);
      window.removeEventListener('resize', place);
      window.visualViewport?.removeEventListener('resize', place);
    };
  }, [open, place]);

  useEffect(() => {
    if (open) menu.current?.querySelector<HTMLElement>(`[data-choice-index='${active}']`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);
  useEffect(() => { if (props.disabled) setOpen(false); }, [props.disabled]);

  return <>
    <select {...props} ref={node => {
      select.current = node;
      if (typeof forwardedRef === 'function') forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    }}
      aria-expanded={nativePicker ? undefined : open}
      aria-controls={open ? id : undefined}
      aria-activedescendant={open ? `${id}-${active}` : undefined}
      onPointerDown={event => {
        props.onPointerDown?.(event);
        if (event.defaultPrevented || nativePicker || props.disabled) return;
        event.preventDefault();
        if (open) setOpen(false); else show();
      }}
      onClick={event => {
        props.onClick?.(event);
        if (!nativePicker) { event.preventDefault(); if (event.detail === 0 && !open) show(); }
      }}
      onBlur={event => { props.onBlur?.(event); setOpen(false); }}
      onKeyDown={event => {
        props.onKeyDown?.(event);
        if (event.defaultPrevented || nativePicker || props.disabled) return;
        if (event.key === 'Tab') { setOpen(false); return; }
        if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); return; }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) {
          event.preventDefault();
          if (!open) { show(); return; }
          if (event.key === 'Enter' || event.key === ' ') { choose(active); return; }
          const enabled = choices.map((choice, index) => choice.disabled ? -1 : index).filter(index => index >= 0);
          const current = enabled.indexOf(active);
          const index = event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1 : Math.max(0, Math.min(enabled.length - 1, current + (event.key === 'ArrowUp' ? -1 : 1)));
          if (enabled[index] !== undefined) setActive(enabled[index]);
        } else if (open && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          const now = Date.now();
          search.current = { text: now - search.current.time > 700 ? event.key : search.current.text + event.key, time: now };
          const match = choices.findIndex(choice => !choice.disabled && choice.label.toLocaleLowerCase().startsWith(search.current.text.toLocaleLowerCase()));
          if (match >= 0) setActive(match);
        }
      }} />
    {open && createPortal(<div className="playful-picker-anchor" style={{ position: 'fixed', left: position.left, top: position.top, width: position.width, transform: position.above ? 'translateY(-100%)' : undefined, zIndex: 2000 }}>
      <div ref={menu} id={id} role="listbox" aria-label={props['aria-label'] || select.current?.labels?.[0]?.textContent || select.current?.title || undefined}
        className={`playful-picker playful-dropdown-panel${position.above ? ' playful-picker-above' : ''}`} style={{ maxHeight: position.height }}
        onPointerDown={event => event.preventDefault()}>
        {choices.map((choice, index) => <React.Fragment key={`${choice.value}-${index}`}>
          {choice.group && choice.group !== choices[index - 1]?.group && <div className="playful-picker-group">{choice.group}</div>}
          <div id={`${id}-${index}`} role="option" aria-selected={select.current?.value === choice.value} aria-disabled={choice.disabled || undefined} data-choice-index={index}
            className={`playful-picker-option${index === active ? ' is-active' : ''}`}
            onPointerMove={() => { if (!choice.disabled) setActive(index); }} onClick={() => choose(index)}>
            <span>{choice.label}</span>{select.current?.value === choice.value && <Check size={16} aria-hidden="true" />}
          </div>
        </React.Fragment>)}
      </div>
    </div>, document.body)}
  </>;
});
PlayfulSelect.displayName = 'PlayfulSelect';
