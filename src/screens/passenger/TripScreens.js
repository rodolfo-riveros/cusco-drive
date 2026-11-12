import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, ScrollView, Animated, Easing, Linking, Share, StyleSheet, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, F, shadow, money } from '../../theme';
import {
  Btn, Card, Row, T, Text, Avatar, Stars, Badge, Sheet, Confirm, ReceiptLine, Chip, Progress, BottomPanel, StepPills,
  CatIcon, RoundBtn, Input, RouteDots,
} from '../../components/ui';
import Map, { regionAround } from '../../components/Map';
import { catById, CANCEL_REASONS, QUICK_MESSAGES, RATING_TAGS, CATEGORIES, DISPUTE_REASONS, DEMO_SPEED } from '../../data/mock';
import { useApp } from '../../store/AppStore';
import { fmtClock } from '../../logic/pricing';
import { useNow } from '../../components/useNow';

const STEPS = ['Buscando', 'En camino', 'En curso', 'Listo'];
const stepIndex = (st) => ({ searching: 0, nodrivers: 0, assigned: 1, arrived: 1, ongoing: 2, atDestination: 3, finished: 3, disputed: 3 }[st] ?? 0);

export function shareTrip(trip) {
  const msg = `Estoy viajando con Cusco Drive\nConductor: ${trip.driver?.name || '—'} · Placa ${trip.driver?.plate || '—'}\nDe ${trip.origin.name} a ${trip.dest.name}\nSigue mi viaje: https://cuscodrive.pe/v/${trip.id}`;
  Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() => Share.share({ message: msg }));
}

// ---------------- FLUJO DE VIAJE ----------------
export function TripFlow({ navigation }) {
  const { state, cancelTrip, retrySearch, skipStage, toast, confirmArrival, openDispute, endTrip } = useApp();
  const trip = state.trip;
  const cfg = state.config;
  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirmFree, setConfirmFree] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [pulse] = useState(() => new Animated.Value(0));
  const now = useNow(trip?.status === 'searching' || trip?.status === 'atDestination');
  const elapsed = trip?.status === 'searching' ? Math.max(0, Math.floor((now - trip.createdAt) / 1000)) : 0;
  const releaseLeft = trip?.status === 'atDestination' ? Math.max(0, trip.releaseAt - now) : 0;

  useEffect(() => {
    if (trip?.status === 'finished') navigation.replace('TripFinished');
    if (!trip) navigation.goBack();
  }, [trip?.status, !!trip]);

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, []);

  if (!trip || trip.status === 'finished') return <View style={{ flex: 1, backgroundColor: C.mapBg }} />;
  const cat = catById(trip.category);

  // -------- P4 · Buscando --------
  if (trip.status === 'searching') {
    const limit = cfg.searchTimeoutMin * 60;
    const simElapsed = Math.min(limit, elapsed * DEMO_SPEED);
    return (
      <View style={{ flex: 1, backgroundColor: C.mapBg }}>
        <Map initialRegion={{ ...trip.origin, latitude: trip.origin.latitude - 0.003, latitudeDelta: 0.016, longitudeDelta: 0.014 }} markers={[]} />
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={{ position: 'absolute', left: 0, right: 0, top: '22%', alignItems: 'center' }}>
            <View style={{ width: 240, height: 240, alignItems: 'center', justifyContent: 'center' }}>
              <Animated.View style={{ position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: C.gold, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }] }} />
              <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(245,166,35,0.25)' }} />
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.navy, borderWidth: 4, borderColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
                <CatIcon id={trip.category} size={20} color={C.white} strokeWidth={2} />
              </View>
            </View>
          </View>
        </View>
        <BottomPanel style={{ paddingBottom: 24 }}>
          <StepPills steps={STEPS} index={0} />
          <Text style={{ fontFamily: F.title, fontSize: 22, color: C.navy, marginTop: 14 }}>Buscando tu {cat.name.toLowerCase()}…</Text>
          <Text style={{ fontSize: 15, color: C.sub, marginTop: 4 }}>Avisamos a los conductores cercanos. El primero que acepte irá por ti.</Text>
          <Progress value={simElapsed / limit} color={C.gold} track={C.mapBg} style={{ marginTop: 14 }} />
          <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <T.sub style={{ fontSize: 12 }}>{fmtClock(simElapsed)}</T.sub>
            <T.sub style={{ fontSize: 12 }}>hasta {fmtClock(limit)}</T.sub>
          </Row>
          <Row style={[s.amountBox, { marginTop: 14 }]}>
            <View style={{ flex: 1 }}>
              <T.sub style={{ fontSize: 12 }}>{trip.origin.name.replace('Mi ubicación ', '')} → {trip.dest.name}</T.sub>
              <Row>
                <Ionicons name="lock-closed" size={13} color={C.greenText} />
                <Text style={{ fontWeight: '800', fontSize: 14, marginLeft: 4 }}>{cat.name} · Pago retenido</Text>
              </Row>
            </View>
            <Text style={{ fontFamily: F.price, fontSize: 24, color: C.navy }}>{money(trip.toPay)}</Text>
          </Row>
          <Btn title="Cancelar (sin costo)" variant="dangerOutline" onPress={() => setConfirmFree(true)} style={{ marginTop: 14, height: 54 }} />
        </BottomPanel>
        <Confirm
          visible={confirmFree}
          title="¿Cancelar la solicitud?"
          text={`Ningún conductor aceptó aún: te devolvemos ${money(trip.toPay)} completos a tu billetera.`}
          confirmText="Sí, cancelar"
          variant="danger"
          onCancel={() => setConfirmFree(false)}
          onConfirm={() => { setConfirmFree(false); cancelTrip(); }}
        />
      </View>
    );
  }

  // -------- Sin conductores (reembolsado) --------
  if (trip.status === 'nodrivers') {
    const others = CATEGORIES.filter((c) => c.id !== trip.category && !!c.cargo === !!cat.cargo);
    const retry = (c) => {
      const r = retrySearch(c);
      if (!r.ok && r.missing) navigation.navigate('Recharge', { suggest: r.missing });
    };
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.white, padding: 24, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 72 }}>😕</Text>
          <T.h1 style={{ textAlign: 'center', marginTop: 10 }}>Nadie aceptó en {cfg.searchTimeoutMin} minutos</T.h1>
          <View style={{ backgroundColor: C.greenSoft, borderRadius: 12, padding: 12, marginTop: 14, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="checkmark-circle" size={20} color={C.green} />
            <Text style={{ color: C.greenText, fontWeight: '800', marginLeft: 8, flex: 1 }}>Te devolvimos {money(trip.toPay)} a tu billetera.</Text>
          </View>
          <T.p style={{ textAlign: 'center', color: C.sub, marginTop: 12 }}>Puedes reintentar (se vuelve a retener el pago) o probar otra categoría.</T.p>
        </View>
        <Btn title={`Reintentar · ${money(trip.toPay)}`} icon="refresh" onPress={() => retry()} style={{ marginTop: 24 }} />
        {others.map((o) => (
          <Btn key={o.id} title={`Probar con ${o.name}`} variant="ghost" onPress={() => retry(o.id)} style={{ marginTop: 10 }} />
        ))}
        <Btn title="Volver al inicio" variant="ghost" onPress={endTrip} style={{ marginTop: 10 }} />
      </SafeAreaView>
    );
  }

  // -------- Reclamo enviado --------
  if (trip.status === 'disputed') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.white, padding: 24, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: C.goldSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="shield-half" size={46} color={C.goldText} />
          </View>
          <T.h1 style={{ textAlign: 'center', marginTop: 16 }}>Reclamo enviado</T.h1>
          <T.p style={{ textAlign: 'center', color: C.sub, marginTop: 8 }}>
            “{trip.disputeReason}”. Tu pago de {money(trip.toPay)} queda retenido: no se le paga al conductor hasta que Cusco Drive revise el caso.
          </T.p>
        </View>
        <Card flat style={{ marginTop: 20 }}>
          <ReceiptLine label="Monto retenido" value={money(trip.toPay)} bold />
          <T.sub>Te escribiremos por WhatsApp en menos de 24 h. Si tienes razón, te devolvemos el dinero a tu billetera.</T.sub>
        </Card>
        <Btn title="Volver al inicio" onPress={endTrip} style={{ marginTop: 20 }} />
      </SafeAreaView>
    );
  }

  // -------- Llegada: confirmar o reclamar (pago retenido) --------
  if (trip.status === 'atDestination') {
    const simLeft = (releaseLeft * DEMO_SPEED) / 1000;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
          <StepPills steps={STEPS} index={3} />
          <View style={{ alignItems: 'center', marginTop: 18 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="flag" size={40} color={C.white} />
            </View>
            <T.h1 style={{ marginTop: 12 }}>¡Llegaste!</T.h1>
            <T.sub style={{ fontSize: 15 }}>{trip.dest.name} · {trip.driver.name} finalizó el viaje</T.sub>
          </View>
          <Card style={{ marginTop: 18 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View>
                <T.sub>Pago retenido</T.sub>
                <Text style={{ fontFamily: F.price, fontSize: 34, color: C.navy }}>{money(trip.toPay)}</Text>
              </View>
              <Badge text="Protegido" tone="green" icon="lock-closed" />
            </Row>
            <T.sub style={{ marginTop: 6 }}>
              Si todo estuvo bien, confirma y se paga {money(trip.price.driverFare)} a {trip.driver.name.split(' ')[0]}. Si no confirmas, se libera solo en:
            </T.sub>
            <Row style={{ marginTop: 10, alignItems: 'center' }}>
              <Ionicons name="time-outline" size={18} color={C.navy} />
              <Text style={{ fontFamily: F.title, fontSize: 20, color: C.navy, marginLeft: 6 }}>{fmtClock(simLeft)}</Text>
              <T.sub style={{ marginLeft: 8 }}>(demo acelerado)</T.sub>
            </Row>
            <Progress value={1 - simLeft / (cfg.autoReleaseMin * 60)} color={C.green} track={C.mapBg} style={{ marginTop: 8 }} />
          </Card>
          <Btn title="Todo bien, confirmar" icon="checkmark-circle" variant="success" onPress={confirmArrival} style={{ marginTop: 16 }} />
          <Btn title="Tengo un problema" icon="alert-circle" variant="dangerOutline" onPress={() => setDisputeOpen(true)} style={{ marginTop: 10 }} />
          <T.sub style={{ textAlign: 'center', marginTop: 10 }}>Si reclamas, el dinero queda retenido hasta que lo revise el equipo de Cusco Drive.</T.sub>
        </ScrollView>
        <Sheet visible={disputeOpen} onClose={() => setDisputeOpen(false)} title="¿Qué pasó?">
          {DISPUTE_REASONS.map((r) => (
            <TouchableOpacity key={r} onPress={() => { setDisputeOpen(false); openDispute(r); }} style={s.reason}>
              <Text style={{ fontSize: 16 }}>{r}</Text>
            </TouchableOpacity>
          ))}
        </Sheet>
      </SafeAreaView>
    );
  }

  // -------- P5 · Conductor en camino / llegó / en curso --------
  const d = trip.driver;
  const leftMin = Math.max(1, Math.round(trip.eta * (1 - trip.progress)));
  const leftM = Math.round((trip.distKm || 0.6) * 1000 * (1 - trip.progress) / 10) * 10;
  const markers = [
    { key: 'o', latitude: trip.origin.latitude, longitude: trip.origin.longitude, kind: 'origin' },
    { key: 'd', latitude: trip.dest.latitude, longitude: trip.dest.longitude, kind: 'dest', label: trip.status === 'ongoing' ? trip.dest.name : undefined },
    trip.driverPos ? { key: 'drv', ...trip.driverPos, kind: 'vehicle', category: trip.category } : null,
  ].filter(Boolean);
  const canCancel = trip.status !== 'ongoing';
  const fee = trip.status === 'arrived' ? cfg.cancelFeeArrived : 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.mapBg }}>
      <Map
        initialRegion={regionAround([trip.origin, trip.dest, trip.driverStart], 1.9)}
        route={trip.status === 'ongoing' ? [trip.driverPos || trip.origin, trip.dest] : trip.driverPos ? [trip.driverPos, trip.origin] : null}
        markers={markers}
      />
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }} pointerEvents="box-none">
        <Row style={{ paddingHorizontal: 16, paddingTop: 12, justifyContent: 'space-between' }}>
          <View style={s.etaPill}>
            <Text style={{ color: C.white, fontWeight: '800', fontSize: 14 }}>
              {trip.status === 'assigned' ? <>Llega en <Text style={{ color: C.gold, fontWeight: '800' }}>{leftMin} min</Text> · {leftM} m</> : trip.status === 'arrived' ? <Text style={{ color: C.gold, fontWeight: '800' }}>Tu conductor llegó</Text> : <>Viaje en curso · <Text style={{ color: C.gold, fontWeight: '800' }}>{Math.round(trip.progress * 100)}%</Text></>}
            </Text>
          </View>
          <RoundBtn icon="chevron-down" onPress={() => navigation.goBack()} label="Minimizar" />
        </Row>
      </SafeAreaView>

      <BottomPanel>
        <Row style={{ justifyContent: 'space-between' }}>
          <StepPills steps={STEPS} index={stepIndex(trip.status)} />
          <TouchableOpacity onPress={skipStage} style={s.demo}><Text style={{ color: C.purple, fontWeight: '800', fontSize: 11 }}>Demo ⏩</Text></TouchableOpacity>
        </Row>
        {trip.status === 'arrived' ? (
          <View style={{ backgroundColor: C.goldSoft, borderRadius: 12, padding: 10, marginTop: 12 }}>
            <Text style={{ color: C.goldText, fontWeight: '800' }}>¡{d.name.split(' ')[0]} te espera en el punto de recojo!</Text>
          </View>
        ) : null}
        {trip.status === 'ongoing' ? (
          <View style={{ marginTop: 12 }}>
            <T.sub>Destino: <Text style={{ fontWeight: '800' }}>{trip.dest.name}</Text></T.sub>
            <Progress value={trip.progress} color={C.gold} track={C.mapBg} style={{ marginTop: 8 }} />
          </View>
        ) : null}

        <Row style={{ marginTop: 14 }}>
          <Avatar name={d.name} size={60} />
          <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
            <Text style={{ fontWeight: '800', fontSize: 17 }} numberOfLines={1}>{d.name}</Text>
            <Text style={{ fontSize: 13, color: C.sub }} numberOfLines={1}><Text style={{ color: C.goldText, fontWeight: '800', fontSize: 13 }}>★ {d.rating}</Text> · {d.vehicle}</Text>
            <Row style={{ marginTop: 4 }}>
              <Badge text="✓ Verificado" tone="green" />
              {d.star ? <Badge text="★ Estrella" tone="gold" style={{ marginLeft: 6 }} /> : null}
            </Row>
          </View>
          <View style={s.plate}><Text style={{ fontFamily: F.title, fontSize: 15, color: C.navy, letterSpacing: 1 }}>{d.plate}</Text></View>
        </Row>

        {trip.status !== 'ongoing' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, flexGrow: 0 }}>
            {QUICK_MESSAGES.map((m) => (
              <Chip key={m} label={m} onPress={() => toast(`Mensaje enviado: “${m}”`, 'success')} />
            ))}
          </ScrollView>
        ) : (
          <TouchableOpacity onPress={() => navigation.navigate('SearchDestination', { mode: 'change', category: trip.category })} style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="swap-vertical" size={16} color={C.navy} />
            <Text style={{ fontWeight: '800', color: C.navy, marginLeft: 6 }}>Cambiar destino</Text>
          </TouchableOpacity>
        )}

        <Row style={{ marginTop: 12, marginHorizontal: -4 }}>
          <ActionTile icon="call" label="Llamar" bg={C.navySoft} fg={C.navy} onPress={() => Linking.openURL(`tel:${d.phone}`)} />
          <ActionTile icon="share-social" label="Compartir" bg={C.greenSoft} fg={C.greenText} onPress={() => shareTrip(trip)} />
          <ActionTile icon="warning" label="SOS" bg={C.red} fg={C.white} onPress={() => navigation.navigate('Help', { trip: true })} />
        </Row>

        <Row style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.mapBg, justifyContent: 'space-between' }}>
          <View>
            <Row>
              <Ionicons name="lock-closed" size={12} color={C.greenText} />
              <Text style={{ fontSize: 12, color: C.sub, marginLeft: 4 }}>Pagado con billetera · retenido</Text>
            </Row>
            <Text style={{ fontFamily: F.price, fontSize: 22, color: C.navy }}>{money(trip.toPay)}</Text>
          </View>
          {canCancel ? (
            <TouchableOpacity onPress={() => setCancelOpen(true)} style={{ padding: 10 }}>
              <Text style={{ color: C.redText, fontWeight: '800' }}>Cancelar viaje</Text>
            </TouchableOpacity>
          ) : null}
        </Row>
      </BottomPanel>

      <Sheet visible={cancelOpen} onClose={() => setCancelOpen(false)} title="¿Por qué cancelas?">
        <T.sub style={{ marginBottom: 8 }}>
          {fee > 0
            ? `El conductor ya está en el punto de recojo: se le pagan ${money(fee)} por la espera y te devolvemos ${money(trip.toPay - fee)}.`
            : `Te devolvemos ${money(trip.toPay)} completos. Muchas cancelaciones generan una advertencia.`}
        </T.sub>
        {CANCEL_REASONS.map((r) => (
          <TouchableOpacity key={r} onPress={() => { setCancelOpen(false); cancelTrip(r); }} style={s.reason}>
            <Text style={{ fontSize: 16 }}>{r}</Text>
          </TouchableOpacity>
        ))}
      </Sheet>
    </View>
  );
}

const ActionTile = ({ icon, label, onPress, bg, fg }) => (
  <TouchableOpacity onPress={onPress} style={{ flex: 1, height: 64, borderRadius: 16, backgroundColor: bg, marginHorizontal: 4, alignItems: 'center', justifyContent: 'center' }}>
    <Ionicons name={icon} size={22} color={fg} />
    <Text style={{ fontWeight: '800', fontSize: 13, color: fg, marginTop: 2 }}>{label}</Text>
  </TouchableOpacity>
);

// ---------------- P6 · VIAJE TERMINADO ----------------
export function TripFinished({ navigation }) {
  const { state, rateTrip, toast } = useApp();
  const [trip] = useState(() => state.trip);
  const [stars, setStars] = useState(5);
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState('');

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  if (!trip) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <Btn title="Volver al inicio" onPress={() => navigation.popToTop()} />
      </SafeAreaView>
    );
  }
  const send = () => {
    rateTrip(stars, comment, tags);
    toast('¡Gracias por tu calificación!', 'success');
    navigation.popToTop();
  };
  const cfg = state.config;
  const first = trip.driver.name.split(' ')[0];
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.green }}>
        <View style={{ alignItems: 'center', paddingVertical: 18 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={40} color={C.white} />
          </View>
          <Text style={{ fontFamily: F.title, fontSize: 26, color: C.white, marginTop: 8 }}>¡Llegaste!</Text>
          <Text style={{ color: '#DDF3E2', fontSize: 15 }}>{trip.dest.name} · {trip.price.minutes} min</Text>
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <View>
              <T.sub>Pagado con tu billetera</T.sub>
              <Text style={{ fontFamily: F.price, fontSize: 36, color: C.navy }}>{money(trip.toPay)}</Text>
            </View>
            <Badge text={`Liberado · ${trip.releasedHow}`} tone="green" icon="checkmark" />
          </Row>
          <View style={{ height: 1, backgroundColor: C.mapBg, marginVertical: 8 }} />
          <ReceiptLine label="Tarifa del conductor" value={money(trip.price.driverFare)} sub={`Se pagó completa a ${first}`} />
          <ReceiptLine label="Servicio Cusco Drive" value={money(trip.price.margin)} />
          {trip.discount ? <ReceiptLine label="Vale aplicado" value={`− ${money(trip.discount)}`} color={C.green} /> : null}
          <ReceiptLine label="Total" value={money(trip.toPay)} bold />
          <T.sub style={{ marginTop: 2 }}>{trip.price.km} km · {catById(trip.category).name} · {trip.origin.name.replace('Mi ubicación ', '')} → {trip.dest.name}</T.sub>
        </Card>

        <View style={{ marginTop: 12, backgroundColor: C.purpleSoft, borderRadius: 16, padding: 14 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: C.purpleText, fontWeight: '800' }}>+1 punto · llevas {trip.pointsAfter % cfg.pointsPerReward || cfg.pointsPerReward} de {cfg.pointsPerReward}</Text>
            <Text style={{ color: C.purpleText, fontWeight: '800' }}>{money(cfg.pointsRewardAmount)}</Text>
          </Row>
          <Progress value={(trip.pointsAfter % cfg.pointsPerReward || cfg.pointsPerReward) / cfg.pointsPerReward} style={{ marginTop: 8 }} />
          {trip.earned?.length ? <Text style={{ color: C.purpleText, marginTop: 8, fontWeight: '800' }}>🎉 Ganaste: {trip.earned.join(', ')}</Text> : null}
        </View>

        <Card style={{ marginTop: 12, alignItems: 'center' }}>
          <Text style={{ fontFamily: F.title, fontSize: 17, color: C.navy }}>¿Cómo te fue con {first}?</Text>
          <View style={{ marginTop: 10 }}><Stars value={stars} size={38} onChange={setStars} /></View>
          <Row style={{ flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 }}>
            {RATING_TAGS.map((t) => (
              <Chip key={t} label={t} active={tags.includes(t)} onPress={() => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])} style={{ marginBottom: 8 }} />
            ))}
          </Row>
          <Input value={comment} onChangeText={setComment} placeholder="Comentario (opcional)" style={{ alignSelf: 'stretch', marginTop: 4 }} />
        </Card>
        <Btn title="Enviar calificación" onPress={send} style={{ marginTop: 16 }} />
        <Btn title="Reportar un problema" variant="ghost" onPress={() => navigation.navigate('Help', { report: true })} style={{ marginTop: 10 }} />
      </ScrollView>
    </View>
  );
}

export { RouteDots };

const s = StyleSheet.create({
  amountBox: { borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'space-between' },
  etaPill: { backgroundColor: C.navy, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, ...shadow },
  plate: { borderWidth: 2, borderColor: C.navy, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginLeft: 8 },
  demo: { backgroundColor: C.purpleSoft, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10 },
  reason: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
});
