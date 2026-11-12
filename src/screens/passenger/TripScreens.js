import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated, Easing, Linking, Share, TextInput, StyleSheet, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, shadow, money } from '../../theme';
import { Btn, Card, Row, T, Avatar, Stars, Badge, Sheet, Confirm, ReceiptLine, Chip, Progress } from '../../components/ui';
import Map, { regionAround } from '../../components/Map';
import { catById, CANCEL_REASONS, QUICK_MESSAGES, RATING_TAGS, CATEGORIES } from '../../data/mock';
import { useApp } from '../../store/AppStore';

const STEPS = ['Buscando', 'En camino', 'En curso', 'Finalizado'];
const stepIndex = (st) => ({ searching: 0, nodrivers: 0, assigned: 1, arrived: 1, ongoing: 2, finished: 3 }[st] ?? 0);

function StatusBar({ status }) {
  const idx = stepIndex(status);
  return (
    <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
      {STEPS.map((label, i) => (
        <View key={label} style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ height: 5, alignSelf: 'stretch', marginHorizontal: 2, borderRadius: 3, backgroundColor: i <= idx ? C.gold : C.border }} />
          <Text style={{ fontSize: 11, marginTop: 4, color: i <= idx ? C.navy : C.muted, fontWeight: i === idx ? '800' : '500' }}>{label}</Text>
        </View>
      ))}
    </Row>
  );
}

export function shareTrip(trip) {
  const msg = `🛺 Estoy viajando con Cusco Drive\nConductor: ${trip.driver?.name || '—'} · Placa ${trip.driver?.plate || '—'}\nDe ${trip.origin.name} a ${trip.dest.name}\nPrecio fijo: ${money(trip.toPay)}\nSigue mi viaje: https://cuscodrive.pe/v/${trip.id}`;
  Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() => Share.share({ message: msg }));
}

// ---------------- FLUJO DE VIAJE (buscar → en camino → en curso) ----------------
export function TripFlow({ navigation }) {
  const { state, cancelTrip, retrySearch, skipStage, toast } = useApp();
  const trip = state.trip;
  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirmFree, setConfirmFree] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (trip?.status === 'finished') navigation.replace('TripFinished');
    if (!trip) navigation.goBack();
  }, [trip?.status, !!trip]);

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    if (trip?.status !== 'searching') return;
    setElapsed(0);
    const iv = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(iv);
  }, [trip?.status, trip?.createdAt]);

  if (!trip || trip.status === 'finished') return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  const cat = catById(trip.category);

  // -------- Buscando --------
  if (trip.status === 'searching') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ width: 240, height: 240, alignItems: 'center', justifyContent: 'center' }}>
            {[0, 1].map((k) => (
              <Animated.View
                key={k}
                style={{
                  position: 'absolute', width: 240, height: 240, borderRadius: 120, backgroundColor: C.gold,
                  opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }),
                  transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.3 + k * 0.2, 1] }) }],
                }}
              />
            ))}
            <View style={{ width: 110, height: 110, borderRadius: 55, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 56 }}>{cat.emoji}</Text>
            </View>
          </View>
          <Text style={{ color: C.white, fontSize: 24, fontWeight: '900', marginTop: 20, textAlign: 'center' }}>Buscando {cat.name.toLowerCase()} cerca de ti…</Text>
          <Text style={{ color: '#C9D3EA', marginTop: 8, textAlign: 'center' }}>{trip.origin.name} → {trip.dest.name}</Text>
          <Text style={{ color: C.gold, fontSize: 30, fontWeight: '900', marginTop: 14 }}>{money(trip.toPay)}</Text>
          <Text style={{ color: '#C9D3EA', marginTop: 4 }}>Precio fijo · efectivo · {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</Text>
        </View>
        <View style={{ padding: 20 }}>
          <Btn title="Cancelar solicitud" variant="light" onPress={() => setConfirmFree(true)} />
          <Text style={{ color: '#C9D3EA', textAlign: 'center', marginTop: 8, fontSize: 12 }}>Cancelar ahora no tiene costo.</Text>
        </View>
        <Confirm
          visible={confirmFree}
          title="¿Cancelar la solicitud?"
          text="Aún ningún conductor la aceptó, así que no tiene costo."
          confirmText="Sí, cancelar"
          variant="danger"
          onCancel={() => setConfirmFree(false)}
          onConfirm={() => { setConfirmFree(false); cancelTrip(); }}
        />
      </SafeAreaView>
    );
  }

  // -------- Sin conductores --------
  if (trip.status === 'nodrivers') {
    const others = CATEGORIES.filter((c) => c.id !== trip.category && !!c.cargo === !!cat.cargo);
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.white, padding: 24, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 80 }}>😕</Text>
          <T.h1 style={{ textAlign: 'center', marginTop: 10 }}>No hay conductores disponibles</T.h1>
          <T.p style={{ textAlign: 'center', color: C.sub, marginTop: 8 }}>Nadie aceptó en 2 minutos. Puedes reintentar o probar otra categoría.</T.p>
        </View>
        <Btn title="Reintentar" icon="refresh" onPress={() => retrySearch()} style={{ marginTop: 24 }} />
        {others.map((o) => (
          <Btn key={o.id} title={`Probar con ${o.emoji} ${o.name}`} variant="ghost" onPress={() => retrySearch(o.id)} style={{ marginTop: 10 }} />
        ))}
        <Btn title="Cancelar" variant="ghost" onPress={() => cancelTrip()} style={{ marginTop: 10 }} />
      </SafeAreaView>
    );
  }

  // -------- Conductor asignado / llegó / en curso --------
  const d = trip.driver;
  const title = {
    assigned: `Tu conductor llega en ~${Math.max(1, Math.round(trip.eta * (1 - trip.progress)))} min`,
    arrived: '¡Tu conductor llegó! 📍',
    ongoing: 'Viaje en curso',
  }[trip.status];
  const markers = [
    { key: 'o', latitude: trip.origin.latitude, longitude: trip.origin.longitude, color: C.green },
    { key: 'd', latitude: trip.dest.latitude, longitude: trip.dest.longitude, color: C.gold, label: trip.dest.name },
    trip.driverPos ? { key: 'drv', ...trip.driverPos, emoji: cat.emoji, color: C.white } : null,
  ].filter(Boolean);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Map
        initialRegion={regionAround([trip.origin, trip.dest, trip.driverStart], 1.7)}
        route={trip.status === 'ongoing' ? [trip.origin, trip.dest] : trip.driverPos ? [trip.driverPos, trip.origin] : null}
        markers={markers}
      />
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <Row style={{ padding: 12, justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.roundBtn}><Ionicons name="chevron-down" size={24} color={C.navy} /></TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Help', { trip: true })} style={st.sos}><Text style={{ color: C.white, fontWeight: '900' }}>SOS</Text></TouchableOpacity>
        </Row>
      </SafeAreaView>

      <View style={st.sheet}>
        <StatusBar status={trip.status} />
        <Row style={{ justifyContent: 'space-between' }}>
          <T.h2 style={{ flex: 1 }}>{title}</T.h2>
          <TouchableOpacity onPress={skipStage} style={st.demo}><Text style={{ color: C.purple, fontWeight: '800', fontSize: 12 }}>Demo ⏩</Text></TouchableOpacity>
        </Row>
        {trip.status === 'ongoing' ? (
          <View style={{ marginTop: 8 }}>
            <T.sub>Destino: <Text style={{ fontWeight: '700', color: C.text }}>{trip.dest.name}</Text></T.sub>
            <Progress value={trip.progress} color={C.gold} style={{ marginTop: 8 }} />
          </View>
        ) : null}

        <Card style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', padding: 12 }}>
          <Avatar name={d.name} color={d.color} size={54} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Row><T.h3>{d.name}</T.h3>{d.star ? <Text style={{ marginLeft: 6 }}>⭐</Text> : null}</Row>
            <T.sub>{d.vehicle}</T.sub>
            <Row style={{ marginTop: 2 }}>
              <Ionicons name="star" size={13} color={C.gold} />
              <Text style={{ marginLeft: 3, fontWeight: '700', color: C.text }}>{d.rating}</Text>
              <Text style={{ color: C.sub, marginLeft: 6, fontSize: 12 }}>· {d.trips} viajes</Text>
            </Row>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={st.plate}><Text style={{ fontWeight: '900', color: C.navy, letterSpacing: 1 }}>{d.plate}</Text></View>
            <Badge text="Verificado" color={C.green} icon="shield-checkmark" />
          </View>
        </Card>

        {trip.status !== 'ongoing' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            {QUICK_MESSAGES.map((m) => (
              <Chip key={m} label={m} onPress={() => toast(`Mensaje enviado: “${m}”`, 'success')} style={{ paddingVertical: 8 }} />
            ))}
          </ScrollView>
        ) : null}

        <Row style={{ marginTop: 12, justifyContent: 'space-between' }}>
          <Action icon="call" label="Llamar" onPress={() => Linking.openURL(`tel:${d.phone}`)} />
          <Action icon="logo-whatsapp" label="Compartir" color={C.green} onPress={() => shareTrip(trip)} />
          <Action icon="cash" label={money(trip.toPay)} color={C.gold} onPress={() => toast('Pagas en efectivo al terminar. Precio fijo.')} />
          {trip.status !== 'ongoing' ? <Action icon="close" label="Cancelar" color={C.red} onPress={() => setCancelOpen(true)} /> : null}
        </Row>
      </View>

      <Sheet visible={cancelOpen} onClose={() => setCancelOpen(false)} title="¿Por qué cancelas?">
        <T.sub style={{ marginBottom: 8 }}>Un conductor ya aceptó tu viaje. Registramos el motivo; muchas cancelaciones generan una advertencia.</T.sub>
        {CANCEL_REASONS.map((r) => (
          <TouchableOpacity key={r} onPress={() => { setCancelOpen(false); cancelTrip(r); }} style={st.reason}>
            <Text style={{ fontSize: 16, color: C.text }}>{r}</Text>
          </TouchableOpacity>
        ))}
      </Sheet>
    </View>
  );
}

const Action = ({ icon, label, onPress, color = C.navy }) => (
  <TouchableOpacity onPress={onPress} style={{ alignItems: 'center', flex: 1 }}>
    <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={{ fontSize: 12, marginTop: 4, color: C.text, fontWeight: '600' }}>{label}</Text>
  </TouchableOpacity>
);

// ---------------- VIAJE TERMINADO ----------------
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
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: 'center', marginTop: 10 }}>
          <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={48} color={C.white} />
          </View>
          <T.h1 style={{ marginTop: 12 }}>¡Llegaste!</T.h1>
          <T.sub>{trip.dest.name}</T.sub>
        </View>

        <Card style={{ marginTop: 18, alignItems: 'center', backgroundColor: C.goldSoft }}>
          <T.sub>Paga en efectivo a {trip.driver.name.split(' ')[0]}</T.sub>
          <Text style={{ fontSize: 44, fontWeight: '900', color: C.navy }}>{money(trip.toPay)}</Text>
        </Card>

        <Card style={{ marginTop: 12 }}>
          <T.h3 style={{ marginBottom: 6 }}>Recibo</T.h3>
          <ReceiptLine label="Tarifa del conductor" value={money(trip.price.driverFare)} />
          <ReceiptLine label="Cargo de servicio" value={money(trip.price.commission)} />
          {trip.discount ? <ReceiptLine label="Descuento (cupón)" value={`- ${money(trip.discount)}`} color={C.green} /> : null}
          <View style={{ height: 1, backgroundColor: C.border, marginVertical: 4 }} />
          <ReceiptLine label="Total pagado" value={money(trip.toPay)} bold />
          <T.sub style={{ marginTop: 4 }}>{trip.price.km} km · {catById(trip.category).name} · Efectivo</T.sub>
        </Card>

        <Card style={{ marginTop: 12, backgroundColor: C.purpleSoft, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 36 }}>🦙</Text>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ color: C.purple, fontWeight: '900', fontSize: 16 }}>+1 punto · ahora tienes {trip.pointsAfter}</Text>
            <Progress value={(trip.pointsAfter % cfg.pointsPerReward) / cfg.pointsPerReward} style={{ marginTop: 6 }} />
            {trip.earned?.length ? <Text style={{ color: C.purple, marginTop: 6, fontWeight: '700' }}>🎉 Ganaste: {trip.earned.join(', ')}</Text> : null}
          </View>
        </Card>

        <Card style={{ marginTop: 12, alignItems: 'center' }}>
          <T.h3>¿Cómo estuvo tu viaje con {trip.driver.name.split(' ')[0]}?</T.h3>
          <View style={{ marginTop: 10 }}><Stars value={stars} size={36} onChange={setStars} /></View>
          <Row style={{ flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 }}>
            {RATING_TAGS.map((t) => (
              <Chip key={t} label={t} active={tags.includes(t)} onPress={() => setTags(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t])} style={{ marginBottom: 8, paddingVertical: 7 }} />
            ))}
          </Row>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Deja un comentario (opcional)"
            placeholderTextColor={C.muted}
            style={{ alignSelf: 'stretch', borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 12, marginTop: 6, color: C.text }}
          />
        </Card>
        <Btn title="Enviar calificación" onPress={send} style={{ marginTop: 16 }} />
        <Btn title="Reportar un problema" variant="ghost" onPress={() => navigation.navigate('Help', { report: true })} style={{ marginTop: 10 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 16, paddingBottom: 26, ...shadow },
  roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', ...shadow },
  sos: { backgroundColor: C.red, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', ...shadow },
  plate: { borderWidth: 2, borderColor: C.navy, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 6, backgroundColor: C.goldSoft },
  demo: { backgroundColor: C.purpleSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  reason: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },
});
