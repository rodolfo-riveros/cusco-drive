// Libro de movimientos (auditable): solo se agregan asientos, nunca se borran ni editan.
// Cada operación es un grupo de asientos que suma cero (partida doble simplificada).
import { round2 } from './pricing';

export const ACCOUNTS = {
  pasajero: 'Billetera del pasajero',
  conductor: 'Billetera del conductor',
  conductores: 'Billeteras de otros conductores',
  retenido: 'Pagos retenidos',
  plataforma: 'Cusco Drive (margen)',
  externo: 'Pasarela / fuera de la app',
};

export const TYPE_LABEL = {
  recarga: 'Recarga',
  bono_recarga: 'Bono por recarga',
  retencion: 'Pago retenido',
  reembolso: 'Reembolso',
  liberacion: 'Pago liberado',
  margen: 'Margen',
  vale: 'Vale / descuento',
  penalidad: 'Penalidad por cancelación',
  bono: 'Bono',
  retiro: 'Retiro',
  comision_retiro: 'Costo de retiro',
  pasarela: 'Comisión de pasarela',
  historico: 'Saldo inicial (demo)',
};

let seq = 0;
export const uid = (p = 'id') => `${p}${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/**
 * Registra un grupo de asientos. entries: [{ account, type, amount, label }]
 * Lanza error si el grupo no cuadra (protege contra bugs de dinero).
 */
export function post(ledger, entries, { tripId = null, date = new Date().toISOString() } = {}) {
  const clean = entries.filter((e) => Math.abs(e.amount) > 0.0001);
  const sum = round2(clean.reduce((a, e) => a + e.amount, 0));
  if (Math.abs(sum) > 0.001) throw new Error(`Asiento descuadrado (${sum})`);
  const group = uid('g');
  const rows = clean.map((e) => ({ id: uid('m'), group, date, tripId, ...e, amount: round2(e.amount) }));
  return [...rows.reverse(), ...ledger];
}

export function balances(ledger) {
  const b = { pasajero: 0, conductor: 0, conductores: 0, retenido: 0, plataforma: 0, externo: 0 };
  for (const m of ledger) b[m.account] = round2((b[m.account] || 0) + m.amount);
  return b;
}

export const forAccount = (ledger, account) => ledger.filter((m) => m.account === account);

/** Retenido de un viaje concreto (lo que sigue bloqueado). */
export const heldFor = (ledger, tripId) =>
  round2(ledger.filter((m) => m.account === 'retenido' && m.tripId === tripId).reduce((a, m) => a + m.amount, 0));

/** Métricas de la plataforma a partir del libro. */
export function platformStats(ledger) {
  let margin = 0, rewards = 0, gateway = 0, withdrawFees = 0;
  for (const m of ledger) {
    if (m.account !== 'plataforma') continue;
    if (m.type === 'margen') margin += m.amount;
    else if (m.type === 'vale' || m.type === 'bono' || m.type === 'bono_recarga') rewards += -m.amount;
    else if (m.type === 'pasarela') gateway += -m.amount;
    else if (m.type === 'comision_retiro') withdrawFees += m.amount;
    else if (m.type === 'historico') margin += m.amount;
  }
  return {
    margin: round2(margin),
    rewards: round2(rewards),
    gateway: round2(gateway),
    withdrawFees: round2(withdrawFees),
    net: round2(margin - rewards - gateway + withdrawFees),
  };
}
