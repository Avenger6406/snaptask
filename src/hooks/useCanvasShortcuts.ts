import { useEffect } from 'react';
import { deleteSelectionCommand, redoCommand, undoCommand } from '../lib/commands';
import { isFormControl, isTextEntry } from '../lib/dom';
import { useAppStore } from '../store/useAppStore';

/**
 * One place for canvas keyboard shortcuts. Typing contexts always win:
 * while a text field has focus, Delete/Backspace/Ctrl+Z keep their native meaning.
 */
export function useCanvasShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const state = useAppStore.getState();
      if (state.view !== 'canvas') return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (e.key === 'Escape') {
        if (state.previewNodeId) {
          state.setPreview(null);
          return;
        }
        if (isFormControl(e.target) && e.target instanceof HTMLElement) {
          e.target.blur(); // ends inline editing; the next Esc handles the canvas
        } else if (state.connectMode) {
          state.setConnectMode(false);
        } else if (state.nodes.some((n) => n.selected) || state.edges.some((n) => n.selected)) {
          state.selectOnly(null);
        }
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && !mod && !e.altKey) {
        if (isFormControl(e.target)) return;
        e.preventDefault();
        deleteSelectionCommand();
        return;
      }

      if (mod && !e.altKey && (key === 'z' || key === 'y')) {
        if (isTextEntry(e.target)) return; // native text undo
        e.preventDefault();
        if (key === 'y' || e.shiftKey) redoCommand();
        else undoCommand();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}
