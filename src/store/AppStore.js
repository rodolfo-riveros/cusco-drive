import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Vibration } from 'react-native';
import {
  INITIAL_CONFIG, INITIAL_HISTORY, INITIAL_COUPONS, INITIAL_DRIVER, INITIAL_MOVEMENTS,
  INITIAL_EARNINGS_WEEK, PENDING_DRIVERS, DRIVERS, PLACES, PASSENGER_NAMES, URUBAMBA_CENTER,
} from '../data/mock';
import { calcPrice, couponDiscount, couponValid, inServiceArea, haversineKm, round10 } from '../logic/pricing';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const uid = (p = 'id') => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
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

const initialState = {
  onboarded: false,
  session: { loggedIn: false, phone: '', role: null },
  config: INITIAL_CONFIG,
  stats: { commissionGenerated: 320, rewardsSpent: 70 },
  passenger: {
    name: 'Lucía Quispe',
    points: 17,
    coupons: INITIAL_COUPONS,
    history: INITIAL_HISTORY,
    referralCode: 'LUCIA25',
    usedReferral: false,
    referralsDone: 2,
    streak: [dayKey(daysFromNow(-2)), dayKey(daysFromNow(-1))],
    streakRewarded: false,
    cancellations: 1,
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
    balance: 3.2,
    available: false,
    movements: INITIAL_MOVEMENTS,
    weekTrips: 27,
    earningsWeek: INITIAL_EARNINGS_WEEK,
    incoming: null,
    active: null,
    freeDayAvailable: true,
    freeCommissionToday: false,
    position: { latitude: -13.3041, longitude: -72.1171 },
  },
  pendingDrivers: PENDING_DRIVERS,
  toast: null,
};

// ---------- Finalización del viaje del pasajero (función pura) ----------
function finalizePassengerTrip(s) {
  const trip = s.trip;
  const p = s.passenger;
  const cfg = s.config;
  const newCoupons = p.coupons.map((c) => (c.id === trip.couponId ? { ...c, used: true } : c));
  let points = p.points + 1;
  const earned = [];
  if (points % cfg.pointsPerReward === 0) {
    const c = {
      id: uid('c'), title: `Premio por ${cfg.pointsPerReward} viajes`, type: 'points',
      amount: cfg.pointsRewardAmount, expiresAt: daysFromNow(cfg.couponExpiryDays).toISOString(), used: false,
    };
    newCoupons.push(c);
    earned.push(c.title);
  }
  let streak = p.streak.includes(dayKey()) ? p.streak : [...p.streak, dayKey()];
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
    driverFare: trip.price.driverFare, commission: trip.price.commission, surcharge: trip.price.surcharge,
    discount: trip.discount, final: trip.toPay, status: 'completed', rating: null, coupon: coupon?.title,
  };
  return {
    ...s,
    stats: {
      commissionGenerated: round10(s.stats.commissionGenerated + trip.price.commission),
      rewardsSpent: round10(s.stats.rewardsSpent + trip.discount),
    },
    passenger: { ...p, points, coupons: newCoupons, history: [record, ...p.history], streak, streakRewarded },
    trip: { ...trip, status: 'finished', earned, pointsAfter: points },
  };
}

export function AppProvider({ children }) {
  const [state, setState] = useState(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;
  const toastTimer = useRef(null);

  const toast = useCallback((msg, type = 'info') => {
    clearTimeout(toastTimer.current);
    setState((s) => ({ ...s, toast: { msg, type, id: Date.now() } }));
    toastTimer.current = setTimeout(() => setState((s) => ({ ...s, toast: null })), 2800);
  }, []);

  const patch = useCallback((key, fnOrObj) => {
    setState((s) => ({ ...s, [key]: typeof fnOrObj === 'function' ? fnOrObj(s[key], s) : { ...s[key], ...fnOrObj } }));
  }, []);

  // ---------------- Sesión ----------------
  const completeOnboarding = () => setState((s) => ({ ...s, onboarded: true }));
  const login = (phone, role) => patch('session', { loggedIn: true, phone, role });
  const setRole = (role) => patch('session', { role });
  const logout = () =>
    setState((s) => ({ ...s, session: { loggedIn: false, phone: '', role: null }, trip: null, driver: { ...s.driver, available: false, incoming: null } }));

  // ---------------- Admin ----------------
  const setConfig = (fn) => patch('config', (c) => fn(c));
  const approvePending = (id, ok) =>
    setState((s) => ({ ...s, pendingDrivers: s.pendingDrivers.filter((d) => d.id !== id) }));

  // ---------------- Pasajero ----------------
  const rewardsBudget = (s) => round10((s.stats.commissionGenerated * s.config.rewardsCapPct) / 100 - s.stats.rewardsSpent);

  const quote = useCallback(
    (params) => calcPrice(stateRef.current.config, params),
    []
  );

  const requestTrip = ({ category, origin, dest, cargo, luggage, couponId, forceNoDrivers }) => {
    const s = stateRef.current;
    if (!inServiceArea(origin) || !inServiceArea(dest)) {
      return { ok: false, error: 'Aún no tenemos cobertura en esa zona. Por ahora solo operamos en Urubamba.' };
    }
    const price = calcPrice(s.config, { category, origin, dest, cargo, luggage });
    const coupon = s.passenger.coupons.find((c) => c.id === couponId && couponValid(c));
    let discount = couponDiscount(s.config, coupon, price.final);
    if (discount > rewardsBudget(s)) discount = 0; // tope de premios
    const trip = {
      id: uid('t'), category, origin, dest, cargo, luggage, price, couponId: discount ? couponId : null,
      discount, toPay: round10(price.final - discount), status: 'searching', createdAt: Date.now(),
      progress: 0, driver: null, driverPos: null, forceNoDrivers: !!forceNoDrivers,
    };
    setState((st) => ({
      ...st,
      trip,
      passenger: { ...st.passenger, recent: [dest.id, ...st.passenger.recent.filter((r) => r !== dest.id)].filter(Boolean).slice(0, 4) },
    }));
    return { ok: true };
  };

  const cancelTrip = (reason) => {
    setState((s) => {
      if (!s.trip) return s;
      const free = s.trip.status === 'searching' || s.trip.status === 'nodrivers';
      const p = s.passenger;
      const cancellations = free ? p.cancellations : p.cancellations + 1;
      const history = free
        ? p.history
        : [{
            id: s.trip.id, date: new Date().toISOString(), category: s.trip.category, origin: s.trip.origin.name,
            dest: s.trip.dest.name, driverName: s.trip.driver?.name || '—', plate: s.trip.driver?.plate || '—',
            driverFare: s.trip.price.driverFare, commission: s.trip.price.commission, surcharge: 0, discount: 0,
            final: s.trip.toPay, status: 'cancelled', cancelReason: reason,
          }, ...p.history];
      return { ...s, trip: null, passenger: { ...p, cancellations, history } };
    });
    const c = stateRef.current.passenger.cancellations;
    if (reason && c >= 2) toast('Advertencia: tienes varias cancelaciones esta semana', 'warn');
    else toast(reason ? 'Viaje cancelado. Motivo registrado.' : 'Solicitud cancelada (sin costo)');
  };

  const retrySearch = (category) =>
    setState((s) => {
      if (!s.trip) return s;
      const cat = category || s.trip.category;
      const price = calcPrice(s.config, { category: cat, origin: s.trip.origin, dest: s.trip.dest, cargo: s.trip.cargo, luggage: s.trip.luggage });
      const discount = Math.min(s.trip.discount, price.final);
      return { ...s, trip: { ...s.trip, category: cat, price, discount, toPay: round10(price.final - discount), status: 'searching', forceNoDrivers: false, createdAt: Date.now() } };
    });

  const skipStage = () =>
    setState((s) => {
      if (!s.trip) return s;
      const t = s.trip;
      if (t.status === 'assigned') return { ...s, trip: { ...t, status: 'arrived', progress: 0, driverPos: t.origin } };
      if (t.status === 'arrived') return { ...s, trip: { ...t, status: 'ongoing', progress: 0, driverPos: t.origin } };
      if (t.status === 'ongoing') return finalizePassengerTrip({ ...s, trip: { ...t, driverPos: t.dest } });
      return s;
    });

  const rateTrip = (stars, comment, tags) =>
    setState((s) => ({
      ...s,
      trip: null,
      passenger: {
        ...s.passenger,
        history: s.passenger.history.map((h) => (h.id === s.trip?.id ? { ...h, rating: stars, comment, tags } : h)),
      },
    }));

  const clearTrip = () => setState((s) => ({ ...s, trip: null }));

  const applyReferral = (code) => {
    const s = stateRef.current;
    const c = code.trim().toUpperCase();
    if (s.passenger.usedReferral) return { ok: false, error: 'Ya usaste un código de referido en este celular.' };
    if (c === s.passenger.referralCode) return { ok: false, error: 'No puedes usar tu propio código.' };
    if (!/^[A-Z]{3,}\d{2}$/.test(c)) return { ok: false, error: 'Código no válido. Prueba con AMIGO10.' };
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
    if (t.status === 'searching') {
      const timer = setTimeout(() => {
        setState((s) => {
          if (!s.trip || s.trip.id !== t.id || s.trip.status !== 'searching') return s;
          if (s.trip.forceNoDrivers) return { ...s, trip: { ...s.trip, status: 'nodrivers' } };
          const cands = DRIVERS.filter((d) => d.category === s.trip.category);
          const sorted = cands.sort((a, b) => haversineKm(a, s.trip.origin) - haversineKm(b, s.trip.origin));
          const d = sorted[0];
          const far = { latitude: s.trip.origin.latitude + 0.006, longitude: s.trip.origin.longitude - 0.005 };
          const start = haversineKm(d, s.trip.origin) < 0.25 ? far : { latitude: d.latitude, longitude: d.longitude };
          const eta = Math.max(2, Math.round(haversineKm(start, s.trip.origin) * 1.3 * 3));
          return { ...s, trip: { ...s.trip, status: 'assigned', driver: d, driverStart: start, driverPos: start, progress: 0, eta } };
        });
      }, 4000);
      return () => clearTimeout(timer);
    }
    if (t.status === 'assigned' || t.status === 'ongoing') {
      const steps = t.status === 'assigned' ? 10 : 12;
      const iv = setInterval(() => {
        setState((s) => {
          if (!s.trip || s.trip.id !== t.id || s.trip.status !== t.status) return s;
          const tr = s.trip;
          const progress = Math.min(1, tr.progress + 1 / steps);
          const from = tr.status === 'assigned' ? tr.driverStart : tr.origin;
          const to = tr.status === 'assigned' ? tr.origin : tr.dest;
          if (progress >= 1) {
            if (tr.status === 'assigned') {
              Vibration.vibrate(400);
              return { ...s, trip: { ...tr, status: 'arrived', progress: 0, driverPos: tr.origin } };
            }
            return finalizePassengerTrip({ ...s, trip: { ...tr, driverPos: tr.dest } });
          }
          return { ...s, trip: { ...tr, progress, driverPos: lerp(from, to, progress) } };
        });
      }, 1000);
      return () => clearInterval(iv);
    }
    if (t.status === 'arrived') {
      const timer = setTimeout(() => {
        setState((s) =>
          s.trip && s.trip.id === t.id && s.trip.status === 'arrived'
            ? { ...s, trip: { ...s.trip, status: 'ongoing', progress: 0 } }
            : s
        );
      }, 6000);
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
    const s = stateRef.current;
    const d = s.driver;
    if (!d.available && d.balance < s.config.minDriverBalance) {
      toast('Saldo insuficiente. Recarga para recibir solicitudes.', 'error');
      return false;
    }
    patch('driver', { available: !d.available, incoming: null });
    toast(!d.available ? 'Estás disponible. Esperando solicitudes…' : 'Ya no recibirás solicitudes', !d.available ? 'success' : 'info');
    return true;
  };

  const rejectIncoming = (timeout) => {
    patch('driver', { incoming: null });
    if (timeout) toast('La solicitud expiró');
  };

  const acceptIncoming = () =>
    patch('driver', (d) => (d.incoming ? { ...d, active: { ...d.incoming, stage: 'toPickup' }, incoming: null } : d));

  const driverAdvance = () =>
    patch('driver', (d) => {
      if (!d.active) return d;
      const next = { toPickup: 'atPickup', atPickup: 'ongoing', ongoing: 'charging' }[d.active.stage];
      return next ? { ...d, active: { ...d.active, stage: next } } : d;
    });

  const driverCancel = (reason) => {
    patch('driver', { active: null });
    toast(`Viaje cancelado: ${reason}`, 'warn');
  };

  const confirmCash = () => {
    setState((s) => {
      const d = s.driver;
      const a = d.active;
      if (!a) return s;
      const commission = d.freeCommissionToday ? 0 : a.price.commission;
      const movements = [...d.movements];
      const now = new Date().toISOString();
      const label = `${a.origin.name} → ${a.dest.name}`;
      if (commission > 0) movements.unshift({ id: uid('m'), date: now, type: 'commission', label: `Comisión viaje ${label}`, amount: -commission });
      else movements.unshift({ id: uid('m'), date: now, type: 'free', label: `Día sin comisión · ${label}`, amount: 0 });
      if (a.discount > 0) movements.unshift({ id: uid('m'), date: now, type: 'refund', label: 'Reembolso cupón de pasajero', amount: a.discount });
      let balance = round10(d.balance - commission + a.discount);
      const weekTrips = d.weekTrips + 1;
      const bonusMsgs = [];
      s.config.driverBonuses.forEach((b) => {
        if (d.weekTrips < b.trips && weekTrips >= b.trips) {
          balance = round10(balance + b.amount);
          movements.unshift({ id: uid('m'), date: now, type: 'bonus', label: `Bono semanal (${b.trips} viajes)`, amount: b.amount });
          bonusMsgs.push(b.amount);
        }
      });
      const earningsWeek = d.earningsWeek.map((e, i) =>
        i === 6 ? { trips: e.trips + 1, gross: round10(e.gross + a.price.final), commission: round10(e.commission + commission) } : e
      );
      const profile = { ...d.profile, totalTrips: d.profile.totalTrips + 1 };
      if (bonusMsgs.length) setTimeout(() => toast(`🎉 ¡Bono desbloqueado! +S/ ${bonusMsgs[0].toFixed(2)} a tu saldo`, 'success'), 300);
      else if (balance < s.config.lowBalanceAlert) setTimeout(() => toast('Tu saldo está bajo. Recarga para seguir recibiendo viajes.', 'warn'), 300);
      return {
        ...s,
        stats: { commissionGenerated: round10(s.stats.commissionGenerated + commission), rewardsSpent: round10(s.stats.rewardsSpent + a.discount) },
        driver: {
          ...d, balance, movements, weekTrips, earningsWeek, profile,
          active: { ...a, stage: 'rating', commissionCharged: commission },
          available: balance >= s.config.minDriverBalance ? d.available : false,
        },
      };
    });
  };

  const finishDriverTrip = () => patch('driver', { active: null });

  const recharge = (amount, method) =>
    patch('driver', (d) => ({
      ...d,
      balance: round10(d.balance + amount),
      movements: [{ id: uid('m'), date: new Date().toISOString(), type: 'recharge', label: `Recarga por ${method}`, amount }, ...d.movements],
    }));

  const activateFreeDay = () => {
    patch('driver', { freeDayAvailable: false, freeCommissionToday: true });
    toast('¡Hoy no pagas comisión! Premio por tu calificación 4.8+', 'success');
  };

  // Simulación: llegan solicitudes al conductor disponible
  const dv = state.driver;
  useEffect(() => {
    const s = stateRef.current;
    if (s.session.role !== 'driver' || dv.status !== 'approved' || !dv.available || dv.incoming || dv.active) return;
    if (dv.balance < s.config.minDriverBalance) return;
    const timer = setTimeout(() => {
      const st = stateRef.current;
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
      patch('driver', {
        incoming: {
          id: uid('r'), category: cat, origin, dest, cargo, price, discount, toPay: round10(price.final - discount),
          passenger: PASSENGER_NAMES[Math.floor(Math.random() * PASSENGER_NAMES.length)],
          passengerRating: (4.5 + Math.random() * 0.5).toFixed(1),
          pickupKm: round10(Math.max(0.2, haversineKm(st.driver.position, origin) * 1.3)),
          createdAt: Date.now(),
        },
      });
    }, 5000 + Math.random() * 3000);
    return () => clearTimeout(timer);
  }, [state.session.role, dv.status, dv.available, dv.incoming, dv.active, dv.balance]);

  const value = useMemo(
    () => ({
      state, toast, completeOnboarding, login, logout, setRole, setConfig, approvePending,
      quote, requestTrip, cancelTrip, retrySearch, skipStage, rateTrip, clearTrip, applyReferral,
      rewardsBudget: () => rewardsBudget(stateRef.current),
      submitDriverRegistration, adminDecideSelf, enterDemoDriver, resetDriverRegistration,
      toggleAvailable, rejectIncoming, acceptIncoming, driverAdvance, driverCancel, confirmCash,
      finishDriverTrip, recharge, activateFreeDay,
    }),
    [state]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export { URUBAMBA_CENTER };
