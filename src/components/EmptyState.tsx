import { ImagePlus } from 'lucide-react';

export function EmptyState({ onImport }: { onImport: () => void }) {
  return (
    <div className="empty">
      <div className="empty-card">
        <div className="empty-icon"><ImagePlus size={22} aria-hidden /></div>
        <h2>Start with a screenshot</h2>
        <p>Paste one with Ctrl+V, drop an image onto the canvas, or import a file. Notes and tasks branch out from there.</p>
        <button type="button" className="btn btn-primary" onClick={onImport}>Import image</button>
      </div>
    </div>
  );
}
