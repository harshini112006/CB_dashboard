import { useEffect, useRef, useState } from 'react';

// ---- tiny global "requests in flight" store, drives the thin progress bar at the top of the page
let pending = 0;
const subs = new Set();
const emit = () => subs.forEach((f) => f());
export const subscribePending = (f) => { subs.add(f); return () => subs.delete(f); };
export const getPending = () => pending;

// Loads data whenever `deps` change. Debounced; older in-flight requests are aborted so a slow response can't
// overwrite a newer one; previous data is kept (loading=true) so the UI dims instead of flashing empty.
export function useApi(load, deps, { debounce = 120 } = {}) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    const ac = new AbortController();
    let open = true;
    pending += 1; emit();
    const done = () => { if (open) { open = false; pending -= 1; emit(); } };
    setState((s) => ({ ...s, loading: true }));
    const t = setTimeout(() => {
      loadRef.current(ac.signal)
        .then((data) => setState({ data, loading: false, error: '' }))
        .catch((e) => { if (e.name !== 'AbortError') setState((s) => ({ ...s, loading: false, error: e.message })); })
        .finally(done);
    }, debounce);
    return () => { clearTimeout(t); ac.abort(); done(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
