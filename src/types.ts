import type { Node } from '@xyflow/react';

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type Priority = 'low' | 'medium' | 'high';
export type ViewId = 'canvas' | 'tasks' | 'upcoming' | 'completed';
export type Theme = 'dark' | 'light';

export interface ScreenshotData extends Record<string, unknown> {
  title: string;
  imageId: string | null;
}
export interface NoteData extends Record<string, unknown> {
  title: string;
  text: string;
}
export interface TaskData extends Record<string, unknown> {
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  /** Local "YYYY-MM-DDTHH:mm" or null */
  deadline: string | null;
  reminder: string | null;
  tags: string[];
}

export type ScreenshotNodeType = Node<ScreenshotData, 'screenshot'>;
export type NoteNodeType = Node<NoteData, 'note'>;
export type TaskNodeType = Node<TaskData, 'task'>;
export type AppNode = ScreenshotNodeType | NoteNodeType | TaskNodeType;
export type NewNodeKind = 'note' | 'task';

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};
export const PRIORITY_LABEL: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High' };
