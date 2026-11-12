import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Modal, Linking, Animated, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, shadow, money } from '../../theme';
import { Btn, Card, Row, T, Avatar, Stars, Badge, Sheet, Confirm, ReceiptLine, Progress, BalancePill, ListItem, Empty, Header, Screen, AndeanBorder } from '../../components/ui';
import Map, { regionAround } from '../../components/Map';
import { catById, DRIVER_CANCEL_REASONS, URUBAMBA_CENTER } from '../../data/mock';
import { fmtDate, round10 } from '../../logic/pricing';
import { useApp } from '../../store/AppStore';

// ---------------- HOME CONDUCTOR ----------------
export function DriverHome({ navigation }) {
  const { state, toggleAvailable, activateFreeDay } = useApp();
  const d = state.driver;
  const cfg = state.config;
  const today = d.earningsWeek[6];
  const tripsLeft = Math.floor(d.balance / (cfg.commission[d.profile.category]?.type === 'fixed' ? cfg.commission[d.profile.category].value : 0.5));
  const low = d.balance < cfg.lowBalanceAlert;
  const empty = d.balance < cfg.minDriverBalance;

  useEffect(() => {
    if (d.active) navigation.navigate('DriverTrip');
  }, [d.active?.id]);

  return (
    <View style={{ flex: 1 }}>
      <Map
        initialRegion={{ ...URUBAMBA_CENTER, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
        showArea
        markers={[{ key: 'me', ...d.position, emoji: catById(d.profile.category).emoji, color: d.available ? C.green : C.muted }]}
      />
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <Row style={{ padding: 14, justifyContent: 'space-between' }}>
          <View style={[s.pill]}>
            <Avatar name={d.profile.name} size={30} color={C.green} />
            <Text style={{ marginLeft: 8, fontWeight: '800', color: C.navy }}>{d.profile.name.split(' ')[0]}</Text>
            {d.profile.badges?.includes('estrella') ? <Text style={{ marginLeft: 4 }}>⭐</Text> : null}
          </View>
          <BalancePill balance={d.balance} cfg={cfg} onPress={() => navigation.navigate('Wallet')} />
        </Row>
        {empty ? (
          <TouchableOpacity onPress={() => navigation.navigate('Recharge')} style={[s.alert, { backgroundColor: C.red }]}>
            <Ionicons name="alert-circle" size={20} color={C.white} />
            <Text style={s.alertText}>Saldo insuficiente: no recibirás solicitudes. Toca para recargar.</Text>
          </TouchableOpacity>
        ) : low ? (
          <TouchableOpacity onPress={() => navigation.navigate('Recharge')} style={[s.alert, { backgroundColor: C.yellowWarn }]}>
            <Ionicons name="warning" size={20} color={C.white} />
            <Text style={s.alertText}>Saldo bajo: te quedan ~{tripsLeft} viajes. Recarga aquí.</Text>
          </TouchableOpacity>
        ) : null}
        {d.freeCommissionToday ? (
          <View style={[s.alert, { backgroundColor: C.purple }]}>
            <Text style={s.alertText}>🎁 Hoy es tu día sin comisión</Text>
          </View>
        ) : null}
      </SafeAreaView>

      <View style={s.sheet}>
        <TouchableOpacity activeOpacity={0.85} onPress={toggleAvailable} style={[s.toggle, { backgroundColor: d.available ? C.green : C.navy }]}>
          <View>
            <Text style={{ color: C.white, fontSize: 20, fontWeight: '900' }}>{d.available ? 'Disponible' : 'No disponible'}</Text>
            <Text style={{ color: '#DDE6F7', marginTop: 2 }}>{d.available ? 'Buscando solicitudes cerca de ti…' : 'Activa para recibir viajes'}</Text>
          </View>
          <Switch value={d.available} onValueChange={toggleAvailable} trackColor={{ true: '#9EE6AE', false: '#5E6B82' }} thumbColor={C.white} />
        </TouchableOpacity>
        <Row style={{ marginTop: 14 }}>
          <Stat label="Viajes hoy" value={today.trips} />
          <Stat label="Ganado hoy" value={money(today.gross - today.commission)} color={C.green} />
          <Stat label="Calificación" value={`★ ${d.profile.rating}`} color={C.gold} />
        </Row>
        <TouchableOpacity onPress={() => navigation.navigate('Bonuses')} style={s.bonusRow}>
          <Text style={{ fontSize: 22 }}>🏆</Text>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ fontWeight: '800', color: C.navy }}>Meta semanal: {d.weekTrips}/{nextBonus(cfg, d.weekTrips).trips} viajes → +{money(nextBonus(cfg, d.weekTrips).amount)}</Text>
            <Progress value={d.weekTrips / nextBonus(cfg, d.weekTrips).trips} color={C.green} style={{ marginTop: 6 }} />
          </View>
        </TouchableOpacity>
        {d.freeDayAvailable ? (
          <Btn small title="🎁 Usar mi día sin comisión (premio 4.8+)" variant="ghost" style={{ marginTop: 10 }} onPress={activateFreeDay} />
        ) : null}
      </View>
    </View>
  );
}

export const nextBonus = (cfg, n) => cfg.driverBonuses.find((b) => n < b.trips) || cfg.driverBonuses[cfg.driverBonuses.length - 1];

const Stat = ({ label, value, color = C.navy }) => (
  <View style={{ flex: 1, alignItems: 'center' }}>
    <Text style={{ fontSize: 19, fontWeight: '900', color }}>{value}</Text>
    <Text style={{ color: C.sub, fontSize: 12, marginTop: 2 }}>{label}</Text>
  </View>
);

// ---------------- SOLICITUD ENTRANTE (global) ----------------
export function IncomingRequestModal() {
  const { state, acceptIncoming, rejectIncoming } = useApp();
  const req = state.driver.incoming;
  const [left, setLeft] = useState(30);
  const anim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!req) return;
    setLeft(30);
    anim.setValue(1);
    Animated.timing(anim, { toValue: 0, duration: 30000, useNativeDriver: false }).start();
    const iv = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(iv);
  }, [req?.id]);

  useEffect(() => {
    if (req && left <= 0) rejectIncoming(true);
  }, [left]);

  if (!req || state.session.role !== 'driver') return null;
  const cat = catById(req.category);
  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => rejectIncoming()}>
      <View style={{ flex: 1, backgroundColor: 'rgba(10,20,45,0.55)', justifyContent: 'flex-end' }}>
        <View style={s.reqCard}>
          <Animated.View style={{ height: 6, borderRadius: 3, backgroundColor: left > 10 ? C.green : C.red, width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
          <Row style={{ justifyContent: 'space-between', marginTop: 14 }}>
            <Row>
              <Text style={{ fontSize: 34 }}>{cat.emoji}</Text>
              <View style={{ marginLeft: 10 }}>
                <T.h2>Nueva solicitud</T.h2>
                <T.sub>{cat.name} · {req.passenger} ★ {req.passengerRating}</T.sub>
              </View>
            </Row>
            <View style={s.timer}><Text style={{ fontWeight: '900', color: C.navy, fontSize: 18 }}>{left}s</Text></View>
          </Row>

          <View style={{ backgroundColor: C.greenSoft, borderRadius: 16, padding: 14, marginTop: 14, alignItems: 'center' }}>
            <Text style={{ color: C.green, fontWeight: '700' }}>Ganas (tu tarifa)</Text>
            <Text style={{ fontSize: 42, fontWeight: '900', color: C.green }}>{money(req.price.driverFare)}</Text>
            <Text style={{ color: C.sub, fontSize: 13 }}>
              Cobras {money(req.toPay)} en efectivo · Comisión {money(state.driver.freeCommissionToday ? 0 : req.price.commission)}
            </Text>
            {req.discount ? <Text style={{ color: C.purple, fontSize: 12, marginTop: 2, fontWeight: '700' }}>Pasajero usa cupón: te devolvemos {money(req.discount)} a tu saldo</Text> : null}
          </View>

          <View style={{ marginTop: 14 }}>
            <Row><View style={[s.dot, { backgroundColor: C.green }]} /><T.p style={{ marginLeft: 10, flex: 1 }}><Text style={{ fontWeight: '800' }}>Recojo:</Text> {req.origin.name} · a {req.pickupKm} km</T.p></Row>
            <View style={{ width: 2, height: 12, backgroundColor: C.border, marginLeft: 5 }} />
            <Row><View style={[s.dot, { backgroundColor: C.gold }]} /><T.p style={{ marginLeft: 10, flex: 1 }}><Text style={{ fontWeight: '800' }}>Destino:</Text> {req.dest.name} · {req.price.km} km</T.p></Row>
            {req.cargo ? <T.sub style={{ marginTop: 8 }}>📦 {req.cargo.desc} (tamaño {req.cargo.size})</T.sub> : null}
          </View>

          <Row style={{ marginTop: 18 }}>
            <Btn title="Rechazar" variant="ghost" style={{ flex: 1, marginRight: 10 }} onPress={() => rejectIncoming()} />
            <Btn title="Aceptar" variant="success" style={{ flex: 1.6 }} icon="checkmark" onPress={acceptIncoming} />
          </Row>
          <T.sub style={{ textAlign: 'center', marginTop: 8 }}>Precio fijo: no se negocia.</T.sub>
        </View>
      </View>
    </Modal>
  );
}

// ---------------- VIAJE DEL CONDUCTOR ----------------
export function DriverTrip({ navigation }) {
  const { state, driverAdvance, driverCancel, confirmCash, finishDriverTrip, toast } = useApp();
  const a = state.driver.active;
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [stars, setStars] = useState(5);

  useEffect(() => {
    if (!a) navigation.goBack();
  }, [!!a]);
  if (!a) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  const target = a.stage === 'toPickup' || a.stage === 'atPickup' ? a.origin : a.dest;
  const openNav = () =>
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${target.latitude},${target.longitude}&travelmode=driving`);

  // ----- Cobro -----
  if (a.stage === 'charging' || a.stage === 'rating') {
    const commission = a.stage === 'rating' ? a.commissionCharged : state.driver.freeCommissionToday ? 0 : a.price.commission;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {a.stage === 'charging' ? (
            <>
              <View style={{ alignItems: 'center', marginTop: 10 }}>
                <Text style={{ fontSize: 60 }}>💵</Text>
                <T.h2 style={{ marginTop: 6 }}>Cobra en efectivo</T.h2>
              </View>
              <Card style={{ marginTop: 14, alignItems: 'center', backgroundColor: C.goldSoft }}>
                <T.sub>Cobra a {a.passenger}</T.sub>
                <Text style={{ fontSize: 52, fontWeight: '900', color: C.navy }}>{money(a.toPay)}</Text>
              </Card>
            </>
          ) : (
            <View style={{ alignItems: 'center', marginTop: 10 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="checkmark" size={48} color={C.white} />
              </View>
              <T.h2 style={{ marginTop: 10 }}>¡Viaje completado!</T.h2>
              <T.sub>Saldo actual: {money(state.driver.balance)}</T.sub>
            </View>
          )}
          <Card style={{ marginTop: 12 }}>
            <ReceiptLine label="Tu tarifa" value={money(a.price.driverFare)} color={C.green} />
            <ReceiptLine label="Comisión Cusco Drive" value={commission ? `- ${money(commission)}` : 'S/ 0.00 🎁'} />
            {a.discount ? <ReceiptLine label="Reembolso por cupón" value={`+ ${money(a.discount)}`} color={C.purple} /> : null}
            <View style={{ height: 1, backgroundColor: C.border, marginVertical: 4 }} />
            <ReceiptLine label="Efectivo recibido" value={money(a.toPay)} />
            <ReceiptLine label="Movimiento en tu saldo" value={`${round10(a.discount - commission) >= 0 ? '+' : '-'} ${money(Math.abs(a.discount - commission))}`} bold />
          </Card>
          {a.stage === 'charging' ? (
            <>
              <T.sub style={{ marginTop: 10, textAlign: 'center' }}>Al confirmar se descuenta la comisión de tu saldo prepago.</T.sub>
              <Btn title="Confirmar cobro" icon="cash" variant="success" style={{ marginTop: 14 }} onPress={confirmCash} />
            </>
          ) : (
            <Card style={{ marginTop: 12, alignItems: 'center' }}>
              <T.h3>Califica a {a.passenger}</T.h3>
              <View style={{ marginTop: 10 }}><Stars value={stars} size={34} onChange={setStars} /></View>
              <Btn
                title="Listo, seguir trabajando"
                style={{ marginTop: 16, alignSelf: 'stretch' }}
                onPress={() => { finishDriverTrip(); toast('¡Gracias! Sigues disponible.', 'success'); }}
              />
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const stageInfo = {
    toPickup: { title: 'Ve al punto de recojo', btn: 'Llegué', icon: 'flag', variant: 'secondary' },
    atPickup: { title: `Esperando a ${a.passenger}`, btn: 'Iniciar viaje', icon: 'play', variant: 'primary' },
    ongoing: { title: 'Viaje en curso', btn: 'Finalizar viaje', icon: 'stop-circle', variant: 'success' },
  }[a.stage];

  return (
    <View style={{ flex: 1 }}>
      <Map
        initialRegion={regionAround([state.driver.position, a.origin, a.dest], 1.6)}
        route={a.stage === 'ongoing' ? [a.origin, a.dest] : [state.driver.position, a.origin]}
        markers={[
          { key: 'me', ...(a.stage === 'ongoing' ? a.origin : a.stage === 'atPickup' ? a.origin : state.driver.position), emoji: catById(a.category).emoji, color: C.white },
          { key: 'o', latitude: a.origin.latitude, longitude: a.origin.longitude, color: C.green, label: a.stage === 'toPickup' ? 'Recojo' : undefined },
          { key: 'd', latitude: a.dest.latitude, longitude: a.dest.longitude, color: C.gold, label: a.stage === 'ongoing' ? a.dest.name : undefined },
        ]}
      />
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <Row style={{ padding: 12, justifyContent: 'space-between' }}>
          <View style={s.pill}><Text style={{ fontWeight: '900', color: C.green }}>Cobras {money(a.toPay)}</Text></View>
          <TouchableOpacity onPress={openNav} style={[s.pill, { backgroundColor: C.navy }]}>
            <Ionicons name="navigate" size={18} color={C.white} />
            <Text style={{ color: C.white, fontWeight: '800', marginLeft: 6 }}>Navegar</Text>
          </TouchableOpacity>
        </Row>
      </SafeAreaView>
      <View style={s.sheet}>
        <T.h2>{stageInfo.title}</T.h2>
        <Card style={{ marginTop: 12, padding: 12, flexDirection: 'row', alignItems: 'center' }}>
          <Avatar name={a.passenger} color={C.purple} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <T.h3>{a.passenger}</T.h3>
            <T.sub numberOfLines={1}>{a.stage === 'ongoing' ? `Destino: ${a.dest.name}` : `Recojo: ${a.origin.name}`}</T.sub>
          </View>
          <TouchableOpacity onPress={() => Linking.openURL('tel:987000111')} style={s.callBtn}><Ionicons name="call" size={22} color={C.navy} /></TouchableOpacity>
        </Card>
        {a.cargo ? <T.sub style={{ marginTop: 8 }}>📦 {a.cargo.desc}</T.sub> : null}
        <Btn
          title={stageInfo.btn}
          icon={stageInfo.icon}
          variant={stageInfo.variant}
          style={{ marginTop: 14 }}
          onPress={() => (a.stage === 'ongoing' ? setConfirmEnd(true) : driverAdvance())}
        />
        {a.stage !== 'ongoing' ? <Btn title="Cancelar viaje" variant="ghost" small style={{ marginTop: 8 }} onPress={() => setCancelOpen(true)} /> : null}
      </View>
      <Confirm
        visible={confirmEnd}
        title="¿Finalizar el viaje?"
        text={`Confirma que llegaste a ${a.dest.name}. Luego cobrarás ${money(a.toPay)} en efectivo.`}
        confirmText="Finalizar"
        variant="success"
        onCancel={() => setConfirmEnd(false)}
        onConfirm={() => { setConfirmEnd(false); driverAdvance(); }}
      />
      <Sheet visible={cancelOpen} onClose={() => setCancelOpen(false)} title="Motivo de cancelación">
        <T.sub style={{ marginBottom: 6 }}>No se cobra comisión en viajes cancelados.</T.sub>
        {DRIVER_CANCEL_REASONS.map((r) => (
          <TouchableOpacity key={r} onPress={() => { setCancelOpen(false); driverCancel(r); }} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <Text style={{ fontSize: 16, color: C.text }}>{r}</Text>
          </TouchableOpacity>
        ))}
      </Sheet>
    </View>
  );
}

// ---------------- SALDO ----------------
export function WalletScreen({ navigation }) {
  const { state } = useApp();
  const d = state.driver;
  const cfg = state.config;
  const color = d.balance < cfg.minDriverBalance ? C.red : d.balance < cfg.lowBalanceAlert ? C.yellowWarn : C.green;
  const icon = { commission: 'remove-circle', recharge: 'add-circle', bonus: 'gift', refund: 'return-down-back', free: 'happy' };
  return (
    <Screen>
      <T.h1>Mi saldo</T.h1>
      <Card style={{ marginTop: 14, backgroundColor: C.navy }}>
        <Text style={{ color: '#C9D3EA' }}>Saldo prepago</Text>
        <Text style={{ color: C.white, fontSize: 44, fontWeight: '900' }}>{money(d.balance)}</Text>
        <Row style={{ marginTop: 4 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
          <Text style={{ color: '#DDE6F7', marginLeft: 6 }}>
            {d.balance < cfg.minDriverBalance ? 'Sin saldo: no recibes solicitudes' : d.balance < cfg.lowBalanceAlert ? 'Saldo bajo' : 'Saldo saludable'}
          </Text>
        </Row>
        <Btn title="Recargar saldo" icon="add" style={{ marginTop: 16 }} onPress={() => navigation.navigate('Recharge')} />
      </Card>
      <Card style={{ marginTop: 12, backgroundColor: C.goldSoft }}>
        <T.sub>
          ¿Cómo funciona? El pasajero te paga todo en efectivo. Al finalizar cada viaje descontamos la comisión de este saldo. Si un pasajero usa cupón, te devolvemos la diferencia: tú siempre cobras tu tarifa completa.
        </T.sub>
      </Card>
      <T.h2 style={{ marginTop: 20 }}>Movimientos</T.h2>
      <Card style={{ marginTop: 10, paddingVertical: 4 }}>
        {d.movements.map((m) => (
          <ListItem
            key={m.id}
            icon={icon[m.type] || 'ellipse'}
            iconColor={m.amount > 0 ? C.green : m.amount < 0 ? C.red : C.purple}
            title={m.label}
            sub={fmtDate(m.date)}
            right={<Text style={{ fontWeight: '900', color: m.amount > 0 ? C.green : m.amount < 0 ? C.red : C.sub }}>{m.amount > 0 ? '+' : m.amount < 0 ? '-' : ''}{money(Math.abs(m.amount))}</Text>}
          />
        ))}
      </Card>
    </Screen>
  );
}

export function RechargeScreen({ navigation }) {
  const { recharge, toast } = useApp();
  const [amount, setAmount] = useState(20);
  const [method, setMethod] = useState('Yape');
  const [step, setStep] = useState(1);
  const methods = [
    { id: 'Yape', color: '#742284', icon: 'phone-portrait' },
    { id: 'Plin', color: '#00B2A9', icon: 'phone-portrait' },
    { id: 'Agente', color: C.navy, icon: 'storefront' },
  ];
  const pay = () => {
    setStep(2);
    setTimeout(() => {
      recharge(amount, method);
      setStep(3);
    }, 2200);
  };
  if (step === 3) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.white, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 80 }}>✅</Text>
        <T.h1 style={{ marginTop: 10 }}>¡Recarga exitosa!</T.h1>
        <T.p style={{ color: C.sub, marginTop: 6 }}>Se sumaron {money(amount)} a tu saldo por {method}.</T.p>
        <Btn title="Volver" style={{ alignSelf: 'stretch', marginTop: 24 }} onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }
  return (
    <Screen>
      <Header title="Recargar saldo" onBack={() => navigation.goBack()} />
      <T.h3>Monto</T.h3>
      <Row style={{ flexWrap: 'wrap', marginTop: 8 }}>
        {[10, 20, 50, 100].map((v) => (
          <TouchableOpacity key={v} onPress={() => setAmount(v)} style={[s.amount, amount === v && { borderColor: C.gold, backgroundColor: C.goldSoft }]}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: C.navy }}>S/ {v}</Text>
            <Text style={{ color: C.sub, fontSize: 12 }}>~{Math.floor(v / 0.4)} viajes</Text>
          </TouchableOpacity>
        ))}
      </Row>
      <T.h3 style={{ marginTop: 18 }}>Método</T.h3>
      {methods.map((m) => (
        <TouchableOpacity key={m.id} onPress={() => setMethod(m.id)} style={[s.method, method === m.id && { borderColor: m.color }]}>
          <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: m.color, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={m.icon} size={22} color={C.white} />
          </View>
          <Text style={{ flex: 1, marginLeft: 12, fontSize: 17, fontWeight: '800', color: C.text }}>{m.id}</Text>
          <Ionicons name={method === m.id ? 'radio-button-on' : 'radio-button-off'} size={22} color={method === m.id ? m.color : C.muted} />
        </TouchableOpacity>
      ))}
      {method !== 'Agente' ? (
        <Card style={{ marginTop: 14, alignItems: 'center' }}>
          <T.sub>Yapea o plinea al número de Cusco Drive</T.sub>
          <Text style={{ fontSize: 26, fontWeight: '900', color: C.navy, letterSpacing: 1, marginTop: 4 }}>984 000 123</Text>
          <T.sub>A nombre de: Cusco Drive S.A.C. · Mensaje: tu placa</T.sub>
        </Card>
      ) : (
        <Card style={{ marginTop: 14 }}>
          <T.sub>Acércate a un agente autorizado (bodegas del Mercado Central y paraderos asociados) con tu placa y el monto.</T.sub>
        </Card>
      )}
      <Btn title={step === 2 ? 'Verificando pago…' : `Ya pagué ${money(amount)}`} loading={step === 2} style={{ marginTop: 18 }} onPress={pay} />
      <T.sub style={{ textAlign: 'center', marginTop: 8 }}>Demo: el pago se confirma automáticamente.</T.sub>
    </Screen>
  );
}

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
  const sum = tab === 'hoy' ? w[6] : w.reduce((a, e) => ({ trips: a.trips + e.trips, gross: a.gross + e.gross, commission: a.commission + e.commission }), { trips: 0, gross: 0, commission: 0 });
  const max = Math.max(...w.map((e) => e.gross - e.commission));
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
        <T.sub>Ganancia neta</T.sub>
        <Text style={{ fontSize: 44, fontWeight: '900', color: C.green }}>{money(sum.gross - sum.commission)}</Text>
        <Row style={{ marginTop: 10 }}>
          <View style={{ flex: 1, alignItems: 'center' }}><T.h3>{sum.trips}</T.h3><T.sub>Viajes</T.sub></View>
          <View style={{ flex: 1, alignItems: 'center' }}><T.h3>{money(sum.gross)}</T.h3><T.sub>Cobrado</T.sub></View>
          <View style={{ flex: 1, alignItems: 'center' }}><T.h3 style={{ color: C.red }}>{money(sum.commission)}</T.h3><T.sub>Comisión</T.sub></View>
        </Row>
      </Card>
      <Card style={{ marginTop: 14 }}>
        <T.h3>Neto por día</T.h3>
        <Row style={{ alignItems: 'flex-end', height: 150, marginTop: 14, justifyContent: 'space-between' }}>
          {w.map((e, i) => {
            const net = e.gross - e.commission;
            return (
              <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 10, color: C.sub, marginBottom: 4 }}>{Math.round(net)}</Text>
                <View style={{ width: 22, height: Math.max(6, (net / max) * 110), borderRadius: 6, backgroundColor: i === 6 ? C.gold : C.navy }} />
                <Text style={{ fontSize: 12, marginTop: 4, color: C.sub, fontWeight: i === 6 ? '800' : '500' }}>{labels[i]}</Text>
              </View>
            );
          })}
        </Row>
      </Card>
      <T.sub style={{ marginTop: 12, textAlign: 'center' }}>Comisión promedio: {sum.gross ? ((sum.commission / sum.gross) * 100).toFixed(1) : 0}% de lo cobrado.</T.sub>
    </Screen>
  );
}

// ---------------- BONOS ----------------
export function BonusesScreen() {
  const { state } = useApp();
  const d = state.driver;
  const cfg = state.config;
  return (
    <Screen>
      <T.h1>Bonos y premios</T.h1>
      <T.h2 style={{ marginTop: 18 }}>Metas de la semana</T.h2>
      {cfg.driverBonuses.map((b) => {
        const done = d.weekTrips >= b.trips;
        return (
          <Card key={b.trips} style={{ marginTop: 10 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T.h3>{b.trips} viajes → {money(b.amount)} de saldo</T.h3>
              {done ? <Badge text="Logrado" color={C.green} icon="checkmark" /> : <Text style={{ fontWeight: '800', color: C.navy }}>{d.weekTrips}/{b.trips}</Text>}
            </Row>
            <Progress value={d.weekTrips / b.trips} color={done ? C.green : C.gold} style={{ marginTop: 10 }} />
            {!done ? <T.sub style={{ marginTop: 6 }}>Te faltan {b.trips - d.weekTrips} viajes</T.sub> : null}
          </Card>
        );
      })}
      <T.h2 style={{ marginTop: 22 }}>Insignias</T.h2>
      <Row style={{ marginTop: 10 }}>
        <BadgeCard emoji="🛡️" title="Verificado" on={d.profile.badges?.includes('verificado')} />
        <BadgeCard emoji="⭐" title="Conductor Estrella" on={d.profile.badges?.includes('estrella')} />
        <BadgeCard emoji="🌙" title="Nocturno" on={false} />
      </Row>
      <T.h2 style={{ marginTop: 22 }}>Otros premios</T.h2>
      <Card style={{ marginTop: 10, paddingVertical: 4 }}>
        <ListItem emoji="🎁" iconColor={C.purple} title="Día sin comisión" sub={d.freeCommissionToday ? 'Activo hoy' : d.freeDayAvailable ? 'Disponible (calificación 4.8+)' : 'Usado este mes'} />
        <ListItem emoji="🏆" iconColor={C.gold} title="Top 3 del mes" sub="Kit de mantenimiento + S/ 30 de saldo · auspicia Lubricentro Valle" />
        <ListItem emoji="🤝" iconColor={C.green} title="Trae un conductor" sub="S/ 10 de saldo cuando sea aprobado" />
        <ListItem emoji="🌧️" iconColor={C.navy} title="Zonas y horas difíciles" sub="Bono en madrugada, lluvia y comunidades lejanas" />
      </Card>
    </Screen>
  );
}
const BadgeCard = ({ emoji, title, on }) => (
  <View style={{ flex: 1, alignItems: 'center', backgroundColor: C.white, borderRadius: 16, padding: 12, marginHorizontal: 4, opacity: on ? 1 : 0.4, ...shadow }}>
    <Text style={{ fontSize: 34 }}>{emoji}</Text>
    <Text style={{ fontWeight: '700', color: C.navy, textAlign: 'center', marginTop: 4, fontSize: 12 }}>{title}</Text>
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
        <Avatar name={p.name} size={84} color={C.green} />
        <T.h2 style={{ marginTop: 10 }}>{p.name}</T.h2>
        <Row style={{ marginTop: 4 }}><Stars value={p.rating} /><Text style={{ marginLeft: 6, fontWeight: '800', color: C.text }}>{p.rating}</Text></Row>
        <T.sub style={{ marginTop: 4 }}>{p.totalTrips} viajes · {p.association}</T.sub>
        <Row style={{ marginTop: 10 }}>
          <Badge text="Conductor verificado" color={C.green} icon="shield-checkmark" />
          {p.badges?.includes('estrella') ? <><View style={{ width: 6 }} /><Badge text="Estrella" color={C.gold} icon="star" /></> : null}
        </Row>
      </Card>
      <T.sub style={{ marginTop: 20, fontWeight: '800' }}>VEHÍCULO</T.sub>
      <Card style={{ marginTop: 8, paddingVertical: 4 }}>
        <ListItem emoji={catById(p.category).emoji} title={p.vehicle} sub={`Placa ${p.plate} · ${catById(p.category).name}`} />
      </Card>
      <T.sub style={{ marginTop: 20, fontWeight: '800' }}>DOCUMENTOS Y VENCIMIENTOS</T.sub>
      <Card style={{ marginTop: 8, paddingVertical: 4 }}>
        {p.documents.map((doc) => {
          const left = days(doc.expires);
          const warn = left !== null && left < 30;
          return (
            <ListItem
              key={doc.id}
              icon="document-text"
              iconColor={warn ? C.yellowWarn : C.green}
              title={doc.name}
              sub={doc.expires ? `Vence en ${left} días (${new Date(doc.expires).toLocaleDateString('es-PE')})` : 'Vigente'}
              right={warn ? <Badge text="Renovar" color={C.yellowWarn} /> : <Ionicons name="checkmark-circle" size={20} color={C.green} />}
            />
          );
        })}
      </Card>
      <Card style={{ marginTop: 20, paddingVertical: 4 }}>
        <ListItem
          icon="swap-horizontal"
          iconColor={C.gold}
          title="Cambiar a modo pasajero"
          onPress={() => { setRole('passenger'); navigation.reset({ index: 0, routes: [{ name: 'PassengerTabs' }] }); }}
        />
        <ListItem icon="settings" iconColor={C.sub} title="Panel admin (demo)" onPress={() => navigation.navigate('Admin')} />
      </Card>
      <Btn title="Cerrar sesión" variant="ghost" icon="log-out" style={{ marginTop: 20 }} onPress={() => { logout(); navigation.reset({ index: 0, routes: [{ name: 'RoleSelect' }] }); }} />
      <AndeanBorder style={{ marginTop: 24 }} height={8} />
    </Screen>
  );
}

const s = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 30, ...shadow },
  alert: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginBottom: 8, padding: 12, borderRadius: 14, ...shadow },
  alertText: { color: C.white, fontWeight: '800', marginLeft: 8, flex: 1 },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 16, paddingBottom: 20, ...shadow },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 18 },
  bonusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, backgroundColor: C.greenSoft, padding: 12, borderRadius: 14 },
  reqCard: { backgroundColor: C.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 34 },
  timer: { width: 56, height: 56, borderRadius: 28, borderWidth: 3, borderColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  callBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.goldSoft, alignItems: 'center', justifyContent: 'center' },
  amount: { width: '47%', marginRight: '3%', marginBottom: 10, padding: 16, borderRadius: 16, borderWidth: 2, borderColor: C.border, backgroundColor: C.white, alignItems: 'center' },
  method: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 2, borderColor: C.border, backgroundColor: C.white, marginTop: 10 },
});
