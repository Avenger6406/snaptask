import { useEffect, useState } from 'react';
import { loadImageUrl } from '../lib/imageStore';

export type ImageStatus = 'loading' | 'ready' | 'missing';

export function useImageUrl(id: string | null): { url: string | null; status: ImageStatus } {
  const [state, setState] = useState<{ id: string | null; url: string | null; status: ImageStatus }>({
    id, url: null, status: id ? 'loading' : 'missing',
  });

  useEffect(() => {
    let cancelled = false;
    if (!id) { setState({ id, url: null, status: 'missing' }); return; }
    setState((s) => (s.id === id && s.status === 'ready' ? s : { id, url: null, status: 'loading' }));
    void loadImageUrl(id).then((url) => {
      if (!cancelled) setState({ id, url, status: url ? 'ready' : 'missing' });
    });
    return () => { cancelled = true; };
  }, [id]);

  return state.id === id ? { url: state.url, status: state.status } : { url: null, status: id ? 'loading' : 'missing' };
}
