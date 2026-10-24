const NON_TEXT_INPUTS = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'file', 'color', 'image']);

/** True when the target accepts typed text (so app shortcuts must stay out of the way). */
export function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable || target.tagName === 'TEXTAREA') return true;
  if (target instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(target.type);
  return false;
}

/** True for any control where Delete/Backspace has its own meaning. */
export function isFormControl(target: EventTarget | null): boolean {
  return isTextEntry(target) || (target instanceof HTMLElement && target.tagName === 'SELECT');
}
