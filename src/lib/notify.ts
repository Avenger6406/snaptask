export type PermissionState = NotificationPermission | 'unsupported';

export const permissionState = (): PermissionState => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);

/** Must be called from a user gesture (a click). */
export async function requestPermission(): Promise<PermissionState> {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.requestPermission();
}

export function showSystemNotification(title: string, body: string, onClick: () => void): void {
  if (permissionState() !== 'granted') return;
  try {
    const n = new Notification(title, { body, tag: `snaptask-${title}-${body}` });
    n.onclick = () => { window.focus(); onClick(); n.close(); };
  } catch {
    /* some browsers throw outside secure contexts; the in-app toast still shows */
  }
}
