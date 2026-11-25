import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { EMPTY_FILTERS, filtersFromUrl, toQuery, fetchMeta } from './api.js';
import { useApi } from './hooks.js';

const Ctx = createContext(null);
export const useFilters = () => useContext(Ctx);

// One filter state shared by every page. It is mirrored into the URL query string, so any view of any
// page can be bookmarked / shared, and navigating between pages keeps the active filters.
export function FiltersProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [filters, setFilters] = useState(() => filtersFromUrl(location.search));
  const { data: meta } = useApi((signal) => fetchMeta(signal), [], { debounce: 0 });

  useEffect(() => {
    const q = toQuery(filters);
    const search = q ? `?${q}` : '';
    if (search !== location.search.replace(/\+/g, '%20') && search !== location.search) {
      navigate({ pathname: location.pathname, search }, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, location.pathname]);

  const toggle = useCallback((key, value) => setFilters((f) => ({
    ...f, [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
  })), []);
  const reset = useCallback(() => setFilters(EMPTY_FILTERS), []);
  const active = useMemo(() => JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS), [filters]);

  const value = useMemo(() => ({ filters, setFilters, toggle, reset, active, meta }), [filters, toggle, reset, active, meta]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
