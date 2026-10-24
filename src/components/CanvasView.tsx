import {
  Background, BackgroundVariant, ConnectionMode, ConnectionLineType, Controls, ReactFlow,
  type DefaultEdgeOptions, type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCanvasShortcuts } from '../hooks/useCanvasShortcuts';
import { useImageIntake } from '../hooks/useImageIntake';
import { connectClickCommand } from '../lib/commands';
import { toast } from '../store/useToastStore';
import { NoteNode } from '../nodes/NoteNode';
import { ScreenshotNode } from '../nodes/ScreenshotNode';
import { TaskNode } from '../nodes/TaskNode';
import { useAppStore } from '../store/useAppStore';
import type { AppNode } from '../types';
import { EmptyState } from './EmptyState';
import { Lightbox } from './Lightbox';
import { Inspector } from './Inspector';
import { Toolbar } from './Toolbar';

const nodeTypes: NodeTypes = { screenshot: ScreenshotNode, note: NoteNode, task: TaskNode };
const edgeOptions: DefaultEdgeOptions = { type: 'default', style: { strokeWidth: 1.6 } };

export function CanvasView() {
  const nodes = useAppStore((s) => s.nodes);
  const edges = useAppStore((s) => s.edges);
  const theme = useAppStore((s) => s.theme);
  const connectMode = useAppStore((s) => s.connectMode);
  const viewport = useAppStore.getState().viewport; // initial only; later changes come from the canvas itself
  const { onNodesChange, onEdgesChange, onConnect, onReconnect, isValidConnection, beginDrag, endDrag, setViewport } = useAppStore.getState();
  const { inputRef, openPicker, onPicked, onDragOver, onDrop } = useImageIntake();
  useCanvasShortcuts();

  return (
    <div className={`canvas-wrap ${connectMode ? 'is-connecting' : ''}`} onDragOver={onDragOver} onDrop={onDrop}>
      <ReactFlow<AppNode>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={(c) => {
          if (onConnect(c)) toast.success('Nodes connected');
          else toast.info(c.source === c.target ? 'A node can’t connect to itself' : 'Those nodes are already connected');
        }}
        onReconnect={(edge, c) => { onReconnect(edge, c); toast.info('Connection updated'); }}
        isValidConnection={isValidConnection}
        onNodeDragStart={beginDrag}
        onNodeDragStop={endDrag}
        onNodeClick={(_, node) => { if (connectMode) connectClickCommand(node.id); }}
        defaultEdgeOptions={edgeOptions}
        connectionMode={ConnectionMode.Loose}
        connectionLineType={ConnectionLineType.Bezier}
        colorMode={theme}
        defaultViewport={viewport}
        onMoveEnd={(_, vp) => setViewport(vp)}
        deleteKeyCode={null}
        zoomOnDoubleClick={false}
        minZoom={0.15}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        fitViewOptions={{ padding: 0.3 }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.4} />
        <Controls showInteractive={false} position="bottom-left" />
      </ReactFlow>

      {nodes.length === 0 && <EmptyState onImport={openPicker} />}
      <Toolbar onImport={openPicker} />
      <Inspector />
      <Lightbox />
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onPicked} />
    </div>
  );
}
