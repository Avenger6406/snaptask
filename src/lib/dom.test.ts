// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { isFormControl, isTextEntry } from './dom';

const el = (tag: string, type?: string): HTMLElement => {
  const e = document.createElement(tag);
  if (type) e.setAttribute('type', type);
  return e;
};

describe('isTextEntry / isFormControl', () => {
  it('protects every text-like field', () => {
    for (const t of ['text', 'datetime-local', 'search', 'email']) expect(isTextEntry(el('input', t))).toBe(true);
    expect(isTextEntry(el('input'))).toBe(true);
    expect(isTextEntry(el('textarea'))).toBe(true);
    const editable = el('div');
    Object.defineProperty(editable, 'isContentEditable', { value: true });
    expect(isTextEntry(editable)).toBe(true);
  });

  it('lets shortcuts through on non-text controls and the canvas', () => {
    expect(isTextEntry(el('input', 'checkbox'))).toBe(false);
    expect(isTextEntry(el('button'))).toBe(false);
    expect(isTextEntry(document.body)).toBe(false);
    expect(isTextEntry(null)).toBe(false);
  });

  it('treats select as a form control for Delete but not as text for undo', () => {
    expect(isFormControl(el('select'))).toBe(true);
    expect(isTextEntry(el('select'))).toBe(false);
  });
});
