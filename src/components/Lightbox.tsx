import { X } from 'lucide-react';
import { useImageUrl } from '../hooks/useImageUrl';
import { useAppStore } from '../store/useAppStore';

export function Lightbox() {
  const node = useAppStore((s) => s.nodes.find((n) => n.id === s.previewNodeId) ?? null);
  const setPreview = useAppStore((s) => s.setPreview);
  const imageId = node?.type === 'screenshot' ? node.data.imageId : null;
  const { url } = useImageUrl(imageId);
  if (!node || node.type !== 'screenshot' || !url) return null;
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={node.data.title} onClick={() => setPreview(null)}>
      <button type="button" className="icon-btn lightbox-close" onClick={() => setPreview(null)} aria-label="Close preview" autoFocus>
        <X size={18} />
      </button>
      <img src={url} alt={node.data.title} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}
