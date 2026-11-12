import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, ScrollView, Modal, Linking, Animated, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { C, F, shadow, money } from '../../theme';
import {
  Btn, Card, Row, T, Text, Avatar, Stars, Badge, Sheet, Confirm, ReceiptLine, Progress, ListItem, Header, Screen,
  AndeanBorder, BottomPanel, StepPills, CatIcon, NavyHeader, WalletPill, Input, RouteDots,
} from '../../components/ui';
import Map from '../../components/Map';
import { catById, DRIVER_CANCEL_REASONS } from '../../data/mock';
import { watchPosition, googleMapsUrl, remainingRoute } from '../../logic/geo';
import { round2 } from '../../logic/pricing';
import { forAccount } from '../../logic/ledger';
import { useApp } from '../../store/AppStore';
import { Movements } from '../passenger/WalletScreens';
import { useNow } from '../../components/useNow';

export const nextBonus = (cfg, n) => cfg.driverDailyBonuses.find((b) => n < b.trips) || cfg.driverDailyBonuses[cfg.driverDailyBonuses.length - 1];

/** GPS en vivo del conductor: al activarlo, tu posición real mueve el vehículo en el mapa. */
function useDriverGps() {
  const { state, setDriverPosition, toast } = useApp();
  const stop = useRef(null);
  const [busy, setBusy] = useState(false);
  const on = state.driver.gps === 'gps';
  useEffect(() => () => stop.current?.(), []);
  const toggle = async () => {
    if (on) {
      stop.current?.();
      stop.current = null;
      setDriverPosition(state.driver.position, 'manual');
      toast('GPS en vivo desactivado. Toca el mapa para moverte (simulación).');
      return;
    }
    setBusy(true);
    try {
      let first = true;
      stop.current = await watchPosition((p) => {
        setDriverPosition({ latitude: p.latitude, longitude: p.longitude }, 'gps');
        if (first) {
          first = false;
          toast(`GPS en vivo activado${p.accuracy ? ` (±${Math.round(p.accuracy)} m)` : ''}`, 'success');
        }
      });
    } catch {
      toast('No se pudo leer el GPS. Activa el permiso de ubicación.', 'warn');
    } finally {
      setBusy(false);
    }
  };
  return { on, busy, toggle };
}

const GpsBtn = ({ gps }) => (
  <TouchableOpacity onPress={gps.toggle} style={[s.gpsBtn, gps.on && { backgroundColor: C.green }]} accessibilityLabel="GPS en vivo">
    {gps.busy ? <ActivityIndicator color={gps.on ? C.white : C.navy} /> : <Ionicons name={gps.on ? 'navigate' : 'locate'} size={22} color={gps.on ? C.white : C.navy} />}
  </TouchableOpacity>
);

// ---------------- C1 · HOME CONDUCTOR ----------------
export function DriverHome({ navigation }) {
  const { state, wallets, toggleAvailable, setDriverPosition } = useApp();
  const gps = useDriverGps();
  const d = state.driver;
  const cfg = state.config;
  const today = d.earningsWeek[6];
  const nb = nextBonus(cfg, today.trips);

  useEffect(() => {
    if (d.active) navigation.navigate('DriverTrip');
  }, [d.active?.id]);

  return (
    <View style={{ flex: 1, backgroundColor: C.mapBg }}>
      <Map
        fit={[d.position]}
        fitKey={`dh-${d.gps}-${d.position.latitude.toFixed(3)},${d.position.longitude.toFixed(3)}`}
        zoom={16}
        padBottom={340}
        onPress={(c) => setDriverPosition(c, 'manual')}
        markers={[{ key: 'me', ...d.position, kind: 'vehicle', category: d.profile.category, active: d.available }]}
      />
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }} pointerEvents="box-none">
        <Row style={{ paddingHorizontal: 16, paddingTop: 12, justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => navigation.navigate('DriverProfile')} style={s.pill}>
            <Avatar name={d.profile.name} size={36} />
            <Text style={{ marginLeft: 8, fontWeight: '800', fontSize: 14 }}>★ {d.profile.rating.toFixed(1)}</Text>
          </TouchableOpacity>
          <WalletPill balance={wallets.conductor} low={0.01} onPress={() => navigation.navigate('Wallet')} label="Mi billetera" />
        </Row>
        <View style={s.zoneTag}><Text style={{ fontSize: 12, fontWeight: '800', color: C.navy }}>{d.gps === 'gps' ? 'GPS en vivo: tu ubicación real' : 'Toca el mapa para moverte · o activa tu GPS'}</Text></View>
      </SafeAreaView>

      <BottomPanel>
        <GpsBtn gps={gps} />
        <TouchableOpacity activeOpacity={0.9} onPress={toggleAvailable} style={[s.toggle, { backgroundColor: d.available ? C.green : C.navy }]} accessibilityRole="switch">
          <View style={s.switchTrack}>
            <View style={[s.switchKnob, { backgroundColor: d.available ? C.green : C.muted, alignSelf: d.available ? 'flex-end' : 'flex-start' }]} />
          </View>
          <View style={{ marginLeft: 14, flex: 1 }}>
            <Text style={{ color: C.white, fontFamily: F.title, fontSize: 18 }}>{d.available ? 'Estás disponible' : 'No disponible'}</Text>
            <Text style={{ color: C.white, fontSize: 13 }}>{d.available ? 'Recibiendo solicitudes cercanas' : 'Toca para empezar a recibir viajes'}</Text>
          </View>
        </TouchableOpacity>
        <Text style={{ fontFamily: F.title, fontSize: 16, color: C.navy, marginTop: 14 }}>Hoy</Text>
        <Row style={{ marginTop: 8, marginHorizontal: -4 }}>
          <Stat label="Viajes" value={today.trips} />
          <Stat label="Ganado" value={money(today.earned)} />
          <Stat label="Bonos" value={money(today.bonus)} green />
        </Row>
        <Text style={{ fontSize: 12, color: C.sub, marginTop: 6 }}>Sin comisión: recibes tu tarifa completa en tu billetera al llegar al destino.</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Bonuses')} style={s.bonusRow}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '800', fontSize: 14, color: C.purpleText }}>Bono del día: {money(nb.amount)} extra</Text>
            <Text style={{ fontWeight: '800', fontSize: 14, color: C.purpleText }}>{today.trips}/{nb.trips}</Text>
          </Row>
          <Progress value={today.trips / nb.trips} style={{ marginTop: 8 }} />
        </TouchableOpacity>
      </BottomPanel>
    </View>
  );
}

const Stat = ({ label, value, green }) => (
  <View style={{ flex: 1, marginHorizontal: 4, borderRadius: 14, backgroundColor: green ? C.greenSoft : C.bg, padding: 10 }}>
    <Text style={{ fontSize: 12, color: green ? C.greenText : C.sub }}>{label}</Text>
    <Text style={{ fontFamily: F.price, fontSize: 18, color: green ? C.greenText : C.navy }} numberOfLines={1}>{value}</Text>
  </View>
);

// ---------------- C2 · SOLICITUD ENTRANTE (global) ----------------
const RESPOND_SECS = 30;
export function IncomingRequestModal() {
  const { state, acceptIncoming, rejectIncoming } = useApp();
  const req = state.driver.incoming;
  const now = useNow(!!req, 500);
  const left = req ? Math.max(0, RESPOND_SECS - Math.floor((now - req.createdAt) / 1000)) : RESPOND_SECS;
  const expired = !!req && left <= 0;

  useEffect(() => {
    if (expired) rejectIncoming(true);
  }, [expired]);

  if (!req || state.session.role !== 'driver') return null;
  const cat = catById(req.category);
  const r = 22;
  const circ = 2 * Math.PI * r;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => rejectIncoming()}>
      <View style={{ flex: 1, backgroundColor: 'rgba(11,26,61,0.45)', justifyContent: 'flex-end', padding: 12 }}>
        <View style={s.reqCard}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row style={{ backgroundColor: cat.soft, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 }}>
              <CatIcon id={req.category} size={18} />
              <Text style={{ color: cat.text, fontWeight: '800', fontSize: 13, marginLeft: 6 }}>{cat.name} · Nueva solicitud</Text>
            </Row>
            <View style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={52} height={52} style={{ position: 'absolute' }}>
                <Circle cx={26} cy={26} r={r} stroke={C.mapBg} strokeWidth={4} fill="none" />
                <Circle cx={26} cy={26} r={r} stroke={left > 10 ? C.gold : C.red} strokeWidth={4} fill="none" strokeDasharray={`${circ}`} strokeDashoffset={circ * (1 - left / RESPOND_SECS)} strokeLinecap="round" rotation={-90} origin="26,26" />
              </Svg>
              <Text style={{ fontFamily: F.title, fontSize: 16, color: C.navy }}>{left}</Text>
            </View>
          </Row>
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: C.sub }}>Ganas</Text>
            <Text style={{ fontFamily: F.price, fontSize: 52, color: C.greenText, lineHeight: 60 }}>{money(req.price.driverFare)}</Text>
            <Row style={{ marginTop: 2 }}>
              <Ionicons name="lock-closed" size={13} color={C.sub} />
              <Text style={{ fontSize: 13, color: C.sub, marginLeft: 4 }}>Pagado con {req.method} · se te paga al llegar</Text>
            </Row>
            {req.discount ? <Text style={{ color: C.purple, fontSize: 12, marginTop: 4, fontWeight: '800' }}>El pasajero usa un vale: tú igual recibes tu tarifa completa</Text> : null}
          </View>
          <View style={{ backgroundColor: C.bg, borderRadius: 16, padding: 12, marginTop: 14 }}>
            <RouteDots labels={false} origin={req.origin.name} originSub={`A ${Math.round(req.pickupKm * 1000)} m de ti · ${Math.max(1, Math.round(req.pickupKm * 3))} min`} dest={req.dest.name} destSub={`Viaje de ${req.price.km} km`} />
            {req.cargo ? <T.sub style={{ marginTop: 8 }}>Carga: {req.cargo.desc} ({req.cargo.size})</T.sub> : null}
          </View>
          <Row style={{ marginTop: 12 }}>
            <Avatar name={req.passenger} size={30} />
            <Text style={{ fontSize: 13, color: C.sub, marginLeft: 8 }}>{req.passenger} · ★ {req.passengerRating} · 1 persona</Text>
          </Row>
          <Row style={{ marginTop: 14 }}>
            <Btn title="Rechazar" variant="ghost" style={{ width: 110, height: 60, marginRight: 10 }} textStyle={{ color: C.sub }} onPress={() => rejectIncoming()} />
            <Btn title="Aceptar" variant="success" style={{ flex: 1, height: 60 }} textStyle={{ fontSize: 19 }} onPress={acceptIncoming} />
          </Row>
        </View>
      </View>
    </Modal>
  );
}

// ---------------- VIAJE DEL CONDUCTOR ----------------
const D_STEPS = ['Llegué', 'Iniciar viaje', 'Finalizado'];
export function DriverTrip({ navigation }) {
  const { state, wallets, driverAdvance, driverJump, driverCancel, finishDriverTrip, closeDriverTrip, toast, setDriverPosition } = useApp();
  const gps = useDriverGps();
  const a = state.driver.active;
  const cfg = state.config;
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [farMsg, setFarMsg] = useState(null);
  const [spin] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!a) navigation.goBack();
  }, [!!a]);
  useEffect(() => {
    if (a?.stage !== 'awaitingRelease') return;
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1200, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [a?.stage]);
  if (!a) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const target = a.stage === 'toPickup' || a.stage === 'atPickup' ? a.origin : a.dest;
  const openNav = () => Linking.openURL(googleMapsUrl(a.pos, target));

  // ----- Pago retenido → liberado -----
  if (a.stage === 'awaitingRelease' || a.stage === 'released') {
    const released = a.stage === 'released';
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: released ? C.green : C.navy }}>
          <View style={{ padding: 20, paddingBottom: 24 }}>
            <StepPills steps={D_STEPS} index={2} dark />
            <Text style={{ color: C.white, fontWeight: '700', fontSize: 15, marginTop: 14 }}>Viaje finalizado · {a.dest.name}</Text>
            <Text style={{ fontFamily: F.title, fontSize: 22, color: C.white, marginTop: 4 }}>{released ? '¡Pago recibido!' : 'Liberando tu pago…'}</Text>
            <Text style={{ fontFamily: F.price, fontSize: 60, color: C.white, lineHeight: 68 }}>{released ? '+' : ''}{money(a.price.driverFare)}</Text>
          </View>
        </SafeAreaView>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
          <Card>
            <ReceiptLine label="El pasajero pagó (retenido)" value={money(a.toPay)} />
            {a.discount ? <ReceiptLine label="Vale del pasajero (lo asume Cusco Drive)" value={money(a.discount)} color={C.purple} /> : null}
            <ReceiptLine label="Comisión" value="S/ 0.00" color={C.green} />
            <View style={{ height: 1, backgroundColor: C.border, marginVertical: 4 }} />
            <ReceiptLine label="Tú recibes" value={money(a.price.driverFare)} bold color={C.greenText} />
          </Card>
          {!released ? (
            <Card flat style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center' }}>
              <Animated.View style={{ transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
                <Ionicons name="sync" size={24} color={C.navy} />
              </Animated.View>
              <T.sub style={{ marginLeft: 10, flex: 1 }}>
                Esperando que {a.passenger} confirme la llegada. Si no reclama, se libera solo en {cfg.autoReleaseMin} min.
              </T.sub>
            </Card>
          ) : (
            <>
              <Card flat style={{ marginTop: 12, backgroundColor: C.greenSoft, borderColor: C.greenSoft }}>
                <Text style={{ color: C.greenText, fontWeight: '800' }}>Depositado en tu billetera · {a.releasedHow}</Text>
                <Text style={{ color: C.greenText, marginTop: 2 }}>Saldo: {money(wallets.conductor)} · puedes retirarlo hoy mismo.</Text>
                {a.bonus ? <Text style={{ color: C.purple, fontWeight: '800', marginTop: 6 }}>🎉 Bono del día: +{money(a.bonus)}</Text> : null}
              </Card>
              <Card style={{ marginTop: 12, alignItems: 'center' }}>
                <T.h3>Califica a {a.passenger}</T.h3>
                <View style={{ marginTop: 10 }}><Stars value={stars} size={34} onChange={setStars} /></View>
                <Btn title="Listo, seguir trabajando" style={{ marginTop: 16, alignSelf: 'stretch' }} onPress={() => { closeDriverTrip(); toast('¡Gracias! Sigues disponible.', 'success'); }} />
              </Card>
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  const stageInfo = {
    toPickup: { title: 'Ve al punto de recojo', btn: 'Llegué', variant: 'secondary', idx: 0 },
    atPickup: { title: `Esperando a ${a.passenger}`, btn: 'Iniciar viaje', variant: 'primary', idx: 1 },
    ongoing: { title: 'Viaje en curso', btn: 'Finalizar viaje', variant: 'success', idx: 2 },
  }[a.stage];
  const distM = Math.round(Math.hypot((a.pos.latitude - a.dest.latitude) * 111000, (a.pos.longitude - a.dest.longitude) * 108000));
  const pickM = Math.round(Math.hypot((a.pos.latitude - a.origin.latitude) * 111000, (a.pos.longitude - a.origin.longitude) * 108000));

  const onMain = () => {
    if (a.stage !== 'ongoing') return driverAdvance();
    if (distM > cfg.arrivalRadiusM) {
      setFarMsg(distM);
      return;
    }
    setConfirmEnd(true);
  };

  return (
    <View style={{ flex: 1 }}>
      <Map
        fit={a.stage === 'ongoing' ? [a.origin, a.dest] : [a.pos, a.origin]}
        fitKey={`${a.id}-${a.stage === 'ongoing' ? 't' : 'p'}-${a.tripRoute?.real ? 1 : 0}`}
        padBottom={430}
        padTop={80}
        onPress={(c) => setDriverPosition(c, state.driver.gps === 'gps' ? 'gps' : 'manual')}
        route={a.manual || state.driver.gps === 'gps' ? [a.pos, target] : remainingRoute((a.stage === 'ongoing' ? a.tripRoute : a.toPickupRoute)?.coords, a.stage === 'atPickup' ? 1 : a.progress)}
        routeDashed={!!a.manual || state.driver.gps === 'gps'}
        markers={[
          { key: 'o', latitude: a.origin.latitude, longitude: a.origin.longitude, kind: 'origin', label: a.stage === 'toPickup' ? 'Recojo' : undefined },
          { key: 'd', latitude: a.dest.latitude, longitude: a.dest.longitude, kind: 'dest', label: a.stage === 'ongoing' ? a.dest.name : undefined },
          { key: 'me', ...a.pos, kind: 'vehicle', category: a.category },
        ]}
      />
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }} pointerEvents="box-none">
        <Row style={{ padding: 14, justifyContent: 'space-between' }}>
          <View style={[s.pill, { paddingHorizontal: 14 }]}><Text style={{ fontWeight: '800', color: C.greenText }}>Ganas {money(a.price.driverFare)}</Text></View>
          <TouchableOpacity onPress={openNav} style={[s.pill, { backgroundColor: C.navy, paddingHorizontal: 14 }]}>
            <Ionicons name="navigate" size={18} color={C.white} />
            <Text style={{ color: C.white, fontWeight: '800', marginLeft: 6 }}>Google Maps</Text>
          </TouchableOpacity>
        </Row>
      </SafeAreaView>
      <BottomPanel>
        <GpsBtn gps={gps} />
        <Row style={{ justifyContent: 'space-between' }}>
          <StepPills steps={D_STEPS} index={stageInfo.idx} />
          <TouchableOpacity onPress={driverJump} style={s.demo}><Text style={{ color: C.purple, fontWeight: '800', fontSize: 11 }}>Demo: GPS ⏩</Text></TouchableOpacity>
        </Row>
        <T.h2 style={{ marginTop: 10 }}>{stageInfo.title}</T.h2>
        <T.sub>{a.stage === 'ongoing' ? `A ${distM} m del destino · debes estar a menos de ${cfg.arrivalRadiusM} m para finalizar` : a.stage === 'toPickup' ? `Recojo a ${pickM} m · ${(a.toPickupRoute?.km || 0).toFixed(1)} km por calle` : 'Espera al pasajero en el punto de recojo'}</T.sub>
        <T.sub style={{ fontSize: 11 }}>{state.driver.gps === 'gps' ? 'Usando tu GPS real' : 'Simulación: avanzas solo por la ruta, o toca el mapa para moverte'}</T.sub>
        <Row style={{ marginTop: 12 }}>
          <Avatar name={a.passenger} size={48} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <T.h3>{a.passenger}</T.h3>
            <T.sub numberOfLines={1}>{a.stage === 'ongoing' ? `Destino: ${a.dest.name}` : `Recojo: ${a.origin.name}`}</T.sub>
          </View>
          <TouchableOpacity onPress={() => Linking.openURL('tel:987000111')} style={s.callBtn}><Ionicons name="call" size={22} color={C.navy} /></TouchableOpacity>
        </Row>
        {a.cargo ? <T.sub style={{ marginTop: 8 }}>Carga: {a.cargo.desc}</T.sub> : null}
        <Row style={{ marginTop: 10, backgroundColor: C.greenSoft, borderRadius: 12, padding: 10 }}>
          <Ionicons name="lock-closed" size={16} color={C.greenText} />
          <Text style={{ color: C.greenText, fontWeight: '700', fontSize: 13, marginLeft: 6, flex: 1 }}>{money(a.toPay)} retenidos por Cusco Drive. No cobres en efectivo.</Text>
        </Row>
        <Btn title={stageInfo.btn} variant={stageInfo.variant} style={{ marginTop: 12 }} onPress={onMain} />
        {a.stage !== 'ongoing' ? <Btn title="Cancelar viaje" variant="ghost" small style={{ marginTop: 8 }} onPress={() => setCancelOpen(true)} /> : null}
      </BottomPanel>
      <Confirm
        visible={confirmEnd}
        title="¿Finalizar el viaje?"
        text={`Confirma que llegaste a ${a.dest.name}. Tu pago de ${money(a.price.driverFare)} se libera cuando el pasajero confirme o en ${cfg.autoReleaseMin} min si no reclama.`}
        confirmText="Finalizar"
        variant="success"
        onCancel={() => setConfirmEnd(false)}
        onConfirm={() => {
          setConfirmEnd(false);
          const r = finishDriverTrip();
          if (!r.ok && r.distM) setFarMsg(r.distM);
        }}
      />
      <Confirm
        visible={!!farMsg}
        title="Aún no llegas al destino"
        text={`Tu GPS está a ${farMsg} m de ${a.dest.name}. Para proteger al pasajero, solo puedes finalizar a menos de ${cfg.arrivalRadiusM} m.`}
        confirmText="Entendido"
        onCancel={() => setFarMsg(null)}
        onConfirm={() => setFarMsg(null)}
      />
      <Sheet visible={cancelOpen} onClose={() => setCancelOpen(false)} title="Motivo de cancelación">
        <T.sub style={{ marginBottom: 6 }}>Se devolverá todo el pago al pasajero. Las cancelaciones afectan tus bonos.</T.sub>
        {DRIVER_CANCEL_REASONS.map((r) => (
          <TouchableOpacity key={r} onPress={() => { setCancelOpen(false); driverCancel(r); }} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <Text style={{ fontSize: 16 }}>{r}</Text>
          </TouchableOpacity>
        ))}
      </Sheet>
    </View>
  );
}

// ---------------- C4 · BILLETERA DEL CONDUCTOR ----------------
export function DriverWallet({ navigation }) {
  const { state, wallets } = useApp();
  const cfg = state.config;
  const d = state.driver;
  const bal = wallets.conductor;
  const free = Math.max(0, cfg.freeWithdrawalsPerMonth - d.monthWithdrawals);
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <NavyHeader title="Mi billetera" color={C.green}>
        <Text style={{ color: '#DDF3E2', marginTop: 14 }}>Disponible para retirar</Text>
        <Text style={{ fontFamily: F.price, fontSize: 44, color: C.white, lineHeight: 52 }}>{money(bal)}</Text>
        <Text style={{ color: '#DDF3E2', fontSize: 13 }}>{free > 0 ? `Te quedan ${free} retiros gratis este mes` : `Costo por retiro: ${money(cfg.withdrawFee)}`}</Text>
      </NavyHeader>
      <Screen edges={[]} contentStyle={{ paddingTop: 16 }}>
        <Btn title="Retirar a Yape / Plin / banco" icon="arrow-up-circle" disabled={bal < cfg.minWithdraw} onPress={() => navigation.navigate('Withdraw')} />
        <Row style={{ marginTop: 12, marginHorizontal: -4 }}>
          <View style={[s.mini, { backgroundColor: C.greenSoft }]}><Text style={{ color: C.greenText, fontSize: 12, fontWeight: '800' }}>Sin comisión</Text><Text style={{ color: C.greenText, fontSize: 12 }}>Recibes tu tarifa completa</Text></View>
          <View style={[s.mini, { backgroundColor: C.navySoft }]}><Text style={{ color: C.navy, fontSize: 12, fontWeight: '800' }}>Retiro el mismo día</Text><Text style={{ color: C.navy, fontSize: 12 }}>A tu {d.profile.payout.method}</Text></View>
        </Row>
        <Card flat style={{ marginTop: 12 }}>
          <T.h3>¿Cómo funciona?</T.h3>
          <T.sub style={{ marginTop: 4 }}>El pasajero paga por adelantado con su billetera. Cusco Drive retiene el pago y, al llegar al destino, deposita tu tarifa aquí. No necesitas recargar saldo ni cobrar efectivo.</T.sub>
        </Card>
        <T.h2 style={{ marginTop: 20 }}>Movimientos</T.h2>
        <Movements list={forAccount(state.ledger, 'conductor')} />
      </Screen>
    </View>
  );
}

export function WithdrawScreen({ navigation }) {
  const { state, wallets, withdraw } = useApp();
  const cfg = state.config;
  const d = state.driver;
  const bal = wallets.conductor;
  const [amount, setAmount] = useState(String(Math.floor(bal)));
  const [method, setMethod] = useState(d.profile.payout.method);
  const [account, setAccount] = useState(d.profile.payout.account);
  const [step, setStep] = useState(1);
  const [res, setRes] = useState(null);
  const [error, setError] = useState('');
  const fee = d.monthWithdrawals < cfg.freeWithdrawalsPerMonth ? 0 : cfg.withdrawFee;
  const val = Number(String(amount).replace(',', '.')) || 0;

  const go = () => {
    setError('');
    setStep(2);
    setTimeout(() => {
      const r = withdraw(round2(val), method, account);
      if (!r.ok) { setError(r.error); setStep(1); return; }
      setRes(r);
      setStep(3);
    }, 1500);
  };

  if (step === 3) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.white, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name="checkmark-circle" size={88} color={C.green} />
        <T.h1 style={{ marginTop: 10 }}>¡Retiro enviado!</T.h1>
        <T.p style={{ color: C.sub, textAlign: 'center', marginTop: 6 }}>Enviamos {money(res.net)} a tu {method} ***{account.slice(-3)}.{res.fee ? ` Costo ${money(res.fee)}.` : ' Sin costo.'}</T.p>
        <Btn title="Volver" style={{ alignSelf: 'stretch', marginTop: 24 }} onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }
  return (
    <Screen>
      <Header title="Retirar dinero" onBack={() => navigation.goBack()} />
      <Card flat style={{ alignItems: 'center' }}>
        <T.sub>Disponible</T.sub>
        <Text style={{ fontFamily: F.price, fontSize: 32, color: C.greenText }}>{money(bal)}</Text>
      </Card>
      <T.h3 style={{ marginTop: 18 }}>Monto</T.h3>
      <Row style={{ marginTop: 8 }}>
        <Text style={{ fontFamily: F.title, fontSize: 22, color: C.navy, marginRight: 8 }}>S/</Text>
        <Input value={amount} onChangeText={setAmount} keyboardType="decimal-pad" style={{ flex: 1, fontSize: 22 }} />
        <Btn small title="Todo" variant="light" style={{ marginLeft: 8 }} onPress={() => setAmount(String(bal))} />
      </Row>
      <T.h3 style={{ marginTop: 18 }}>Enviar a</T.h3>
      <Row style={{ marginTop: 8 }}>
        {['Yape', 'Plin', 'Banco'].map((m) => <Chip2 key={m} label={m} on={method === m} onPress={() => setMethod(m)} />)}
      </Row>
      <Input value={account} onChangeText={setAccount} keyboardType="number-pad" placeholder={method === 'Banco' ? 'N.º de cuenta / CCI' : 'Celular'} style={{ marginTop: 10 }} />
      <Card flat style={{ marginTop: 14 }}>
        <ReceiptLine label="Monto" value={money(val)} />
        <ReceiptLine label="Costo de retiro" value={fee ? money(fee) : 'Gratis'} color={fee ? C.text : C.green} />
        <ReceiptLine label="Recibes" value={money(Math.max(0, val - fee))} bold />
      </Card>
      {error ? <Text style={{ color: C.red, marginTop: 10, fontWeight: '700' }}>{error}</Text> : null}
      <Btn title={step === 2 ? 'Enviando…' : `Retirar ${money(val)}`} loading={step === 2} disabled={val < cfg.minWithdraw || val > bal || account.length < 6} style={{ marginTop: 18 }} onPress={go} />
      <T.sub style={{ textAlign: 'center', marginTop: 8 }}>Mínimo {money(cfg.minWithdraw)} · llega el mismo día.</T.sub>
    </Screen>
  );
}

const Chip2 = ({ label, on, onPress }) => (
  <TouchableOpacity onPress={onPress} style={{ flex: 1, marginRight: 8, height: 44, borderRadius: 12, borderWidth: 2, borderColor: on ? C.green : C.border, backgroundColor: on ? C.greenSoft : C.white, alignItems: 'center', justifyContent: 'center' }}>
    <Text style={{ fontWeight: '800', color: on ? C.greenText : C.text }}>{label}</Text>
  </TouchableOpacity>
);

// ---------------- GANANCIAS ----------------
export function EarningsScreen() {
  const { state } = useApp();
  const [tab, setTab] = useState('hoy');
  const w = state.driver.earningsWeek;
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const labels = w.map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return i === 6 ? 'Hoy' : days[(d.getDay() + 6) % 7];
  });
  const sum = tab === 'hoy' ? w[6] : w.reduce((a, e) => ({ trips: a.trips + e.trips, earned: a.earned + e.earned, bonus: a.bonus + e.bonus }), { trips: 0, earned: 0, bonus: 0 });
  const max = Math.max(...w.map((e) => e.earned + e.bonus));
  return (
    <Screen>
      <T.h1>Ganancias</T.h1>
      <Row style={{ marginTop: 12, backgroundColor: C.white, borderRadius: 14, padding: 4 }}>
        {['hoy', 'semana'].map((t) => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={{ flex: 1, padding: 10, borderRadius: 10, backgroundColor: tab === t ? C.navy : 'transparent', alignItems: 'center' }}>
            <Text style={{ fontWeight: '800', color: tab === t ? C.white : C.navy }}>{t === 'hoy' ? 'Hoy' : 'Últimos 7 días'}</Text>
          </TouchableOpacity>
        ))}
      </Row>
      <Card style={{ marginTop: 14, alignItems: 'center' }}>
        <T.sub>Ganaste (sin comisiones)</T.sub>
        <Text style={{ fontFamily: F.price, fontSize: 44, color: C.green }}>{money(sum.earned + sum.bonus)}</Text>
        <Row style={{ marginTop: 10 }}>
          <View style={{ flex: 1, alignItems: 'center' }}><T.h3>{sum.trips}</T.h3><T.sub>Viajes</T.sub></View>
          <View style={{ flex: 1, alignItems: 'center' }}><T.h3>{money(sum.earned)}</T.h3><T.sub>Tarifas</T.sub></View>
          <View style={{ flex: 1, alignItems: 'center' }}><T.h3 style={{ color: C.purple }}>{money(sum.bonus)}</T.h3><T.sub>Bonos</T.sub></View>
        </Row>
      </Card>
      <Card style={{ marginTop: 14 }}>
        <T.h3>Por día</T.h3>
        <Row style={{ alignItems: 'flex-end', height: 150, marginTop: 14, justifyContent: 'space-between' }}>
          {w.map((e, i) => {
            const v = e.earned + e.bonus;
            return (
              <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 10, color: C.sub, marginBottom: 4 }}>{Math.round(v)}</Text>
                <View style={{ width: 22, height: Math.max(6, (v / max) * 110), borderRadius: 6, backgroundColor: i === 6 ? C.gold : C.navy }} />
                <Text style={{ fontSize: 12, marginTop: 4, color: C.sub, fontWeight: i === 6 ? '800' : '500' }}>{labels[i]}</Text>
              </View>
            );
          })}
        </Row>
      </Card>
      <T.sub style={{ marginTop: 12, textAlign: 'center' }}>Cusco Drive no te cobra comisión: el margen ya va incluido en lo que paga el pasajero.</T.sub>
    </Screen>
  );
}

// ---------------- C5 · BONOS ----------------
export function BonusesScreen() {
  const { state } = useApp();
  const d = state.driver;
  const cfg = state.config;
  const today = d.earningsWeek[6].trips;
  const cancelPct = d.accepted ? (d.cancelled / d.accepted) * 100 : 0;
  const eligible = d.profile.rating >= cfg.bonusMinRating && cancelPct <= cfg.bonusMaxCancelPct;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <NavyHeader title="Bonos y premios">
        <Text style={{ color: C.navyText, marginTop: 12 }}>Hoy llevas</Text>
        <Text style={{ fontFamily: F.price, fontSize: 40, color: C.gold, lineHeight: 48 }}>{today} viajes</Text>
        <Text style={{ color: C.navyText, fontSize: 13 }}>Los bonos del día se depositan al instante en tu billetera</Text>
      </NavyHeader>
      <Screen edges={[]} contentStyle={{ paddingTop: 16 }}>
        {!eligible ? (
          <Card flat style={{ backgroundColor: C.redSoft, borderColor: C.redSoft, marginBottom: 10 }}>
            <Text style={{ color: C.redText, fontWeight: '800' }}>Bonos pausados: necesitas ★ {cfg.bonusMinRating}+ y menos de {cfg.bonusMaxCancelPct}% de cancelaciones.</Text>
          </Card>
        ) : null}
        <T.h2>Metas del día</T.h2>
        {cfg.driverDailyBonuses.map((b) => {
          const done = d.bonusesPaidToday.includes(b.trips) || today >= b.trips;
          return (
            <Card key={b.trips} style={{ marginTop: 10 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text style={{ fontWeight: '800', fontSize: 15 }}>{b.trips} viajes → {money(b.amount)} extra</Text>
                {done ? <Badge text="Logrado" tone="green" icon="checkmark" /> : <Text style={{ fontWeight: '800', color: C.navy }}>{today}/{b.trips}</Text>}
              </Row>
              <Progress value={today / b.trips} color={done ? C.green : C.gold} track={C.mapBg} style={{ marginTop: 10 }} />
              {!done ? <T.sub style={{ marginTop: 6 }}>Te faltan {b.trips - today} viajes</T.sub> : null}
            </Card>
          );
        })}
        <Card style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: C.purpleSoft }}>
          <Ionicons name="star" size={28} color={C.purple} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ fontWeight: '800', color: C.purpleText }}>Tu calificación: ★ {d.profile.rating}</Text>
            <T.sub>Cancelaciones: {cancelPct.toFixed(1)}% · requisito para bonos</T.sub>
          </View>
        </Card>
        <T.h2 style={{ marginTop: 22 }}>Insignias</T.h2>
        <Row style={{ marginTop: 10 }}>
          <BadgeCard icon="shield-checkmark" title="Verificado" on={d.profile.badges?.includes('verificado')} />
          <BadgeCard icon="star" title="Conductor Estrella" on={d.profile.badges?.includes('estrella')} />
          <BadgeCard icon="trophy" title="Top 3 del mes" on={false} />
        </Row>
        <T.h2 style={{ marginTop: 22 }}>Otros premios</T.h2>
        <Card style={{ marginTop: 10, paddingVertical: 4 }}>
          <ListItem icon="trophy" iconColor={C.gold} title="Top 3 del mes" sub="Kit de mantenimiento + S/ 30 · auspicia Lubricentro Valle" />
          <ListItem icon="people" iconColor={C.green} title="Trae a un conductor" sub="S/ 10 en tu billetera cuando sea aprobado" />
          <ListItem icon="rainy" iconColor={C.navy} title="Zonas y horas difíciles" sub="Bono en madrugada, lluvia y comunidades lejanas" />
        </Card>
      </Screen>
    </View>
  );
}
const BadgeCard = ({ icon, title, on }) => (
  <View style={{ flex: 1, alignItems: 'center', backgroundColor: C.white, borderRadius: 16, padding: 12, marginHorizontal: 4, opacity: on ? 1 : 0.4, ...shadow }}>
    <Ionicons name={icon} size={30} color={C.gold} />
    <Text style={{ fontWeight: '800', color: C.navy, textAlign: 'center', marginTop: 4, fontSize: 12 }}>{title}</Text>
  </View>
);

// ---------------- PERFIL CONDUCTOR ----------------
export function DriverProfile({ navigation }) {
  const { state, logout, setRole } = useApp();
  const d = state.driver;
  const p = d.profile;
  const days = (iso) => (iso ? Math.round((new Date(iso) - new Date()) / 86400000) : null);
  return (
    <Screen>
      <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
        <Avatar name={p.name} size={84} bg={C.greenSoft} color={C.greenText} />
        <T.h2 style={{ marginTop: 10 }}>{p.name}</T.h2>
        <Row style={{ marginTop: 4 }}><Stars value={p.rating} /><Text style={{ marginLeft: 6, fontWeight: '800' }}>{p.rating}</Text></Row>
        <T.sub style={{ marginTop: 4, textAlign: 'center' }}>{p.totalTrips} viajes · {p.association}</T.sub>
        <Row style={{ marginTop: 10 }}>
          <Badge text="✓ Conductor verificado" tone="green" />
          {p.badges?.includes('estrella') ? <Badge text="★ Conductor Estrella" tone="gold" style={{ marginLeft: 6 }} /> : null}
        </Row>
      </Card>
      <T.label style={{ marginTop: 20 }}>VEHÍCULO</T.label>
      <Card style={{ marginTop: 8, paddingVertical: 4 }}>
        <ListItem node={<CatIcon id={p.category} size={24} />} iconBg={catById(p.category).soft} title={p.vehicle} sub={`Placa ${p.plate} · ${catById(p.category).name}`} />
        <ListItem icon="wallet" iconColor={C.green} title="Cuenta para retiros" sub={`${p.payout.method} · ${p.payout.account}`} />
      </Card>
      <T.label style={{ marginTop: 20 }}>DOCUMENTOS Y VENCIMIENTOS</T.label>
      <Card style={{ marginTop: 8, paddingVertical: 4 }}>
        {p.documents.map((doc) => {
          const left = days(doc.expires);
          const warn = left !== null && left < 30;
          return (
            <ListItem
              key={doc.id}
              icon="document-text"
              iconColor={warn ? C.goldText : C.green}
              title={doc.name}
              sub={doc.expires ? `Vence en ${left} días (${new Date(doc.expires).toLocaleDateString('es-PE')})` : 'Vigente'}
              right={warn ? <Badge text="Renovar" tone="gold" /> : <Ionicons name="checkmark-circle" size={20} color={C.green} />}
            />
          );
        })}
      </Card>
      <Card style={{ marginTop: 20, paddingVertical: 4 }}>
        <ListItem icon="swap-horizontal" iconColor={C.gold} title="Cambiar a modo pasajero" onPress={() => { setRole('passenger'); navigation.reset({ index: 0, routes: [{ name: 'PassengerTabs' }] }); }} />
        <ListItem icon="settings" iconColor={C.sub} title="Panel admin (demo)" onPress={() => navigation.navigate('Admin')} />
      </Card>
      <Btn title="Cerrar sesión" variant="ghost" icon="log-out" style={{ marginTop: 20 }} onPress={() => { logout(); navigation.reset({ index: 0, routes: [{ name: 'Login' }] }); }} />
      <AndeanBorder style={{ marginTop: 24, borderRadius: 4 }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, height: 48, paddingLeft: 6, paddingRight: 14, borderRadius: 999, ...shadow },
  zoneTag: { marginLeft: 16, marginTop: 10, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.95)' },
  toggle: { flexDirection: 'row', alignItems: 'center', height: 72, borderRadius: 20, paddingHorizontal: 16, marginTop: 4 },
  switchTrack: { width: 60, height: 34, borderRadius: 17, backgroundColor: C.white, padding: 4, justifyContent: 'center' },
  switchKnob: { width: 26, height: 26, borderRadius: 13 },
  bonusRow: { marginTop: 12, backgroundColor: C.purpleSoft, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 16 },
  reqCard: { backgroundColor: C.white, borderRadius: 26, padding: 18, ...shadow, shadowOpacity: 0.3 },
  callBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.goldSoft, alignItems: 'center', justifyContent: 'center' },
  demo: { backgroundColor: C.purpleSoft, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10 },
  mini: { flex: 1, marginHorizontal: 4, borderRadius: 12, padding: 10 },
  gpsBtn: { position: 'absolute', right: 16, top: -62, width: 50, height: 50, borderRadius: 25, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', ...shadow },
});
