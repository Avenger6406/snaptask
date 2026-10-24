import { ImagePlus, Link2, ListTodo, Redo2, StickyNote, Undo2, type LucideIcon } from 'lucide-react';
import { redoCommand, undoCommand } from '../lib/commands';
import { useViewportCenter } from '../hooks/useViewportCenter';
import { useAppStore } from '../store/useAppStore';

interface BtnProps { icon: LucideIcon; label: string; onClick: () => void; active?: boolean; title?: string; disabled?: boolean; iconOnly?: boolean }

function ToolButton({ icon: Icon, label, onClick, active, title, disabled, iconOnly }: BtnProps) {
  return (
    <button
      type="button"
      className={`tool-btn ${active ? 'is-active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
      aria-label={iconOnly ? label : undefined}
      title={title ?? label}
      disabled={disabled}
    >
      <Icon size={17} aria-hidden />
      {!iconOnly && <span>{label}</span>}
    </button>
  );
}

export function Toolbar({ onImport }: { onImport: () => void }) {
  const addNode = useAppStore((s) => s.addNode);
  const nodeCount = useAppStore((s) => s.nodes.length);
  const connectMode = useAppStore((s) => s.connectMode);
  const connectFrom = useAppStore((s) => s.connectFrom);
  const setConnectMode = useAppStore((s) => s.setConnectMode);
  const canUndo = useAppStore((s) => s.past.length > 0);
  const canRedo = useAppStore((s) => s.future.length > 0);
  const getCenter = useViewportCenter();

  const add = (kind: 'note' | 'task') => {
    const c = getCenter();
    const jitter = (nodeCount % 6) * 22; // keeps stacked additions from covering each other
    addNode(kind, { x: c.x - 120 + jitter, y: c.y - 50 + jitter });
  };

  return (
    <div className="toolbar" role="toolbar" aria-label="Canvas tools">
      <ToolButton icon={ImagePlus} label="Screenshot" onClick={onImport} title="Import an image — or press Ctrl+V to paste one" />
      <span className="tool-sep" aria-hidden />
      <ToolButton icon={StickyNote} label="Note" onClick={() => add('note')} />
      <ToolButton icon={ListTodo} label="Task" onClick={() => add('task')} />
      <span className="tool-sep" aria-hidden />
      <ToolButton
        icon={Link2}
        label={connectMode ? (connectFrom ? 'Pick target' : 'Pick source') : 'Connect'}
        onClick={() => setConnectMode(!connectMode)}
        active={connectMode}
        title="Click one node, then another to link them. Esc cancels."
      />
      <span className="tool-sep" aria-hidden />
      <ToolButton icon={Undo2} label="Undo" iconOnly disabled={!canUndo} onClick={undoCommand} title="Undo (Ctrl+Z)" />
      <ToolButton icon={Redo2} label="Redo" iconOnly disabled={!canRedo} onClick={redoCommand} title="Redo (Ctrl+Shift+Z)" />
    </div>
  );
}
