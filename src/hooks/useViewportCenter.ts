import { useCallback } from 'react';
import { useReactFlow, useStore, type XYPosition } from '@xyflow/react';

/** Returns a function giving the flow-space point at the center of the visible canvas. */
export function useViewportCenter(): () => XYPosition {
  const { screenToFlowPosition } = useReactFlow();
  const domNode = useStore((s) => s.domNode);
  return useCallback(() => {
    const r = domNode?.getBoundingClientRect();
    return screenToFlowPosition({
      x: r ? r.left + r.width / 2 : window.innerWidth / 2,
      y: r ? r.top + r.height / 2 : window.innerHeight / 2,
    });
  }, [domNode, screenToFlowPosition]);
}
