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

export const round10 = (n) => Math.round(n * 10) / 10;
const ceil50 = (n) => Math.ceil(n * 2 - 1e-9) / 2;

export const isNight = (d = new Date()) => {
  const h = d.getHours();
  return h >= 22 || h < 5;
};

/**
 * Calcula el precio final con el tarifario.
 * Precio final = tarifa del conductor + comisión Cusco Drive.
 * El pasajero y el conductor NO pueden editarlo.
 */
export function calcPrice(config, { category, origin, dest, cargo = {}, luggage = false, date = new Date() }) {
  const t = config.tariffs[category];
  const km = routeKm(origin, dest);

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

  // Los recargos van para el conductor
  const driverFare = round10(fare + surcharge);

  const cm = config.commission[category];
  let commission = cm.type === 'fixed' ? cm.value : round10((driverFare * cm.value) / 100);

  let final = round10(driverFare + commission);
  if (config.rounding === '0.50') {
    final = ceil50(final);
    commission = round10(final - driverFare);
  }

  return {
    km: Math.round(km * 10) / 10,
    minutes: Math.max(3, Math.round((km / (category === 'mudanza' ? 22 : 20)) * 60)),
    driverFare,
    commission,
    surcharge: round10(surcharge),
    extras,
    final,
  };
}

/** Descuento de un cupón: tope de valor, sin superar el precio */
export function couponDiscount(config, coupon, final) {
  if (!coupon) return 0;
  return round10(Math.min(coupon.amount, config.couponMaxValue, final));
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
