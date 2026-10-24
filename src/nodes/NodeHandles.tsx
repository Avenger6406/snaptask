import { Handle, Position } from '@xyflow/react';

const SIDES: ReadonlyArray<{ id: string; position: Position }> = [
  { id: 't', position: Position.Top },
  { id: 'r', position: Position.Right },
  { id: 'b', position: Position.Bottom },
  { id: 'l', position: Position.Left },
];

/** Four loose handles so connections can leave or enter from any side. */
export function NodeHandles() {
  return (
    <>
      {SIDES.map((s) => (
        <Handle key={s.id} id={s.id} type="source" position={s.position} className="st-handle" />
      ))}
    </>
  );
}
