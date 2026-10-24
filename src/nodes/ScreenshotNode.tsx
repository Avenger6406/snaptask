import { ImageOff, ListTodo, Maximize2, StickyNote } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';
import { useImageUrl } from '../hooks/useImageUrl';
import { useAppStore } from '../store/useAppStore';
import type { ScreenshotNodeType } from '../types';
import { NodeHandles } from './NodeHandles';

export function ScreenshotNode({ id, data, selected }: NodeProps<ScreenshotNodeType>) {
  const addConnected = useAppStore((s) => s.addConnected);
  const setPreview = useAppStore((s) => s.setPreview);
  const pending = useAppStore((s) => s.connectFrom === id);
  const { url, status } = useImageUrl(data.imageId);
  return (
    <div className={`node node-shot ${selected ? 'is-selected' : ''} ${pending ? 'is-pending' : ''}`}>
      <NodeHandles />
      <div className="shot-frame">
        {status === 'ready' && url && (
          <>
            <img src={url} alt={data.title} draggable={false} />
            <button type="button" className="shot-expand nodrag" onClick={() => setPreview(id)} aria-label="Open larger preview" title="Open larger preview">
              <Maximize2 size={14} aria-hidden />
            </button>
          </>
        )}
        {status === 'loading' && <div className="shot-skeleton" aria-label="Loading image" />}
        {status === 'missing' && (
          <div className="shot-missing">
            <ImageOff size={20} aria-hidden />
            <span>Image unavailable</span>
          </div>
        )}
      </div>
      <div className="shot-foot">
        <span className="shot-title" title={data.title}>{data.title}</span>
        <div className="shot-actions nodrag">
          <button type="button" className="chip-btn" onClick={() => addConnected(id, 'note')}>
            <StickyNote size={13} aria-hidden /> Note
          </button>
          <button type="button" className="chip-btn" onClick={() => addConnected(id, 'task')}>
            <ListTodo size={13} aria-hidden /> Task
          </button>
        </div>
      </div>
    </div>
  );
}
