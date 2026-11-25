import { useEffect, useRef, useState } from 'react';

// Loads data whenever `deps` change. Debounced; older in-flight requests are aborted so a slow response can't
// overwrite a newer one; previous data is kept (loading=true) so the UI dims instead of flashing empty.
export function useApi(load, deps, { debounce = 120 } = {}) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    const ac = new AbortController();
    setState((s) => ({ ...s, loading: true }));
    const t = setTimeout(() => {
      loadRef.current(ac.signal)
        .then((data) => setState({ data, loading: false, error: '' }))
        .catch((e) => { if (e.name !== 'AbortError') setState((s) => ({ ...s, loading: false, error: e.message })); });
    }, debounce);
    return () => { clearTimeout(t); ac.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
