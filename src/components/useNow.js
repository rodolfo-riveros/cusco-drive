import { useEffect, useState } from 'react';

/** Reloj que se actualiza mientras `active` sea verdadero (para cuentas regresivas). */
export function useNow(active = true, ms = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const iv = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(iv);
  }, [active, ms]);
  return now;
}
