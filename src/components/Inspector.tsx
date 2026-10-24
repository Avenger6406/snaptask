import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { permissionState, requestPermission, type PermissionState } from '../lib/notify';
import { deleteNodeCommand } from '../lib/commands';
import { useAppStore } from '../store/useAppStore';
import { PRIORITY_LABEL, STATUS_LABEL, type Priority, type TaskStatus } from '../types';

function ReminderHelp() {
  const [perm, setPerm] = useState<PermissionState>(permissionState());
  return (
    <div className="hint">
      <p>Reminders appear in SnapTask while it’s open in a browser tab. They can’t fire when the browser is closed.</p>
      {perm === 'default' && (
        <button type="button" className="btn" onClick={() => void requestPermission().then(setPerm)}>Enable system notifications</button>
      )}
      {perm === 'granted' && <p>System notifications are on for when this tab is in the background.</p>}
      {perm === 'denied' && <p>System notifications are blocked in your browser settings; reminders still show here.</p>}
    </div>
  );
}

export function Inspector() {
  const selectedCount = useAppStore((s) => s.nodes.reduce((c, n) => c + (n.selected ? 1 : 0), 0));
  const node = useAppStore((s) => s.nodes.find((n) => n.selected) ?? null);
  const { updateNote, updateTask, updateScreenshot, selectOnly, addConnected } = useAppStore.getState();
  if (!node || selectedCount !== 1) return null; // multi-selection has nothing single to edit

  return (
    <aside className="inspector" aria-label="Node inspector">
      <header className="insp-head">
        <h2>{node.type === 'task' ? 'Task' : node.type === 'note' ? 'Note' : 'Screenshot'}</h2>
        <button type="button" className="icon-btn" onClick={() => selectOnly(null)} aria-label="Close inspector"><X size={16} /></button>
      </header>

      <div className="insp-body">
        {node.type === 'screenshot' && (
          <>
            <label className="field"><span>Title</span>
              <input value={node.data.title} onChange={(e) => updateScreenshot(node.id, { title: e.target.value })} />
            </label>
            <div className="field-row">
              <button type="button" className="btn" onClick={() => addConnected(node.id, 'note')}>Add note</button>
              <button type="button" className="btn" onClick={() => addConnected(node.id, 'task')}>Add task</button>
            </div>
          </>
        )}

        {node.type === 'note' && (
          <>
            <label className="field"><span>Title</span>
              <input value={node.data.title} onChange={(e) => updateNote(node.id, { title: e.target.value })} />
            </label>
            <label className="field"><span>Text</span>
              <textarea rows={8} value={node.data.text} onChange={(e) => updateNote(node.id, { text: e.target.value })} />
            </label>
          </>
        )}

        {node.type === 'task' && (
          <>
            <label className="field"><span>Title</span>
              <input value={node.data.title} onChange={(e) => updateTask(node.id, { title: e.target.value })} />
            </label>
            <label className="field"><span>Description</span>
              <textarea rows={4} value={node.data.description} onChange={(e) => updateTask(node.id, { description: e.target.value })} />
            </label>
            <div className="field-row">
              <label className="field"><span>Status</span>
                <select value={node.data.status} onChange={(e) => updateTask(node.id, { status: e.target.value as TaskStatus })}>
                  {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((k) => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
                </select>
              </label>
              <label className="field"><span>Priority</span>
                <select value={node.data.priority} onChange={(e) => updateTask(node.id, { priority: e.target.value as Priority })}>
                  {(Object.keys(PRIORITY_LABEL) as Priority[]).map((k) => <option key={k} value={k}>{PRIORITY_LABEL[k]}</option>)}
                </select>
              </label>
            </div>
            <label className="field"><span>Deadline</span>
              <input type="datetime-local" value={node.data.deadline ?? ''} onChange={(e) => updateTask(node.id, { deadline: e.target.value || null })} />
            </label>
            <label className="field"><span>Reminder</span>
              <input type="datetime-local" value={node.data.reminder ?? ''} onChange={(e) => updateTask(node.id, { reminder: e.target.value || null })} />
            </label>
            <ReminderHelp />
            <label className="field"><span>Tags (comma separated)</span>
              <input
                defaultValue={node.data.tags.join(', ')}
                key={node.id}
                onChange={(e) => updateTask(node.id, { tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
              />
            </label>
          </>
        )}
      </div>

      <footer className="insp-foot">
        <button type="button" className="btn btn-danger" onClick={() => deleteNodeCommand(node.id)}>
          <Trash2 size={15} aria-hidden /> Delete
        </button>
      </footer>
    </aside>
  );
}
