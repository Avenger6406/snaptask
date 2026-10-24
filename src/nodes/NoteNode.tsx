import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';
import { useAppStore } from '../store/useAppStore';
import type { NoteNodeType } from '../types';
import { NodeHandles } from './NodeHandles';

export function NoteNode({ id, data, selected }: NodeProps<NoteNodeType>) {
  const updateNote = useAppStore((s) => s.updateNote);
  const pending = useAppStore((s) => s.connectFrom === id);
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`node node-note ${selected ? 'is-selected' : ''} ${pending ? 'is-pending' : ''}`}
      onDoubleClick={() => setEditing(true)}
    >
      <NodeHandles />
      {editing ? (
        <div className="note-edit nodrag nowheel" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setEditing(false); }}>
          <input
            className="field-bare note-title"
            value={data.title}
            aria-label="Note title"
            onChange={(e) => updateNote(id, { title: e.target.value })}
          />
          <textarea
            className="field-bare note-text"
            autoFocus
            rows={4}
            value={data.text}
            placeholder="Write something…"
            aria-label="Note text"
            onChange={(e) => updateNote(id, { text: e.target.value })}
          />
        </div>
      ) : (
        <>
          <div className="note-title-static">{data.title || 'Untitled'}</div>
          <p className={`note-body ${expanded ? '' : 'is-clamped'}`}>
            {data.text || <span className="muted">Double-click to write</span>}
          </p>
          {data.text.length > 140 && (
            <button type="button" className="chip-btn nodrag" onClick={() => setExpanded((v) => !v)}>
              {expanded ? <ChevronUp size={13} aria-hidden /> : <ChevronDown size={13} aria-hidden />}
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
