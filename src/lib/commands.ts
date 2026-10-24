import { useAppStore } from '../store/useAppStore';
import { toast } from '../store/useToastStore';

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

export function undoCommand(): void {
  const label = useAppStore.getState().undo();
  if (label) toast.info(`Undid: ${label.toLowerCase()}`, { label: 'Redo', run: redoCommand });
  else toast.info('Nothing to undo');
}

export function redoCommand(): void {
  const label = useAppStore.getState().redo();
  if (label) toast.info(`Redid: ${label.toLowerCase()}`, { label: 'Undo', run: undoCommand });
  else toast.info('Nothing to redo');
}

export function deleteSelectionCommand(): void {
  const { nodes, edges } = useAppStore.getState().deleteSelected();
  if (nodes === 0 && edges === 0) return;
  const message = nodes > 0 ? `Deleted ${plural(nodes, 'node')}` : `Deleted ${plural(edges, 'connection')}`;
  toast.info(message, { label: 'Undo', run: undoCommand });
}

export function deleteNodeCommand(id: string): void {
  useAppStore.getState().deleteNode(id);
  toast.info('Deleted node', { label: 'Undo', run: undoCommand });
}

export function connectClickCommand(nodeId: string): void {
  const result = useAppStore.getState().handleConnectClick(nodeId);
  if (result === 'connected') toast.success('Nodes connected');
  else if (result === 'duplicate') toast.info('Those nodes are already connected');
}
