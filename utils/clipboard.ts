/** Also supports local HTTP previews where the modern clipboard API is unavailable. */
export const copyText = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* Try the browser's selection-based copy below. */ }
  const previousFocus = document.activeElement as HTMLElement | null;
  const input = document.createElement('textarea');
  input.value = text;
  input.readOnly = true;
  input.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;';
  document.body.appendChild(input);
  input.select();
  input.setSelectionRange(0, text.length);
  try { return document.execCommand('copy'); }
  catch { return false; }
  finally { input.remove(); previousFocus?.focus({ preventScroll: true }); }
};
