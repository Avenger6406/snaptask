import { useCallback, useEffect, useRef, type ChangeEvent, type DragEvent } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useAppStore } from '../store/useAppStore';
import { isTextEntry } from '../lib/dom';
import { saveImage } from '../lib/imageStore';
import { toast } from '../store/useToastStore';
import { useViewportCenter } from './useViewportCenter';

/**
 * Clipboard paste, file import and drag-drop for screenshots.
 * Image bytes go to IndexedDB; the node only stores the image id.
 */
export function useImageIntake() {
  const addScreenshot = useAppStore((s) => s.addScreenshot);
  const view = useAppStore((s) => s.view);
  const getCenter = useViewportCenter();
  const { screenToFlowPosition } = useReactFlow();
  const inputRef = useRef<HTMLInputElement>(null);

  const addFile = useCallback(
    async (file: File, at?: { x: number; y: number }) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Only image files can be added to the canvas');
        return;
      }
      try {
        const { id, persisted } = await saveImage(file);
        const title = file.name && file.name !== 'image.png' ? file.name.replace(/\.[^.]+$/, '') : 'Screenshot';
        addScreenshot(id, at ? screenToFlowPosition(at) : getCenter(), title);
        if (persisted) toast.success('Screenshot added');
        else toast.error('Screenshot added, but it couldn’t be saved to browser storage and will be lost on refresh');
      } catch {
        toast.error('That image couldn’t be read');
      }
    },
    [addScreenshot, getCenter, screenToFlowPosition],
  );

  useEffect(() => {
    if (view !== 'canvas') return;
    const onPaste = (e: ClipboardEvent) => {
      if (isTextEntry(e.target)) return;
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith('image/'));
      if (file) {
        e.preventDefault();
        void addFile(file);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [view, addFile]);

  const openPicker = useCallback(() => inputRef.current?.click(), []);
  const onPicked = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void addFile(file);
      e.target.value = '';
    },
    [addFile],
  );
  const onDragOver = useCallback((e: DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) e.preventDefault();
  }, []);
  const onDrop = useCallback(
    (e: DragEvent) => {
      if (e.dataTransfer.files.length === 0) return;
      e.preventDefault();
      const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/')) ?? e.dataTransfer.files[0];
      void addFile(file, { x: e.clientX, y: e.clientY });
    },
    [addFile],
  );

  return { inputRef, openPicker, onPicked, onDragOver, onDrop };
}
