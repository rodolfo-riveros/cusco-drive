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
/** Margen de Cusco Drive sobre el precio final (monto fijo o porcentaje, por categoría). */
export function marginFor(config, category, final) {
  const m = config.margin[category];
  return m.type === 'fixed' ? Math.min(m.value, final) : round10((final * m.value) / 100);
}

/** ¿El punto está dentro del centro de Urubamba? */
export const inCenter = (config, p) => haversineKm(URUBAMBA_CENTER, p) <= config.centerRadiusKm;

/**
 * Precio final (lo que paga el pasajero). Lo calcula el sistema: nadie lo edita.
 *  - Recorrido dentro del centro de Urubamba → tarifa del centro (ej. mototaxi S/ 3.00).
 *  - Si recojo o destino salen del centro → + S/ 1.00 (configurable) y luego sube por tramos
 *    según la distancia real por calle o lo lejos que está del centro (lo que dé más).
 *  - El precio incluye el margen de Cusco Drive; el conductor recibe el resto.
 * km: distancia real de la ruta (OSRM). Si no llega, se estima.
 */
export function calcPrice(config, { category, origin, dest, km, minutes, cargo = {}, luggage = false, date = new Date() }) {
  const t = config.tariffs[category];
  const dist = km || routeKm(origin, dest);
  const round = config.rounding === '0.50';
  const extras = [];
  const centro = inCenter(config, origin) && inCenter(config, dest);

  let fare = t.centerFare;
  let zone = 'Centro de Urubamba';
  if (!centro) {
    // Por zona: qué tan lejos del centro está el punto más alejado
    const far = Math.max(haversineKm(URUBAMBA_CENTER, origin), haversineKm(URUBAMBA_CENTER, dest));
    const zoneSteps = Math.floor(Math.max(0, far - config.centerRadiusKm) / t.stepKm);
    const zoneFare = t.centerFare + config.leaveCenterExtra + zoneSteps * t.stepAmount;
    // Por distancia: recorridos largos aunque estén cerca del centro
    const distSteps = Math.ceil(Math.max(0, dist - config.centerTripKm) / t.stepKm);
    const distFare = t.centerFare + distSteps * t.stepAmount;
    fare = Math.max(zoneFare, distFare);
    zone = 'Fuera del centro';
    extras.push({ label: `Sale del centro (+${config.leaveCenterExtra.toFixed(2)})`, amount: round2(fare - t.centerFare) });
  } else if (dist > config.centerTripKm) {
    const steps = Math.ceil((dist - config.centerTripKm) / t.stepKm);
    fare = t.centerFare + steps * t.stepAmount;
    extras.push({ label: 'Recorrido largo en el centro', amount: round2(fare - t.centerFare) });
  }

  if (category === 'motocarga' || category === 'mudanza') {
    const add = config.cargoSizes[category][cargo.size] || 0;
    if (add) extras.push({ label: `Carga ${cargo.size}`, amount: add });
    fare += add;
  }
  if (category === 'mudanza' && cargo.helpers) {
    const add = cargo.helpers * config.helperPrice;
    extras.push({ label: `${cargo.helpers} ayudante(s)`, amount: add });
    fare += add;
  }
  if (config.nightSurcharge && isNight(date)) {
    const s = config.surcharges.night[category];
    fare += s;
    extras.push({ label: 'Recargo nocturno', amount: s });
  }
  if (config.raining) {
    const s = config.surcharges.rain[category];
    fare += s;
    extras.push({ label: 'Recargo por lluvia', amount: s });
  }
  if (luggage && category === 'taxi') {
    fare += config.surcharges.luggage;
    extras.push({ label: 'Equipaje', amount: config.surcharges.luggage });
  }

  let final = round2(Math.max(fare, t.min));
  if (round) final = ceil50(final);
  const margin = marginFor(config, category, final);
  const driverFare = round2(final - margin);

  return {
    km: Math.round(dist * 10) / 10,
    minutes: minutes || Math.max(2, Math.round((dist / (category === 'mudanza' ? 22 : 20)) * 60)),
    driverFare,
    margin,
    extras,
    final,
    zone,
    centro,
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
