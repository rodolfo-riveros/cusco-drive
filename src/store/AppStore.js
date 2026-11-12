import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Vibration } from 'react-native';
import {
  INITIAL_CONFIG, INITIAL_HISTORY, INITIAL_DISPUTES, INITIAL_COUPONS, INITIAL_DRIVER, INITIAL_EARNINGS_WEEK, SEED_LEDGER_EVENTS,
  PENDING_DRIVERS, DRIVERS, PLACES, PASSENGER_NAMES, URUBAMBA_CENTER, DEMO_SPEED,
} from '../data/mock';
import { calcPrice, couponDiscount, couponValid, inServiceArea, haversineKm, round2 } from '../logic/pricing';
import { post, balances, heldFor, platformStats, uid } from '../logic/ledger';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);
const daysFromNow = (n) => {
  const t = new Date();
  t.setDate(t.getDate() + n);
  return t;
};
const lerp = (a, b, k) => ({
  latitude: a.latitude + (b.latitude - a.latitude) * k,
  longitude: a.longitude + (b.longitude - a.longitude) * k,
});
/** Convierte minutos del negocio a milisegundos del demo (acelerado). */
export const demoMs = (minutes) => (minutes * 60 * 1000) / DEMO_SPEED;

function seedLedger() {
  let l = [];
  for (const ev of SEED_LEDGER_EVENTS) l = post(l, ev.entries, { tripId: ev.tripId || null, date: ev.date });
  return l;
}

const initialState = {
  onboarded: false,
  session: { loggedIn: false, phone: '', role: null },
  config: INITIAL_CONFIG,
  ledger: seedLedger(),
  passenger: {
    name: 'Pol Quispe',
    points: 17,
    coupons: INITIAL_COUPONS,
    history: [...INITIAL_HISTORY].sort((a, b) => b.date.localeCompare(a.date)),
    referralCode: 'POL-URU',
    usedReferral: false,
    referralsDone: 2,
    streak: [dayKey(daysFromNow(-2)), dayKey(daysFromNow(-1))],
    streakRewarded: false,
    cancellations: 0,
    recent: ['mercado', 'terminal', 'hospital'],
    saved: [
      { label: 'Casa', icon: 'home', placeId: 'chicon' },
      { label: 'Trabajo', icon: 'briefcase', placeId: 'hospital' },
    ],
    contacts: [
      { name: 'Mamá', phone: '984111222' },
      { name: 'Hermano', phone: '984333444' },
    ],
  },
  trip: null,
  driver: {
    status: 'none', // none | pending | approved | rejected
    rejectReason: '',
    profile: INITIAL_DRIVER,
    available: false,
    earningsWeek: INITIAL_EARNINGS_WEEK,
    bonusesPaidToday: [],
    accepted: 132,
    cancelled: 3,
    monthWithdrawals: 1,
    incoming: null,
    active: null,
    position: { latitude: -13.3041, longitude: -72.1171 },
  },
  disputes: INITIAL_DISPUTES,
  pendingDrivers: PENDING_DRIVERS,
  toast: null,
};

// ------------------------------------------------------------------
// Funciones puras de dinero (cada una devuelve un estado nuevo)
// ------------------------------------------------------------------

/** Libera el pago retenido de un viaje del pasajero: conductor recibe su tarifa, Cusco Drive su margen. */
function releasePassengerPayment(s, t, how) {
  const held = heldFor(s.ledger, t.id);
  const tramo = `${t.origin.name} → ${t.dest.name}`;
  const ledger = post(
    s.ledger,
    [
      { account: 'retenido', type: 'liberacion', amount: -held, label: `Pago liberado (${how}) · ${tramo}` },
      { account: 'conductores', type: 'liberacion', amount: t.price.driverFare, label: `Pago a ${t.driver?.name || 'conductor'}` },
      { account: 'plataforma', type: 'margen', amount: t.price.margin, label: `Margen · ${tramo}` },
      { account: 'plataforma', type: 'vale', amount: -t.discount, label: `Vale usado · ${tramo}` },
      // Ajuste por redondeo si lo retenido no coincide exactamente (no debería pasar)
      { account: 'plataforma', type: 'margen', amount: round2(held - (t.price.driverFare + t.price.margin - t.discount)), label: 'Ajuste de redondeo' },
    ],
    { tripId: t.id }
  );
  return { ...s, ledger };
}

/** Puntos, vales, racha e historial al completar un viaje del pasajero. */
function completePassengerTrip(s, how) {
  const trip = s.trip;
  let st = releasePassengerPayment(s, trip, how);
  const p = st.passenger;
  const cfg = st.config;
  const newCoupons = p.coupons.map((c) => (c.id === trip.couponId ? { ...c, used: true } : c));
  const points = p.points + 1;
  const earned = [];
  if (points % cfg.pointsPerReward === 0) {
    const c = {
      id: uid('c'), title: `Premio por ${cfg.pointsPerReward} viajes`, type: 'points',
      amount: cfg.pointsRewardAmount, expiresAt: daysFromNow(cfg.couponExpiryDays).toISOString(), used: false,
    };
    newCoupons.push(c);
    earned.push(c.title);
  }
  const streak = p.streak.includes(dayKey()) ? p.streak : [...p.streak, dayKey()];
  let streakRewarded = p.streakRewarded;
  if (streak.length >= 3 && !streakRewarded) {
    streakRewarded = true;
    newCoupons.push({ id: uid('c'), title: 'Racha semanal (3 días)', type: 'streak', amount: 1, expiresAt: daysFromNow(14).toISOString(), used: false });
    earned.push('Racha semanal');
  }
  const coupon = p.coupons.find((c) => c.id === trip.couponId);
  const record = {
    id: trip.id, date: new Date().toISOString(), category: trip.category,
    origin: trip.origin.name, dest: trip.dest.name, driverName: trip.driver?.name, plate: trip.driver?.plate,
    driverFare: trip.price.driverFare, margin: trip.price.margin, discount: trip.discount,
    final: trip.price.final, paid: trip.toPay, status: 'completed', rating: null, coupon: coupon?.title, released: how,
  };
  return {
    ...st,
    passenger: { ...p, points, coupons: newCoupons, history: [record, ...p.history], streak, streakRewarded },
    trip: { ...trip, status: 'finished', earned, pointsAfter: points, releasedHow: how },
  };
}

function refundHeld(s, tripId, label, fee = 0, feeLabel = '') {
  const held = heldFor(s.ledger, tripId);
  if (held <= 0) return s;
  const f = Math.min(fee, held);
  const ledger = post(
    s.ledger,
    [
      { account: 'retenido', type: 'reembolso', amount: -held, label },
      { account: 'pasajero', type: 'reembolso', amount: held - f, label },
      { account: 'conductores', type: 'penalidad', amount: f, label: feeLabel },
    ],
    { tripId }
  );
  return { ...s, ledger };
}

/** Bonos diarios del conductor: solo con buena calificación y pocas cancelaciones. */
function driverBonusEligible(s) {
  const d = s.driver;
  const cancelPct = d.accepted ? (d.cancelled / d.accepted) * 100 : 0;
  return d.profile.rating >= s.config.bonusMinRating && cancelPct <= s.config.bonusMaxCancelPct;
}

function releaseDriverPayment(s, how) {
  const d = s.driver;
  const a = d.active;
  if (!a || a.stage !== 'awaitingRelease') return { state: s, bonus: 0 };
  const held = heldFor(s.ledger, a.id);
  const tramo = `${a.origin.name} → ${a.dest.name}`;
  let ledger = post(
    s.ledger,
    [
      { account: 'retenido', type: 'liberacion', amount: -held, label: `Pago liberado (${how}) · ${tramo}` },
      { account: 'conductor', type: 'liberacion', amount: a.price.driverFare, label: `Viaje ${tramo}` },
      { account: 'plataforma', type: 'margen', amount: a.price.margin, label: `Margen · ${tramo}` },
      { account: 'plataforma', type: 'vale', amount: -a.discount, label: `Vale del pasajero · ${tramo}` },
      { account: 'plataforma', type: 'margen', amount: round2(held - (a.price.driverFare + a.price.margin - a.discount)), label: 'Ajuste de redondeo' },
    ],
    { tripId: a.id }
  );
  const today = d.earningsWeek[6];
  const newTrips = today.trips + 1;
  let bonus = 0;
  const paid = [...d.bonusesPaidToday];
  const eligible = driverBonusEligible(s);
  for (const b of s.config.driverDailyBonuses) {
    if (today.trips < b.trips && newTrips >= b.trips && !paid.includes(b.trips) && eligible) {
      ledger = post(ledger, [
        { account: 'plataforma', type: 'bono', amount: -b.amount, label: `Bono del día · ${b.trips} viajes` },
        { account: 'conductor', type: 'bono', amount: b.amount, label: `Bono del día · ${b.trips} viajes` },
      ]);
      bonus += b.amount;
      paid.push(b.trips);
    }
  }
  const earningsWeek = d.earningsWeek.map((e, i) =>
    i === 6 ? { trips: newTrips, earned: round2(e.earned + a.price.driverFare), bonus: round2(e.bonus + bonus) } : e
  );
  return {
    bonus,
    state: {
      ...s,
      ledger,
      driver: {
        ...d,
        earningsWeek,
        bonusesPaidToday: paid,
        profile: { ...d.profile, totalTrips: d.profile.totalTrips + 1 },
        active: { ...a, stage: 'released', releasedHow: how, bonus },
      },
    },
  };
}

// ------------------------------------------------------------------

export function AppProvider({ children }) {
  const [state, setState] = useState(initialState);
  const ref = useRef(initialState);
  const toastTimer = useRef(null);

  // Toda escritura pasa por aquí: ref siempre tiene el último estado (evita pisar actualizaciones de la simulación)
  const commit = useCallback((next) => {
    ref.current = next;
    setState(next);
  }, []);
  const update = useCallback((fn) => commit(fn(ref.current)), [commit]);

  const toast = useCallback((msg, type = 'info') => {
    clearTimeout(toastTimer.current);
    update((s) => ({ ...s, toast: { msg, type, id: Date.now() } }));
    toastTimer.current = setTimeout(() => update((s) => ({ ...s, toast: null })), 3000);
  }, [update]);

  const patch = (key, fnOrObj) =>
    update((s) => ({ ...s, [key]: typeof fnOrObj === 'function' ? fnOrObj(s[key], s) : { ...s[key], ...fnOrObj } }));

  const wallets = useMemo(() => balances(state.ledger), [state.ledger]);
  const stats = useMemo(() => platformStats(state.ledger), [state.ledger]);

  const rewardsBudget = (s = ref.current) => {
    const st = platformStats(s.ledger);
    return round2((st.margin * s.config.rewardsCapPct) / 100 - st.rewards);
  };

  // ---------------- Sesión ----------------
  const completeOnboarding = () => update((s) => ({ ...s, onboarded: true }));
  const login = (phone, role) => patch('session', { loggedIn: true, phone, role });
  const setRole = (role) => patch('session', { role });
  const logout = () =>
    update((s) => ({ ...s, session: { loggedIn: false, phone: '', role: null }, driver: { ...s.driver, available: false, incoming: null } }));

  // ---------------- Admin ----------------
  const setConfig = (fn) => patch('config', (c) => fn(c));
  const approvePending = (id) => update((s) => ({ ...s, pendingDrivers: s.pendingDrivers.filter((d) => d.id !== id) }));

  const resolveDispute = (id, decision) => {
    const s = ref.current;
    const dsp = s.disputes.find((x) => x.id === id);
    if (!dsp || dsp.status !== 'open') return;
    let next = s;
    if (decision === 'driver') {
      next = releasePassengerPayment(s, dsp.trip, 'revisión admin');
    } else {
      next = refundHeld(s, dsp.trip.id, `Reembolso por reclamo · ${dsp.trip.origin.name} → ${dsp.trip.dest.name}`);
    }
    next = {
      ...next,
      disputes: next.disputes.map((x) => (x.id === id ? { ...x, status: decision === 'driver' ? 'paid' : 'refunded', resolvedAt: new Date().toISOString() } : x)),
      passenger: {
        ...next.passenger,
        history: next.passenger.history.map((h) =>
          h.id === dsp.trip.id ? { ...h, status: decision === 'driver' ? 'completed' : 'refunded', paid: decision === 'driver' ? h.paid : 0, refund: decision === 'driver' ? 0 : h.paid } : h
        ),
      },
    };
    commit(next);
    toast(decision === 'driver' ? 'Reclamo cerrado: pago liberado al conductor' : 'Reclamo aceptado: dinero devuelto al pasajero', 'success');
  };

  // ---------------- Billetera del pasajero ----------------
  const rechargePassenger = (amount, method) => {
    const s = ref.current;
    const cfg = s.config;
    const bonus = [...cfg.rechargeBonuses].sort((a, b) => b.min - a.min).find((b) => amount >= b.min)?.bonus || 0;
    const fee = round2((amount * cfg.gatewayFeePct) / 100);
    let ledger = post(s.ledger, [
      { account: 'externo', type: 'recarga', amount: -amount, label: `Recarga por ${method}` },
      { account: 'pasajero', type: 'recarga', amount, label: `Recarga por ${method}` },
    ]);
    ledger = post(ledger, [
      { account: 'plataforma', type: 'pasarela', amount: -fee, label: `Comisión pasarela (recarga ${method} S/ ${amount})` },
      { account: 'externo', type: 'pasarela', amount: fee, label: `Comisión pasarela (recarga ${method} S/ ${amount})` },
    ]);
    if (bonus) {
      ledger = post(ledger, [
        { account: 'plataforma', type: 'bono_recarga', amount: -bonus, label: `Bono por recargar S/ ${amount}` },
        { account: 'pasajero', type: 'bono_recarga', amount: bonus, label: `Bono por recargar S/ ${amount}` },
      ]);
    }
    commit({ ...s, ledger });
    return { bonus };
  };

  // ---------------- Viaje del pasajero ----------------
  const quote = useCallback((params) => calcPrice(ref.current.config, params), []);

  const priceWithCoupon = (s, { category, origin, dest, cargo, luggage, couponId }) => {
    const price = calcPrice(s.config, { category, origin, dest, cargo, luggage });
    const coupon = s.passenger.coupons.find((c) => c.id === couponId && couponValid(c));
    let discount = couponDiscount(s.config, coupon, price.final);
    if (discount > rewardsBudget(s)) discount = 0; // tope de premios alcanzado
    return { price, discount, toPay: round2(price.final - discount) };
  };

  const requestTrip = ({ category, origin, dest, cargo, luggage, couponId, forceNoDrivers }) => {
    const s = ref.current;
    if (!inServiceArea(origin) || !inServiceArea(dest)) {
      return { ok: false, error: 'Aún no tenemos cobertura en esa zona. Por ahora solo operamos en Urubamba.' };
    }
    const { price, discount, toPay } = priceWithCoupon(s, { category, origin, dest, cargo, luggage, couponId });
    const bal = balances(s.ledger).pasajero;
    if (bal < toPay) return { ok: false, error: 'Saldo insuficiente en tu billetera', missing: round2(toPay - bal) };
    const id = uid('t');
    const ledger = post(
      s.ledger,
      [
        { account: 'pasajero', type: 'retencion', amount: -toPay, label: `Pago retenido · ${origin.name} → ${dest.name}` },
        { account: 'retenido', type: 'retencion', amount: toPay, label: `Pago retenido · ${origin.name} → ${dest.name}` },
      ],
      { tripId: id }
    );
    const trip = {
      id, category, origin, dest, cargo, luggage, price, couponId: discount ? couponId : null,
      discount, toPay, status: 'searching', createdAt: Date.now(),
      progress: 0, driver: null, driverPos: null, forceNoDrivers: !!forceNoDrivers,
    };
    commit({
      ...s,
      ledger,
      trip,
      passenger: { ...s.passenger, recent: [dest.id, ...s.passenger.recent.filter((r) => r !== dest.id)].filter(Boolean).slice(0, 4) },
    });
    return { ok: true };
  };

  const cancelTrip = (reason) => {
    const s = ref.current;
    const t = s.trip;
    if (!t) return;
    const beforeAccept = t.status === 'searching' || t.status === 'nodrivers';
    const fee = t.status === 'arrived' ? s.config.cancelFeeArrived : 0;
    let next = refundHeld(
      s, t.id,
      beforeAccept ? `Reembolso · cancelado antes de aceptar` : `Reembolso · viaje cancelado`,
      fee, `Compensación a ${t.driver?.name || 'conductor'} por cancelación`
    );
    const held = heldFor(s.ledger, t.id);
    const p = next.passenger;
    const record = {
      id: t.id, date: new Date().toISOString(), category: t.category, origin: t.origin.name, dest: t.dest.name,
      driverName: t.driver?.name || '—', plate: t.driver?.plate || '—', driverFare: t.price.driverFare, margin: t.price.margin,
      discount: 0, final: t.price.final, paid: Math.min(fee, held), refund: round2(held - Math.min(fee, held)), status: 'cancelled',
      cancelReason: reason || 'Cancelado antes de que un conductor acepte',
    };
    next = {
      ...next,
      trip: null,
      passenger: { ...p, cancellations: beforeAccept ? p.cancellations : p.cancellations + 1, history: [record, ...p.history] },
    };
    commit(next);
    if (fee > 0) toast(`Viaje cancelado. Te devolvimos ${'S/ ' + (held - fee).toFixed(2)} (penalidad ${'S/ ' + fee.toFixed(2)} al conductor).`, 'warn');
    else toast(`Viaje cancelado. Te devolvimos S/ ${held.toFixed(2)} a tu billetera.`, 'success');
  };

  const retrySearch = (category) => {
    const s = ref.current;
    const t = s.trip;
    if (!t) return { ok: false };
    const cat = category || t.category;
    const { price, discount, toPay } = priceWithCoupon(s, { ...t, category: cat });
    const bal = balances(s.ledger).pasajero;
    if (bal < toPay) {
      toast('Saldo insuficiente para reintentar. Recarga tu billetera.', 'error');
      return { ok: false, missing: round2(toPay - bal) };
    }
    const ledger = post(
      s.ledger,
      [
        { account: 'pasajero', type: 'retencion', amount: -toPay, label: `Pago retenido (reintento) · ${t.origin.name} → ${t.dest.name}` },
        { account: 'retenido', type: 'retencion', amount: toPay, label: `Pago retenido (reintento) · ${t.origin.name} → ${t.dest.name}` },
      ],
      { tripId: t.id }
    );
    commit({ ...s, ledger, trip: { ...t, category: cat, price, discount, toPay, status: 'searching', forceNoDrivers: false, createdAt: Date.now(), refunded: false } });
    return { ok: true };
  };

  const endTrip = () => update((s) => ({ ...s, trip: null }));

  /** Regla 9: si cambia el destino se recalcula y se retiene (o devuelve) la diferencia. */
  const changeDestination = (dest) => {
    const s = ref.current;
    const t = s.trip;
    if (!t || !['assigned', 'arrived', 'ongoing'].includes(t.status)) return { ok: false };
    if (!inServiceArea(dest)) return { ok: false, error: 'Ese destino está fuera de Urubamba.' };
    const price = calcPrice(s.config, { category: t.category, origin: t.origin, dest, cargo: t.cargo, luggage: t.luggage });
    const discount = Math.min(t.discount, price.final);
    const toPay = round2(price.final - discount);
    const diff = round2(toPay - t.toPay);
    const bal = balances(s.ledger).pasajero;
    if (diff > 0 && bal < diff) return { ok: false, error: `Necesitas ${'S/ ' + diff.toFixed(2)} más en tu billetera.`, missing: round2(diff - bal) };
    let ledger = s.ledger;
    if (diff !== 0) {
      ledger = post(
        ledger,
        diff > 0
          ? [
              { account: 'pasajero', type: 'retencion', amount: -diff, label: `Diferencia por cambio de destino → ${dest.name}` },
              { account: 'retenido', type: 'retencion', amount: diff, label: `Diferencia por cambio de destino → ${dest.name}` },
            ]
          : [
              { account: 'retenido', type: 'reembolso', amount: diff, label: `Devolución por cambio de destino → ${dest.name}` },
              { account: 'pasajero', type: 'reembolso', amount: -diff, label: `Devolución por cambio de destino → ${dest.name}` },
            ],
        { tripId: t.id }
      );
    }
    const legStart = t.status === 'ongoing' ? t.driverPos : t.origin;
    commit({ ...s, ledger, trip: { ...t, dest, price, discount, toPay, legStart, progress: t.status === 'ongoing' ? 0 : t.progress } });
    return { ok: true, diff };
  };

  const confirmArrival = () => {
    const s = ref.current;
    if (s.trip?.status !== 'atDestination') return;
    commit(completePassengerTrip(s, 'confirmado por ti'));
  };

  const openDispute = (reason) => {
    const s = ref.current;
    const t = s.trip;
    if (!t || t.status !== 'atDestination') return;
    const dsp = { id: uid('dp'), trip: t, reason, amount: heldFor(s.ledger, t.id), status: 'open', createdAt: new Date().toISOString() };
    const record = {
      id: t.id, date: new Date().toISOString(), category: t.category, origin: t.origin.name, dest: t.dest.name,
      driverName: t.driver?.name, plate: t.driver?.plate, driverFare: t.price.driverFare, margin: t.price.margin,
      discount: t.discount, final: t.price.final, paid: t.toPay, status: 'disputed', disputeReason: reason,
    };
    commit({
      ...s,
      disputes: [dsp, ...s.disputes],
      trip: { ...t, status: 'disputed', disputeReason: reason },
      passenger: { ...s.passenger, history: [record, ...s.passenger.history] },
    });
  };

  const skipStage = () =>
    update((s) => {
      const t = s.trip;
      if (!t) return s;
      if (t.status === 'assigned') return { ...s, trip: { ...t, status: 'arrived', progress: 0, driverPos: t.origin } };
      if (t.status === 'arrived') return { ...s, trip: { ...t, status: 'ongoing', progress: 0, driverPos: t.origin, legStart: t.origin } };
      if (t.status === 'ongoing') return { ...s, trip: { ...t, status: 'atDestination', driverPos: t.dest, releaseAt: Date.now() + demoMs(s.config.autoReleaseMin) } };
      if (t.status === 'atDestination') return completePassengerTrip(s, 'automático');
      return s;
    });

  const rateTrip = (stars, comment, tags) =>
    update((s) => ({
      ...s,
      trip: null,
      passenger: {
        ...s.passenger,
        history: s.passenger.history.map((h) => (h.id === s.trip?.id ? { ...h, rating: stars, comment, tags } : h)),
      },
    }));

  const applyReferral = (code) => {
    const s = ref.current;
    const c = code.trim().toUpperCase();
    if (s.passenger.usedReferral) return { ok: false, error: 'Ya usaste un código de referido en este celular.' };
    if (c === s.passenger.referralCode) return { ok: false, error: 'No puedes usar tu propio código.' };
    if (!/^[A-Z]{3,}-?[A-Z0-9]{2,}$/.test(c)) return { ok: false, error: 'Código no válido. Prueba con AMIGO-10.' };
    patch('passenger', (p) => ({
      ...p,
      usedReferral: true,
      coupons: [...p.coupons, { id: uid('c'), title: `Referido ${c}`, type: 'referral', amount: 2, expiresAt: daysFromNow(60).toISOString(), used: false }],
    }));
    return { ok: true };
  };

  // Simulación del viaje del pasajero
  useEffect(() => {
    const t = state.trip;
    if (!t) return;
    const same = (s) => s.trip && s.trip.id === t.id && s.trip.status === t.status;

    if (t.status === 'searching') {
      const wait = t.forceNoDrivers ? demoMs(ref.current.config.searchTimeoutMin) : 5000;
      const timer = setTimeout(() => {
        const s = ref.current;
        if (!same(s)) return;
        if (s.trip.forceNoDrivers) {
          // Regla 8: nadie aceptó → reembolso automático y se sugiere reintentar
          const r = refundHeld(s, s.trip.id, 'Reembolso · ningún conductor aceptó');
          commit({ ...r, trip: { ...s.trip, status: 'nodrivers', refunded: true } });
          return;
        }
        const cands = DRIVERS.filter((d) => d.category === s.trip.category);
        const d = [...cands].sort((a, b) => haversineKm(a, s.trip.origin) - haversineKm(b, s.trip.origin))[0];
        const far = { latitude: s.trip.origin.latitude + 0.006, longitude: s.trip.origin.longitude - 0.005 };
        const start = haversineKm(d, s.trip.origin) < 0.25 ? far : { latitude: d.latitude, longitude: d.longitude };
        const eta = Math.max(2, Math.round(haversineKm(start, s.trip.origin) * 1.3 * 3));
        Vibration.vibrate(200);
        commit({ ...s, trip: { ...s.trip, status: 'assigned', driver: d, driverStart: start, driverPos: start, progress: 0, eta, distKm: haversineKm(start, s.trip.origin) * 1.3 } });
      }, wait);
      return () => clearTimeout(timer);
    }
    if (t.status === 'assigned' || t.status === 'ongoing') {
      const steps = t.status === 'assigned' ? 12 : 14;
      const iv = setInterval(() => {
        const s = ref.current;
        if (!same(s)) return;
        const tr = s.trip;
        const progress = Math.min(1, tr.progress + 1 / steps);
        const from = tr.status === 'assigned' ? tr.driverStart : tr.legStart || tr.origin;
        const to = tr.status === 'assigned' ? tr.origin : tr.dest;
        if (progress >= 1) {
          Vibration.vibrate(400);
          if (tr.status === 'assigned') commit({ ...s, trip: { ...tr, status: 'arrived', progress: 0, driverPos: tr.origin } });
          // Llegada: el conductor toca "Finalizar viaje" con GPS cerca del destino → empieza el plazo de reclamo
          else commit({ ...s, trip: { ...tr, status: 'atDestination', progress: 1, driverPos: tr.dest, releaseAt: Date.now() + demoMs(s.config.autoReleaseMin) } });
          return;
        }
        commit({ ...s, trip: { ...tr, progress, driverPos: lerp(from, to, progress) } });
      }, 1000);
      return () => clearInterval(iv);
    }
    if (t.status === 'arrived') {
      const timer = setTimeout(() => {
        const s = ref.current;
        if (same(s)) commit({ ...s, trip: { ...s.trip, status: 'ongoing', progress: 0, legStart: s.trip.origin } });
      }, 7000);
      return () => clearTimeout(timer);
    }
    if (t.status === 'atDestination') {
      const timer = setTimeout(() => {
        const s = ref.current;
        if (same(s)) commit(completePassengerTrip(s, 'automático'));
      }, Math.max(0, t.releaseAt - Date.now()));
      return () => clearTimeout(timer);
    }
  }, [state.trip?.id, state.trip?.status]);

  // ---------------- Conductor ----------------
  const submitDriverRegistration = (data) =>
    patch('driver', (d) => ({ ...d, status: 'pending', profile: { ...d.profile, ...data, rating: 5, totalTrips: 0, badges: ['verificado'] } }));
  const adminDecideSelf = (ok, reason) =>
    patch('driver', (d) => ({ ...d, status: ok ? 'approved' : 'rejected', rejectReason: reason || '' }));
  const enterDemoDriver = () => patch('driver', (d) => ({ ...d, status: 'approved', profile: INITIAL_DRIVER }));
  const resetDriverRegistration = () => patch('driver', (d) => ({ ...d, status: 'none', rejectReason: '' }));

  const toggleAvailable = () => {
    const d = ref.current.driver;
    patch('driver', { available: !d.available, incoming: null });
    toast(!d.available ? 'Estás disponible. Esperando solicitudes…' : 'Ya no recibirás solicitudes', !d.available ? 'success' : 'info');
  };

  const rejectIncoming = (timeout) => {
    patch('driver', { incoming: null });
    if (timeout) toast('La solicitud expiró');
  };

  const acceptIncoming = () => {
    const s = ref.current;
    const d = s.driver;
    if (!d.incoming) return;
    const a = d.incoming;
    // El pasajero ya pagó al pedir: su dinero queda retenido para este viaje
    const ledger = post(
      s.ledger,
      [
        { account: 'externo', type: 'retencion', amount: -a.toPay, label: `Pago de ${a.passenger} (billetera)` },
        { account: 'retenido', type: 'retencion', amount: a.toPay, label: `Pago retenido · ${a.origin.name} → ${a.dest.name}` },
      ],
      { tripId: a.id }
    );
    commit({ ...s, ledger, driver: { ...d, incoming: null, accepted: d.accepted + 1, active: { ...a, stage: 'toPickup', pos: d.position, legStart: d.position, progress: 0 } } });
  };

  const driverAdvance = () =>
    patch('driver', (d) => {
      const a = d.active;
      if (!a) return d;
      if (a.stage === 'toPickup') return { ...d, active: { ...a, stage: 'atPickup', pos: a.origin, progress: 0 } };
      if (a.stage === 'atPickup') return { ...d, active: { ...a, stage: 'ongoing', pos: a.origin, legStart: a.origin, progress: 0 } };
      return d;
    });

  /** Demo: salta el GPS al siguiente punto. */
  const driverJump = () =>
    patch('driver', (d) => {
      const a = d.active;
      if (!a) return d;
      const target = a.stage === 'ongoing' ? a.dest : a.origin;
      return { ...d, active: { ...a, pos: target, progress: 1 } };
    });

  /** Regla 4: finalizar solo con el GPS cerca del destino. */
  const finishDriverTrip = () => {
    const s = ref.current;
    const a = s.driver.active;
    if (!a || a.stage !== 'ongoing') return { ok: false };
    const distM = Math.round(haversineKm(a.pos, a.dest) * 1000);
    if (distM > s.config.arrivalRadiusM) return { ok: false, distM };
    commit({
      ...s,
      driver: { ...s.driver, position: a.dest, active: { ...a, stage: 'awaitingRelease', pos: a.dest, releaseAt: Date.now() + demoMs(s.config.autoReleaseMin) } },
    });
    return { ok: true };
  };

  const driverCancel = (reason) => {
    const s = ref.current;
    const a = s.driver.active;
    if (!a) return;
    // Regla 7: si cancela el conductor, reembolso total al pasajero
    const held = heldFor(s.ledger, a.id);
    const ledger = post(
      s.ledger,
      [
        { account: 'retenido', type: 'reembolso', amount: -held, label: `Reembolso a ${a.passenger} · cancelaste (${reason})` },
        { account: 'externo', type: 'reembolso', amount: held, label: `Reembolso a ${a.passenger}` },
      ],
      { tripId: a.id }
    );
    commit({ ...s, ledger, driver: { ...s.driver, active: null, cancelled: s.driver.cancelled + 1 } });
    toast(`Viaje cancelado: ${reason}. Se devolvió el pago al pasajero.`, 'warn');
  };

  const closeDriverTrip = () => patch('driver', { active: null });

  const withdraw = (amount, method, account) => {
    const s = ref.current;
    const cfg = s.config;
    const bal = balances(s.ledger).conductor;
    const fee = s.driver.monthWithdrawals < cfg.freeWithdrawalsPerMonth ? 0 : cfg.withdrawFee;
    if (amount < cfg.minWithdraw) return { ok: false, error: `El retiro mínimo es S/ ${cfg.minWithdraw.toFixed(2)}` };
    if (amount > bal) return { ok: false, error: 'No tienes tanto saldo disponible' };
    const ledger = post(s.ledger, [
      { account: 'conductor', type: 'retiro', amount: -amount, label: `Retiro a ${method} ***${account.slice(-3)}` },
      { account: 'externo', type: 'retiro', amount: amount - fee, label: `Retiro a ${method} ***${account.slice(-3)}` },
      { account: 'plataforma', type: 'comision_retiro', amount: fee, label: `Costo de retiro ${method}` },
    ]);
    commit({ ...s, ledger, driver: { ...s.driver, monthWithdrawals: s.driver.monthWithdrawals + 1 } });
    return { ok: true, fee, net: round2(amount - fee) };
  };

  // Simulación: llegan solicitudes al conductor disponible
  const dv = state.driver;
  useEffect(() => {
    const s = ref.current;
    if (s.session.role !== 'driver' || dv.status !== 'approved' || !dv.available || dv.incoming || dv.active) return;
    const timer = setTimeout(() => {
      const st = ref.current;
      if (!st.driver.available || st.driver.incoming || st.driver.active) return;
      const cat = st.driver.profile.category || 'mototaxi';
      const inArea = PLACES.filter((p) => inServiceArea(p));
      const near = inArea.slice(0, 7);
      const origin = near[Math.floor(Math.random() * near.length)];
      let dest = inArea[Math.floor(Math.random() * inArea.length)];
      if (dest.id === origin.id) dest = inArea[(inArea.indexOf(dest) + 3) % inArea.length];
      const cargo = cat === 'motocarga' ? { size: 'mediano', desc: 'Sacos de papa del mercado' } : cat === 'mudanza' ? { size: 'mediana', helpers: 1, desc: 'Cama, ropero y cajas' } : undefined;
      const price = calcPrice(st.config, { category: cat, origin, dest, cargo });
      const discount = Math.random() < 0.3 ? Math.min(1, price.final) : 0;
      Vibration.vibrate([0, 300, 150, 300]);
      commit({
        ...st,
        driver: {
          ...st.driver,
          incoming: {
            id: uid('r'), category: cat, origin, dest, cargo, price, discount, toPay: round2(price.final - discount),
            passenger: PASSENGER_NAMES[Math.floor(Math.random() * PASSENGER_NAMES.length)],
            passengerRating: (4.5 + Math.random() * 0.5).toFixed(1),
            pickupKm: Math.round(Math.max(0.2, haversineKm(st.driver.position, origin) * 1.3) * 10) / 10,
            createdAt: Date.now(),
          },
        },
      });
    }, 4000 + Math.random() * 3000);
    return () => clearTimeout(timer);
  }, [state.session.role, dv.status, dv.available, !!dv.incoming, !!dv.active]);

  // Simulación: movimiento del conductor y liberación del pago
  const act = dv.active;
  useEffect(() => {
    if (!act) return;
    if (act.stage === 'toPickup' || act.stage === 'ongoing') {
      const steps = act.stage === 'toPickup' ? 10 : 14;
      const iv = setInterval(() => {
        const s = ref.current;
        const a = s.driver.active;
        if (!a || a.id !== act.id || a.stage !== act.stage || a.progress >= 1) return;
        const progress = Math.min(1, a.progress + 1 / steps);
        const to = a.stage === 'toPickup' ? a.origin : a.dest;
        commit({ ...s, driver: { ...s.driver, position: lerp(a.legStart, to, progress), active: { ...a, progress, pos: lerp(a.legStart, to, progress) } } });
      }, 1000);
      return () => clearInterval(iv);
    }
    if (act.stage === 'awaitingRelease') {
      // El pasajero simulado confirma a los pocos segundos; si no, se libera al vencer el plazo
      const timer = setTimeout(() => {
        const s = ref.current;
        if (s.driver.active?.id !== act.id || s.driver.active.stage !== 'awaitingRelease') return;
        const { state: next, bonus } = releaseDriverPayment(s, 'confirmado por el pasajero');
        commit(next);
        Vibration.vibrate(300);
        if (bonus) setTimeout(() => toast(`🎉 ¡Bono del día! +S/ ${bonus.toFixed(2)} a tu billetera`, 'success'), 400);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [act?.id, act?.stage]);

  const value = useMemo(
    () => ({
      state, wallets, stats, toast,
      completeOnboarding, login, logout, setRole, setConfig, approvePending, resolveDispute,
      rechargePassenger, quote, requestTrip, cancelTrip, retrySearch, endTrip, changeDestination,
      confirmArrival, openDispute, skipStage, rateTrip, applyReferral,
      rewardsBudget: () => rewardsBudget(ref.current),
      submitDriverRegistration, adminDecideSelf, enterDemoDriver, resetDriverRegistration,
      toggleAvailable, rejectIncoming, acceptIncoming, driverAdvance, driverJump, finishDriverTrip,
      driverCancel, closeDriverTrip, withdraw,
    }),
    [state, wallets, stats]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export { URUBAMBA_CENTER };
