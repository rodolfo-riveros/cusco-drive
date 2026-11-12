// Geografía real: rutas por calle (OSRM), nombres de lugares (Nominatim / OpenStreetMap) y GPS.
// Servicios públicos gratuitos: adecuados para un prototipo. En producción usar un servidor propio
// (OSRM/Valhalla) o un proveedor con contrato.
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { PLACES, URUBAMBA_CENTER } from '../data/mock';
import { haversineKm } from './pricing';

const UA = { 'User-Agent': 'CuscoDrive-Prototipo/1.0', 'Accept-Language': 'es' };
const routeCache = new Map();

const key = (p) => `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`;

/** Línea recta de respaldo si no hay internet. */
const straight = (a, b) => ({ km: Math.max(0.3, haversineKm(a, b) * 1.3), minutes: null, coords: [a, b], real: false });

/** Ruta en auto por calles reales. Devuelve { km, minutes, coords: [{latitude, longitude}], real } */
export async function fetchRoute(a, b) {
  if (!a || !b) return null;
  const k = key(a) + '>' + key(b);
  if (routeCache.has(k)) return routeCache.get(k);
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${a.longitude},${a.latitude};${b.longitude},${b.latitude}?overview=full&geometries=geojson`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 7000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    const j = await res.json();
    const r = j.routes?.[0];
    if (!r) throw new Error('sin ruta');
    const out = {
      km: Math.max(0.2, r.distance / 1000),
      minutes: Math.max(1, Math.round(r.duration / 60)),
      coords: r.geometry.coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng })),
      real: true,
    };
    routeCache.set(k, out);
    return out;
  } catch {
    return straight(a, b);
  }
}

/** Nombre de un punto: primero lugares conocidos cercanos, luego OpenStreetMap. */
export async function placeName(p) {
  const near = PLACES.map((pl) => ({ pl, d: haversineKm(pl, p) })).sort((x, y) => x.d - y.d)[0];
  if (near && near.d < 0.12) return { name: near.pl.name, sub: near.pl.sub };
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${p.latitude}&lon=${p.longitude}&zoom=18&addressdetails=1`, { headers: Platform.OS === 'web' ? undefined : UA });
    const j = await res.json();
    const a = j.address || {};
    const name = a.road ? `${a.road}${a.house_number ? ' ' + a.house_number : ''}` : j.name || a.neighbourhood || a.suburb || 'Punto en el mapa';
    const sub = [a.neighbourhood || a.suburb || a.village || a.hamlet, a.town || a.city || a.county].filter(Boolean).join(', ');
    return { name, sub: sub || 'Urubamba' };
  } catch {
    return { name: 'Punto en el mapa', sub: `${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}` };
  }
}

/** Búsqueda de lugares reales alrededor de Urubamba. */
export async function searchPlaces(q) {
  if (!q || q.trim().length < 3) return [];
  const c = URUBAMBA_CENTER;
  const vb = `${c.longitude - 0.12},${c.latitude + 0.08},${c.longitude + 0.12},${c.latitude - 0.08}`;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&bounded=1&viewbox=${vb}&q=${encodeURIComponent(q)}`, { headers: Platform.OS === 'web' ? undefined : UA });
    const j = await res.json();
    return j.map((r) => ({
      id: 'osm' + r.place_id,
      name: r.name || r.display_name.split(',')[0],
      sub: r.display_name.split(',').slice(1, 3).join(',').trim(),
      icon: 'location',
      latitude: Number(r.lat),
      longitude: Number(r.lon),
    }));
  } catch {
    return [];
  }
}

/** Posición GPS actual del celular / navegador. */
export async function currentPosition() {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') throw new Error('Permiso de ubicación denegado');
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy };
}

/** Punto a una fracción k (0..1) del recorrido de una polilínea. */
export function pointAlong(coords, k) {
  if (!coords?.length) return null;
  if (coords.length === 1 || k <= 0) return coords[0];
  if (k >= 1) return coords[coords.length - 1];
  const seg = [];
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    const d = haversineKm(coords[i - 1], coords[i]);
    seg.push(d);
    total += d;
  }
  let target = total * k;
  for (let i = 0; i < seg.length; i++) {
    if (target <= seg[i] || i === seg.length - 1) {
      const f = seg[i] ? Math.min(1, target / seg[i]) : 0;
      const a = coords[i], b = coords[i + 1];
      return { latitude: a.latitude + (b.latitude - a.latitude) * f, longitude: a.longitude + (b.longitude - a.longitude) * f };
    }
    target -= seg[i];
  }
  return coords[coords.length - 1];
}

/** Recorte de la polilínea desde la fracción k hasta el final (ruta que falta). */
export function remainingRoute(coords, k) {
  if (!coords?.length) return coords;
  const p = pointAlong(coords, k);
  const idx = Math.min(coords.length - 1, Math.max(1, Math.round(k * (coords.length - 1))));
  return [p, ...coords.slice(idx)];
}

/** Sigue el GPS en vivo (para el conductor). Devuelve una función para detenerlo. */
export async function watchPosition(onPos) {
  const perm = await Location.requestForegroundPermissionsAsync();
  if (perm.status !== 'granted') throw new Error('Permiso de ubicación denegado');
  const sub = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 2000 },
    (pos) => onPos({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy })
  );
  return () => sub.remove();
}

/** Abre Google Maps (app o web) con la ruta en auto desde `from` hasta `to`. No requiere API key. */
export function googleMapsUrl(from, to) {
  const o = from ? `&origin=${from.latitude},${from.longitude}` : '';
  return `https://www.google.com/maps/dir/?api=1${o}&destination=${to.latitude},${to.longitude}&travelmode=driving&dir_action=navigate`;
}
