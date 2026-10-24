import { useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { CanvasView } from './components/CanvasView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Sidebar } from './components/Sidebar';
import { TaskList } from './components/TaskList';
import { ToastViewport } from './components/ToastViewport';
import { useReminders } from './hooks/useReminders';
import { bootWorkspace } from './lib/workspaceStorage';
import { useAppStore } from './store/useAppStore';

export default function App() {
  const view = useAppStore((s) => s.view);
  const theme = useAppStore((s) => s.theme);

  const [ready, setReady] = useState(false);

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { void bootWorkspace().finally(() => setReady(true)); }, []);
  useReminders(ready);

  return (
    <ErrorBoundary>
      <div className="app">
        <Sidebar />
        <main className="main">
          {!ready && <div className="boot" role="status" aria-label="Loading workspace"><div className="boot-bar" /></div>}
          {ready && <ReactFlowProvider>
            {/* Canvas stays mounted so viewport and node state survive switching views. */}
            <div className="pane" hidden={view !== 'canvas'}><CanvasView /></div>
          </ReactFlowProvider>}
          {view !== 'canvas' && <div className="pane"><TaskList view={view} /></div>}
          <ToastViewport />
        </main>
      </div>
    </ErrorBoundary>
  );
}
