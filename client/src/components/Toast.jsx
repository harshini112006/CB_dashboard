import { createContext, useCallback, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icons.jsx';

const Ctx = createContext(() => {});
export const useToast = () => useContext(Ctx);

// Small, self-dismissing notifications ("Link copied", "Filters cleared"...).
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((msg, icon = 'check') => {
    const id = `${Date.now()}-${Math.random()}`;
    setItems((t) => [...t.slice(-2), { id, msg, icon }]);
    setTimeout(() => setItems((t) => t.map((x) => (x.id === id ? { ...x, out: true } : x))), 2600);
    setTimeout(() => setItems((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      {createPortal(
        <div className="toasts" role="status" aria-live="polite">
          {items.map((t) => (
            <div key={t.id} className={`toast ${t.out ? 'out' : ''}`}><span className="toast-ico"><Icon name={t.icon} size={15} /></span>{t.msg}</div>
          ))}
        </div>,
        document.body,
      )}
    </Ctx.Provider>
  );
}
