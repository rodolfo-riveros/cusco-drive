import { URUBAMBA_CENTER, SERVICE_RADIUS_KM } from '../data/mock';

const toRad = (d) => (d * Math.PI) / 180;

export function haversineKm(a, b) {
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Distancia aproximada por pista (factor de ruta 1.3)
export const routeKm = (a, b) => Math.max(0.3, haversineKm(a, b) * 1.3);

export const inServiceArea = (p) => haversineKm(URUBAMBA_CENTER, p) <= SERVICE_RADIUS_KM;

export const round2 = (n) => Math.round(n * 100) / 100;
export const round10 = (n) => Math.round(n * 10) / 10;
const ceil50 = (n) => Math.ceil(n * 2 - 1e-9) / 2;

export const isNight = (d = new Date()) => {
  const h = d.getHours();
  return h >= 22 || h < 5;
};

/** Margen de Cusco Drive para una tarifa de conductor (monto fijo o porcentaje, por categoría). */
export function marginFor(config, category, driverFare) {
  const m = config.margin[category];
  return m.type === 'fixed' ? m.value : round2((driverFare * m.value) / 100);
}

/**
 * Precio final con el tarifario. Lo calcula el sistema: ni pasajero ni conductor lo editan.
 *   precio final = tarifa del conductor + margen de Cusco Drive
 * Con redondeo a S/ 0.50 la tarifa del conductor queda en múltiplos de 0.50 y,
 * si el margen es porcentual, la diferencia del redondeo va al margen.
 */
export function calcPrice(config, { category, origin, dest, cargo = {}, luggage = false, date = new Date() }) {
  const t = config.tariffs[category];
  const km = routeKm(origin, dest);
  const round = config.rounding === '0.50';

  let fare = t.base + t.perKm * km;
  const extras = [];

  if (category === 'motocarga' || category === 'mudanza') {
    const sizes = config.cargoSizes[category];
    const add = sizes[cargo.size] || 0;
    if (add) extras.push({ label: `Carga ${cargo.size}`, amount: add });
    fare += add;
  }
  if (category === 'mudanza' && cargo.helpers) {
    const add = cargo.helpers * config.helperPrice;
    extras.push({ label: `${cargo.helpers} ayudante(s)`, amount: add });
    fare += add;
  }
  fare = Math.max(fare, t.min);

  let surcharge = 0;
  if (isNight(date)) {
    const s = config.surcharges.night[category];
    surcharge += s;
    extras.push({ label: 'Recargo nocturno', amount: s });
  }
  if (config.raining) {
    const s = config.surcharges.rain[category];
    surcharge += s;
    extras.push({ label: 'Recargo por lluvia', amount: s });
  }
  if (luggage && category === 'taxi') {
    surcharge += config.surcharges.luggage;
    extras.push({ label: 'Equipaje', amount: config.surcharges.luggage });
  }

  // Los recargos son parte de la tarifa del conductor
  let driverFare = round2(fare + surcharge);
  if (round) driverFare = ceil50(driverFare);

  let margin = marginFor(config, category, driverFare);
  let final = round2(driverFare + margin);
  if (round) {
    final = ceil50(final);
    margin = round2(final - driverFare);
  }

  return {
    km: Math.round(km * 10) / 10,
    minutes: Math.max(3, Math.round((km / (category === 'mudanza' ? 22 : 20)) * 60)),
    driverFare,
    margin,
    surcharge: round2(surcharge),
    extras,
    final,
  };
}

/** Descuento de un vale: con tope de valor y sin superar el margen + tarifa. */
export function couponDiscount(config, coupon, final) {
  if (!coupon) return 0;
  return round2(Math.min(coupon.amount, config.couponMaxValue, final));
}

export function couponValid(c) {
  return !c.used && new Date(c.expiresAt) > new Date();
}

export const fmtDate = (iso) => {
  const d = new Date(iso);
  const dd = d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
  const hh = d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  return `${dd} · ${hh}`;
};

export const fmtClock = (secs) => {
  const s = Math.max(0, Math.round(secs));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
