import { Check, Loader, TriangleAlert, CloudOff } from 'lucide-react';
import { useSaveStatus, type SaveStatus } from '../lib/workspaceStorage';

const INFO: Record<SaveStatus, { label: string; Icon: typeof Check }> = {
  idle: { label: 'Loading', Icon: Loader },
  saving: { label: 'Saving…', Icon: Loader },
  saved: { label: 'All changes saved', Icon: Check },
  error: { label: 'Couldn’t save — retrying', Icon: TriangleAlert },
  unavailable: { label: 'Not saved: storage unavailable', Icon: CloudOff },
};

export function SaveIndicator() {
  const status = useSaveStatus((s) => s.status);
  const { label, Icon } = INFO[status];
  return (
    <div className={`save save-${status}`} role="status" title={label} aria-label={label}>
      <Icon size={15} aria-hidden />
    </div>
  );
}
