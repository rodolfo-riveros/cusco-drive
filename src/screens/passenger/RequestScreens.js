import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, ScrollView, Switch, StyleSheet, TextInput, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, F, shadow, money } from '../../theme';
import {
  Btn, Card, Row, T, Text, Progress, Header, PriceCard, ListItem, Badge, Sheet, BottomPanel, CatIcon, GiftIcon,
  RouteDots, RoundBtn, Input,
} from '../../components/ui';
import Map from '../../components/Map';
import { CATEGORIES, PLACES, catById, placeById, DRIVERS } from '../../data/mock';
import { useApp } from '../../store/AppStore';
import { inServiceArea, couponValid, couponDiscount, calcPrice, round2, haversineKm } from '../../logic/pricing';
import { currentPosition, placeName, searchPlaces } from '../../logic/geo';

const ptKey = (p) => (p ? `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}` : '');

/** Botón GPS: lee la ubicación real del celular y la usa como "mi ubicación". */
export function useGps() {
  const { setHere, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const locate = async () => {
    setBusy(true);
    try {
      const p = await currentPosition();
      const nm = await placeName(p);
      setHere({ latitude: p.latitude, longitude: p.longitude, ...nm }, 'gps');
      toast(`Ubicación GPS: ${nm.name}${p.accuracy ? ` (±${Math.round(p.accuracy)} m)` : ''}`, 'success');
      return p;
    } catch (e) {
      toast(e.message?.includes('Permiso') ? 'Activa el permiso de ubicación para usar tu GPS' : 'No se pudo leer el GPS. Toca el mapa para marcar tu punto.', 'warn');
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { locate, busy };
}

// ---------------- P1 · HOME / MAPA ----------------
export function PassengerHome({ navigation }) {
  const { state, setDraftPoint, setDraft, clearDraftDest } = useApp();
  const { locate, busy } = useGps();
  const p = state.passenger;
  const cfg = state.config;
  const d = state.draft;
  const here = state.here;
  const trip = state.trip;
  const cat = d.category;
  const origin = d.origin || { ...here, id: 'here', name: here.name || 'Mi ubicación' };
  const dest = d.dest;
  const inCycle = p.points % cfg.pointsPerReward;
  const recent = p.recent.map(placeById).filter(Boolean).slice(0, 2);
  const outOfArea = cfg.restrictToUrubamba && !inServiceArea(here);

  // Vehículos cerca (simulados alrededor del recojo)
  const nearby = DRIVERS.filter((x) => x.category === cat).map((x, i) => ({
    key: x.id,
    latitude: origin.latitude + (x.latitude - -13.3048) * 0.9 + (i % 2 ? 0.0012 : -0.001),
    longitude: origin.longitude + (x.longitude - -72.116) * 0.9,
    kind: 'vehicle',
    category: x.category,
  }));

  const markers = [
    { key: 'me', latitude: here.latitude, longitude: here.longitude, kind: 'me' },
    ...(dest ? [] : nearby),
    ...(d.origin && d.origin.id !== 'here' ? [{ key: 'origin', ...d.origin, kind: 'origin', draggable: true }] : []),
    ...(dest ? [{ key: 'origin', ...origin, kind: 'origin', draggable: true }, { key: 'dest', ...dest, kind: 'dest', draggable: true, label: dest.name }] : []),
  ];
  const fit = dest ? [origin, dest] : [here];
  const fitKey = dest ? `${ptKey(origin)}|${ptKey(dest)}|${d.route ? 'r' : ''}` : `here-${ptKey(here)}`;

  const onMapPress = (coord) => setDraftPoint(d.picking || 'dest', coord);
  const onDrag = (key, coord) => setDraftPoint(key === 'origin' ? 'origin' : 'dest', coord);

  const prices = dest
    ? CATEGORIES.filter((c) => !c.cargo || true).map((c) => ({ c, pr: calcPrice(cfg, { category: c.id, origin, dest, km: d.route?.km, minutes: d.route?.minutes, cargo: c.cargo ? { size: Object.keys(cfg.cargoSizes[c.id])[0] } : undefined }) }))
    : [];
  const sel = prices.find((x) => x.c.id === cat);
  const destOut = dest && cfg.restrictToUrubamba && (!inServiceArea(dest) || !inServiceArea(origin));

  const next = () => {
    if (catById(cat).cargo) navigation.navigate('CargoForm', { category: cat });
    else navigation.navigate('TripSummary', { category: cat });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.mapBg }}>
      <Map markers={markers} route={d.route?.coords} fit={fit} fitKey={fitKey} zoom={16} padBottom={dest ? 380 : 330} padTop={90} onPress={onMapPress} onMarkerDrag={onDrag} />
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }} pointerEvents="box-none">
        <Row style={{ paddingHorizontal: 16, paddingTop: 12, justifyContent: 'space-between' }}>
          <RoundBtn icon="menu" label="Menú" onPress={() => navigation.navigate('Profile')} />
          <TouchableOpacity onPress={() => navigation.navigate('Rewards')} style={s.ptsPill}>
            <GiftIcon size={18} />
            <Text style={{ color: C.white, fontWeight: '800', fontSize: 14, marginLeft: 8 }}>{p.points} pts</Text>
          </TouchableOpacity>
        </Row>
        {trip ? (
          <TouchableOpacity onPress={() => navigation.navigate('TripFlow')} style={s.activeBanner}>
            <Ionicons name="navigate-circle" size={22} color={C.navy} />
            <Text style={{ marginLeft: 8, fontWeight: '800', color: C.navy, flex: 1 }}>
              {trip.status === 'atDestination' ? 'Llegaste · confirma para liberar el pago' : 'Tienes un viaje activo · Ver'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={C.navy} />
          </TouchableOpacity>
        ) : (
          <View style={s.hint}>
            <Ionicons name="hand-left-outline" size={15} color={C.navy} />
            <Text style={{ marginLeft: 6, fontWeight: '800', fontSize: 12, color: C.navy, flex: 1 }}>
              {d.picking === 'origin' ? 'Toca el mapa para marcar dónde te recogen' : dest ? 'Arrastra los puntos o toca el mapa para cambiar el destino' : 'Toca el mapa donde quieres ir'}
            </Text>
          </View>
        )}
      </SafeAreaView>

      <BottomPanel style={{ paddingBottom: 12 }}>
        <TouchableOpacity onPress={locate} style={s.gpsBtn} accessibilityLabel="Mi ubicación GPS">
          {busy ? <ActivityIndicator color={C.navy} /> : <Ionicons name="locate" size={24} color={here.source === 'gps' ? C.green : C.navy} />}
        </TouchableOpacity>

        {!dest ? (
          <>
            <Text style={{ fontFamily: F.title, fontSize: 22, color: C.navy }}>Hola, {p.name.split(' ')[0]}</Text>
            <Row style={{ marginTop: 2 }}>
              <Ionicons name={here.source === 'gps' ? 'navigate' : 'location-outline'} size={13} color={here.source === 'gps' ? C.green : C.sub} />
              <T.sub style={{ marginLeft: 4, flex: 1 }} numberOfLines={1}>
                {here.source === 'gps' ? 'GPS: ' : here.source === 'manual' ? 'Marcado a mano: ' : 'Ubicación de prueba: '}{here.name}
              </T.sub>
            </Row>
            {outOfArea ? (
              <View style={[s.warn, { marginTop: 8 }]}>
                <Text style={{ color: C.redText, fontWeight: '800', fontSize: 12 }}>Tu GPS está fuera de Urubamba. Toca el mapa dentro de Urubamba para simular, o desactiva la restricción en el panel admin.</Text>
              </View>
            ) : null}
            <TouchableOpacity activeOpacity={0.85} style={s.whereBox} onPress={() => navigation.navigate('SearchDestination', { mode: 'dest' })}>
              <Ionicons name="search" size={22} color={C.navy} />
              <Text style={{ fontSize: 17, fontWeight: '700', color: C.sub, marginLeft: 10, flex: 1 }}>¿A dónde vas?</Text>
            </TouchableOpacity>
            <CatRow cat={cat} onChange={(c) => setDraft({ category: c })} />
            {recent.map((pl, i) => (
              <TouchableOpacity key={pl.id} onPress={() => setDraftPoint('dest', pl)} style={[s.recent, i === 0 && recent.length > 1 && { borderBottomWidth: 1, borderBottomColor: C.mapBg }]}>
                <View style={s.recentIcon}><Ionicons name="time-outline" size={18} color={C.sub} /></View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontWeight: '800', fontSize: 15 }}>{pl.name}</Text>
                  <T.sub>{pl.sub}</T.sub>
                </View>
              </TouchableOpacity>
            ))}
            <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Rewards')} style={s.rewards}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: C.purpleText }}>Te faltan {cfg.pointsPerReward - inCycle} viajes para {money(cfg.pointsRewardAmount)} de descuento</Text>
              <Progress value={inCycle / cfg.pointsPerReward} style={{ marginTop: 7 }} height={7} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={s.routeCard}>
              <TouchableOpacity onPress={() => setDraft({ picking: d.picking === 'origin' ? 'dest' : 'origin' })} style={s.routeLine}>
                <View style={[s.dot, { backgroundColor: C.navy }]} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <T.sub style={{ fontSize: 11 }}>Recojo {d.picking === 'origin' ? '· toca el mapa' : ''}</T.sub>
                  <Text style={{ fontWeight: '800' }} numberOfLines={1}>{origin.name}</Text>
                </View>
                <Text style={{ color: C.navy2, fontWeight: '800', fontSize: 12 }}>{d.picking === 'origin' ? 'Listo' : 'Cambiar'}</Text>
              </TouchableOpacity>
              <View style={{ height: 1, backgroundColor: C.border, marginLeft: 22 }} />
              <View style={s.routeLine}>
                <View style={[s.dot, { backgroundColor: C.gold, borderRadius: 2 }]} />
                <TouchableOpacity style={{ flex: 1, marginLeft: 10 }} onPress={() => navigation.navigate('SearchDestination', { mode: 'dest' })}>
                  <T.sub style={{ fontSize: 11 }}>Destino</T.sub>
                  <Text style={{ fontWeight: '800' }} numberOfLines={1}>{dest.name}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={clearDraftDest} hitSlop={10}><Ionicons name="close-circle" size={22} color={C.muted} /></TouchableOpacity>
              </View>
            </View>
            <Row style={{ marginTop: 8 }}>
              {d.route ? (
                <T.sub style={{ flex: 1 }}>
                  {d.route.km.toFixed(1)} km por calle · ~{d.route.minutes || sel?.pr.minutes} min · {sel?.pr.zone}{!d.route.real ? ' (estimado)' : ''}
                </T.sub>
              ) : (
                <Row style={{ flex: 1 }}><ActivityIndicator size="small" color={C.navy} /><T.sub style={{ marginLeft: 6 }}>Calculando ruta real…</T.sub></Row>
              )}
            </Row>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8, marginHorizontal: -4, flexGrow: 0 }}>
              {prices.map(({ c, pr }) => {
                const on = cat === c.id;
                return (
                  <TouchableOpacity key={c.id} onPress={() => setDraft({ category: c.id })} style={[s.priceTile, on && { borderColor: c.color, backgroundColor: c.soft }]}>
                    <CatIcon id={c.id} size={28} />
                    <Text style={{ fontWeight: '800', fontSize: 12, color: c.text }}>{c.name}</Text>
                    <Text style={{ fontFamily: F.price, fontSize: 17, color: C.navy }}>{d.route ? money(pr.final) : '…'}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {destOut ? (
              <View style={[s.warn, { marginTop: 8 }]}><Text style={{ color: C.redText, fontWeight: '800', fontSize: 12 }}>Ese punto está fuera de nuestra zona (Urubamba).</Text></View>
            ) : null}
            <Btn title={d.route && sel ? `Continuar · ${money(sel.pr.final)}` : 'Calculando…'} disabled={!d.route || destOut} onPress={next} style={{ marginTop: 10 }} />
          </>
        )}
      </BottomPanel>
    </View>
  );
}

function CatRow({ cat, onChange }) {
  return (
    <Row style={{ marginTop: 12, marginHorizontal: -4 }}>
      {CATEGORIES.map((c) => {
        const on = cat === c.id;
        return (
          <TouchableOpacity key={c.id} onPress={() => onChange(c.id)} style={[s.catBtn, on && { borderColor: c.color, backgroundColor: c.soft }]}>
            <CatIcon id={c.id} size={30} />
            <Text style={{ fontWeight: '800', fontSize: 12, color: c.text, marginTop: 2 }}>{c.name}</Text>
          </TouchableOpacity>
        );
      })}
    </Row>
  );
}

// ---------------- BUSCAR LUGAR (destino, recojo o cambio de destino) ----------------
export function SearchDestination({ navigation, route }) {
  const { state, setDraftPoint, changeDestination, toast } = useApp();
  const { locate, busy } = useGps();
  const mode = route.params?.mode || 'dest';
  const [q, setQ] = useState('');
  const [osm, setOsm] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const local = PLACES.filter((p) => (p.name + ' ' + p.sub).toLowerCase().includes(q.toLowerCase()));
  const recent = state.passenger.recent.map(placeById).filter(Boolean);

  useEffect(() => {
    if (q.trim().length < 3) return;
    let alive = true;
    const t = setTimeout(async () => {
      setLoading(true);
      const r = await searchPlaces(q);
      if (alive) {
        setOsm(r.filter((x) => !PLACES.some((p) => haversineKm(p, x) < 0.05)));
        setLoading(false);
      }
    }, 600);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  const pick = async (place) => {
    if (mode === 'change') {
      setSaving(true);
      const r = await changeDestination(place);
      setSaving(false);
      if (!r.ok) return toast(r.error || 'No se pudo cambiar el destino', 'error');
      toast(r.diff > 0 ? `Destino cambiado. Se cobró ${money(r.diff)} más por ${state.trip?.method}.` : r.diff < 0 ? `Destino cambiado. Te devolvemos ${money(-r.diff)}.` : 'Destino cambiado. Mismo precio.', 'success');
      return navigation.goBack();
    }
    setDraftPoint(mode === 'origin' ? 'origin' : 'dest', place);
    navigation.goBack();
  };

  const title = mode === 'change' ? 'Cambiar destino' : mode === 'origin' ? '¿Dónde te recogemos?' : '¿A dónde vas?';
  const results = q ? [...local, ...osm] : PLACES;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.white }}>
      <Header title={title} onBack={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: 16 }}>
        <Row style={s.searchBox}>
          <Ionicons name="search" size={20} color={C.navy} />
          <TextInput value={q} onChangeText={setQ} placeholder="Busca una calle, lugar o comunidad" placeholderTextColor={C.muted} style={{ flex: 1, marginLeft: 10, fontSize: 16, color: C.text, paddingVertical: 12, fontFamily: F.bold }} autoFocus />
          {loading ? <ActivityIndicator size="small" color={C.navy} /> : null}
        </Row>
        {mode === 'change' ? <T.sub style={{ marginTop: 8 }}>El precio se recalcula con la ruta real. Si sube, se cobra la diferencia por {state.trip?.method}; si baja, se devuelve.</T.sub> : null}
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        {mode !== 'change' ? (
          <ListItem
            icon="locate"
            iconColor={C.green}
            title={busy ? 'Leyendo tu GPS…' : 'Usar mi ubicación actual (GPS)'}
            sub={state.here.source === 'gps' ? state.here.name : 'Con el GPS de tu celular'}
            onPress={async () => {
              const p = await locate();
              if (p) {
                if (mode === 'origin') setDraftPoint('origin', { latitude: p.latitude, longitude: p.longitude });
                navigation.goBack();
              }
            }}
          />
        ) : null}
        <ListItem icon="map" iconColor={C.navy} title="Elegir en el mapa" sub="Vuelve al mapa y toca el punto exacto" onPress={() => navigation.goBack()} />
        {!q && recent.length ? (
          <>
            <T.label style={s.section}>RECIENTES</T.label>
            {recent.map((p) => <ListItem key={'r' + p.id} icon="time-outline" iconColor={C.sub} iconBg={C.bg} title={p.name} sub={p.sub} onPress={() => pick(p)} />)}
          </>
        ) : null}
        <T.label style={s.section}>{q ? 'RESULTADOS' : 'LUGARES DE URUBAMBA'}</T.label>
        {results.map((p) => {
          const ok = !state.config.restrictToUrubamba || inServiceArea(p);
          return (
            <ListItem key={p.id} icon={p.icon || 'location'} iconColor={ok ? C.navy : C.muted} title={p.name} sub={p.sub} onPress={() => pick(p)} right={!ok ? <Badge text="Sin cobertura" tone="red" /> : undefined} />
          );
        })}
        {q && !results.length && !loading ? <T.sub style={{ textAlign: 'center', marginTop: 20 }}>No encontramos “{q}”. Vuelve al mapa y tócalo directamente.</T.sub> : null}
        <T.sub style={{ textAlign: 'center', marginTop: 12, fontSize: 11 }}>Búsqueda: © OpenStreetMap</T.sub>
      </ScrollView>
      {saving ? <View style={s.overlay}><ActivityIndicator size="large" color={C.white} /></View> : null}
    </SafeAreaView>
  );
}

// ---------------- P3 · FORMULARIO DE CARGA ----------------
export function CargoForm({ navigation, route }) {
  const { state, toast } = useApp();
  const { category } = route.params;
  const { origin, dest, route: r } = state.draft;
  const cat = catById(category);
  const sizes = Object.keys(state.config.cargoSizes[category]);
  const [desc, setDesc] = useState('');
  const [size, setSize] = useState(sizes[Math.min(1, sizes.length - 1)]);
  const [helpers, setHelpers] = useState(category === 'mudanza' ? 1 : 0);
  const [photo, setPhoto] = useState(false);
  const [special, setSpecial] = useState(false);
  const [quoteSent, setQuoteSent] = useState(false);
  if (!origin || !dest) return null;
  const cargo = { desc, size, helpers, photo };
  const price = calcPrice(state.config, { category, origin, dest, cargo, km: r?.km, minutes: r?.minutes });

  const next = () => {
    if (desc.trim().length < 3) return toast('Describe brevemente tu carga', 'warn');
    if (special) return setQuoteSent(true);
    navigation.navigate('TripSummary', { category, cargo });
  };

  if (quoteSent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.white, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name="document-text" size={72} color={C.navy} />
        <T.h1 style={{ textAlign: 'center', marginTop: 10 }}>Cotización solicitada</T.h1>
        <T.p style={{ textAlign: 'center', color: C.sub, marginTop: 10 }}>Un asesor revisará tu mudanza especial y te enviará un precio fijo en menos de 30 minutos. No se cobra nada hasta que lo aceptes.</T.p>
        <Card flat style={{ alignSelf: 'stretch', marginTop: 20 }}>
          <T.sub>Referencia estándar (sin cotizar)</T.sub>
          <Text style={{ fontFamily: F.price, fontSize: 26, color: C.navy }}>{money(price.final)}</Text>
          <T.sub>{origin.name} → {dest.name} · {price.km} km</T.sub>
        </Card>
        <Btn title="Volver al inicio" style={{ alignSelf: 'stretch', marginTop: 20 }} onPress={() => navigation.popToTop()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.white }}>
      <Row style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
        <RoundBtn icon="arrow-back" onPress={() => navigation.goBack()} label="Volver" style={{ shadowOpacity: 0, elevation: 0, backgroundColor: C.bg }} />
        <Text style={{ fontFamily: F.title, fontSize: 20, color: C.navy, marginLeft: 12, flex: 1 }}>{cat.name}</Text>
        <Row style={{ backgroundColor: cat.soft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 }}>
          <CatIcon id={category} size={20} />
          <Text style={{ color: cat.text, fontWeight: '800', fontSize: 13, marginLeft: 6 }}>{price.km} km</Text>
        </Row>
      </Row>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontWeight: '800', fontSize: 15, marginBottom: 8 }}>¿Qué vas a trasladar?</Text>
        <Input value={desc} onChangeText={setDesc} placeholder={category === 'mudanza' ? 'Cama, ropero y 6 cajas' : 'Ej. 3 sacos de papa y verduras'} multiline style={{ minHeight: 70, textAlignVertical: 'top' }} />
        <Text style={{ fontWeight: '800', fontSize: 15, marginTop: 18, marginBottom: 8 }}>Tamaño de la carga</Text>
        <Row style={{ marginHorizontal: -4 }}>
          {sizes.map((z, i) => {
            const on = size === z;
            const add = state.config.cargoSizes[category][z];
            const hint = category === 'mudanza' ? ['Pocas cajas', '1 habitación', 'Casa completa'][i] : ['Bolsas y cajas', 'Sacos del mercado', 'Carga voluminosa'][i];
            return (
              <TouchableOpacity key={z} onPress={() => setSize(z)} style={[s.sizeBtn, on && { borderColor: cat.color, backgroundColor: cat.soft }]}>
                <Text style={{ fontWeight: '800', fontSize: 15, color: on ? cat.text : C.text }}>{z[0].toUpperCase() + z.slice(1)}</Text>
                <Text style={{ fontSize: 12, color: on ? cat.text : C.sub, textAlign: 'center' }}>{hint}</Text>
                {add ? <Text style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>+{money(add)}</Text> : null}
              </TouchableOpacity>
            );
          })}
        </Row>
        {category === 'mudanza' ? (
          <Row style={s.helperBox}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', fontSize: 15 }}>Ayudantes</Text>
              <T.sub>Para cargar y descargar · {money(state.config.helperPrice)} c/u</T.sub>
            </View>
            <TouchableOpacity onPress={() => setHelpers(Math.max(0, helpers - 1))} style={s.stepper}><Text style={{ fontSize: 22, fontWeight: '800', color: C.navy }}>−</Text></TouchableOpacity>
            <Text style={{ fontFamily: F.title, fontSize: 20, marginHorizontal: 16, color: C.navy }}>{helpers}</Text>
            <TouchableOpacity onPress={() => setHelpers(Math.min(4, helpers + 1))} style={s.stepper}><Text style={{ fontSize: 22, fontWeight: '800', color: C.navy }}>+</Text></TouchableOpacity>
          </Row>
        ) : null}
        <TouchableOpacity onPress={() => setPhoto(!photo)} style={[s.photoBox, photo && { borderColor: C.green, backgroundColor: C.greenSoft }]}>
          <Ionicons name={photo ? 'checkmark-circle' : 'camera-outline'} size={22} color={photo ? C.green : C.navy} />
          <Text style={{ marginLeft: 8, color: photo ? C.greenText : C.navy, fontWeight: '800' }}>{photo ? 'Foto agregada (demo)' : 'Agregar foto de la carga (opcional)'}</Text>
        </TouchableOpacity>
        {category === 'mudanza' ? (
          <Row style={{ marginTop: 14, justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontWeight: '800' }}>Mudanza especial</Text>
              <T.sub>Pianos, muchos pisos o carga fuera de lo común: te cotizamos.</T.sub>
            </View>
            <Switch value={special} onValueChange={setSpecial} trackColor={{ true: C.purple }} />
          </Row>
        ) : null}
      </ScrollView>
      <View style={{ padding: 18, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.mapBg }}>
        <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <T.sub>{special ? 'Precio referencial' : `Precio fijo · ${size}${helpers ? ` + ${helpers} ayudante${helpers > 1 ? 's' : ''}` : ''}`}</T.sub>
          <Text style={{ fontFamily: F.price, fontSize: 26, color: C.navy }}>{money(price.final)}</Text>
        </Row>
        <Btn title={special ? 'Solicitar cotización' : 'Continuar'} onPress={next} />
      </View>
    </SafeAreaView>
  );
}

// ---------------- P2 · RESUMEN, PRECIO FIJO Y PAGO (Yape / Plin) ----------------
const PAY = {
  Yape: { color: '#742284', soft: '#F3E6F7' },
  Plin: { color: '#00B2A9', soft: '#E0F6F5' },
};

export function TripSummary({ navigation, route }) {
  const { state, requestTrip, toast, rewardsBudget, setMethod } = useApp();
  const { cargo } = route.params || {};
  const { origin, dest, route: r } = state.draft;
  const [category] = useState(route.params?.category || state.draft.category);
  const [luggage, setLuggage] = useState(false);
  const [noDrivers, setNoDrivers] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponId, setCouponId] = useState(null);
  const [paying, setPaying] = useState(false);
  const [step, setStep] = useState('confirm');
  const cfg = state.config;
  const method = state.passenger.method;
  if (!origin || !dest) return null;
  const cat = catById(category);
  const price = calcPrice(cfg, { category, origin, dest, cargo, luggage, km: r?.km, minutes: r?.minutes });
  const coupons = state.passenger.coupons.filter(couponValid);
  const budget = rewardsBudget();
  const best = [...coupons].sort((a, b) => b.amount - a.amount)[0];
  const coupon = coupons.find((c) => c.id === couponId);
  let discount = couponDiscount(cfg, coupon, price.final);
  const capped = discount > budget;
  if (capped) discount = 0;
  const toPay = round2(price.final - discount);

  const approve = () => {
    setStep('processing');
    setTimeout(() => {
      const res = requestTrip({ category, origin, dest, cargo, luggage, couponId: discount ? couponId : null, forceNoDrivers: noDrivers, route: r, method });
      setPaying(false);
      setStep('confirm');
      if (!res.ok) return toast(res.error, 'error');
      navigation.reset({ index: 1, routes: [{ name: 'PassengerTabs' }, { name: 'TripFlow' }] });
    }, 1400);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.mapBg }}>
      <View style={{ height: 250 }}>
        <Map
          route={r?.coords}
          fit={[origin, dest]}
          fitKey={`sum-${ptKey(origin)}-${ptKey(dest)}`}
          padBottom={50}
          markers={[
            { key: 'o', ...origin, kind: 'origin' },
            { key: 'd', ...dest, kind: 'dest', label: dest.name },
          ]}
        />
        <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0 }}>
          <RoundBtn icon="arrow-back" onPress={() => navigation.goBack()} style={{ margin: 16 }} label="Volver" />
        </SafeAreaView>
      </View>
      <View style={s.summaryPanel}>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 10 }} showsVerticalScrollIndicator={false}>
          <RouteDots origin={origin.name} dest={dest.name} />
          <View style={[s.catRow, { borderColor: cat.color, backgroundColor: cat.soft }]}>
            <CatIcon id={category} size={34} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontWeight: '800', fontSize: 15, color: cat.text }}>{cat.name}</Text>
              <Text style={{ fontSize: 13, color: cat.text }}>{price.km} km por calle · ~{price.minutes} min · {price.zone}</Text>
            </View>
          </View>

          <View style={{ marginTop: 12 }}>
            <PriceCard price={price} discount={discount} toPay={toPay} couponTitle={coupon?.title} method={method} />
          </View>

          <Text style={{ fontWeight: '800', marginTop: 14, marginBottom: 8 }}>Pagar con</Text>
          <Row style={{ marginHorizontal: -4 }}>
            {cfg.paymentMethods.map((m) => {
              const on = method === m;
              return (
                <TouchableOpacity key={m} onPress={() => setMethod(m)} style={[s.payBtn, on && { borderColor: PAY[m].color, backgroundColor: PAY[m].soft }]}>
                  <View style={[s.payLogo, { backgroundColor: PAY[m].color }]}><Text style={{ color: C.white, fontWeight: '800', fontSize: 13 }}>{m}</Text></View>
                  <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? PAY[m].color : C.muted} />
                </TouchableOpacity>
              );
            })}
          </Row>

          {coupons.length ? (
            <TouchableOpacity onPress={() => (coupon ? setCouponOpen(true) : setCouponId(best.id))} style={s.couponBtn}>
              <GiftIcon size={20} color={C.purpleText} />
              <Text style={{ flex: 1, marginLeft: 10, color: C.purpleText, fontWeight: '800', fontSize: 14 }}>
                {capped ? 'Vales pausados hoy (tope de premios)' : coupon ? `${coupon.title} · −${money(discount)}` : `${best.title} disponible · −${money(Math.min(best.amount, cfg.couponMaxValue))}`}
              </Text>
              <Text style={{ color: C.purpleText, fontWeight: '800' }}>{coupon ? 'Cambiar' : 'Usar'}</Text>
            </TouchableOpacity>
          ) : null}

          {category === 'taxi' ? (
            <Row style={{ marginTop: 12, justifyContent: 'space-between' }}>
              <T.p>Llevo equipaje (+{money(cfg.surcharges.luggage)})</T.p>
              <Switch value={luggage} onValueChange={setLuggage} trackColor={{ true: C.gold }} />
            </Row>
          ) : null}

          <View style={[s.infoRow, { marginTop: 12, backgroundColor: C.greenSoft }]}>
            <Ionicons name="lock-closed" size={18} color={C.greenText} />
            <Text style={{ marginLeft: 8, flex: 1, color: C.greenText, fontWeight: '700', fontSize: 13 }}>
              Pagas {money(toPay)} con {method} al pedir. Cusco Drive lo retiene y recién se paga al conductor cuando llegas. Si cancelas antes de que acepten, te lo devolvemos.
            </Text>
          </View>

          <Row style={{ marginTop: 12, justifyContent: 'space-between' }}>
            <T.sub style={{ flex: 1 }}>Demo: simular que nadie acepta (2 min)</T.sub>
            <Switch value={noDrivers} onValueChange={setNoDrivers} />
          </Row>
        </ScrollView>
        <View style={{ paddingHorizontal: 18, paddingBottom: 22, paddingTop: 6 }}>
          <Btn title={`Pagar con ${method} y pedir · ${money(toPay)}`} onPress={() => setPaying(true)} textStyle={{ fontSize: 16 }} />
        </View>
      </View>

      <Modal visible={paying} transparent animationType="slide" onRequestClose={() => setPaying(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(11,26,61,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: C.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden' }}>
            <View style={{ backgroundColor: PAY[method].color, padding: 20, alignItems: 'center' }}>
              <Text style={{ color: C.white, fontFamily: F.price, fontSize: 28 }}>{method}</Text>
              <Text style={{ color: C.white, marginTop: 2 }}>Solicitud de pago</Text>
            </View>
            <View style={{ padding: 22, alignItems: 'center' }}>
              <T.sub>Cusco Drive S.A.C. te cobra</T.sub>
              <Text style={{ fontFamily: F.price, fontSize: 40, color: C.navy }}>{money(toPay)}</Text>
              <T.sub style={{ textAlign: 'center' }}>{cat.name} · {origin.name} → {dest.name}</T.sub>
              {step === 'processing' ? (
                <Row style={{ marginTop: 20 }}><ActivityIndicator color={PAY[method].color} /><Text style={{ marginLeft: 10, fontWeight: '800' }}>Aprobando en {method}…</Text></Row>
              ) : (
                <>
                  <Btn title={`Aprobar pago en ${method}`} onPress={approve} style={{ alignSelf: 'stretch', marginTop: 20, backgroundColor: PAY[method].color, borderColor: PAY[method].color }} textStyle={{ color: C.white }} />
                  <Btn title="Cancelar" variant="ghost" onPress={() => setPaying(false)} style={{ alignSelf: 'stretch', marginTop: 10 }} />
                </>
              )}
              <T.sub style={{ marginTop: 12, fontSize: 11, textAlign: 'center' }}>Demo: simula la aprobación en la app de {method} a través de la pasarela de pagos.</T.sub>
            </View>
          </View>
        </View>
      </Modal>

      <Sheet visible={couponOpen} onClose={() => setCouponOpen(false)} title="Elige un vale">
        <ScrollView>
          <ListItem icon="close-circle" iconColor={C.sub} title="No usar vale" onPress={() => { setCouponId(null); setCouponOpen(false); }} right={!couponId ? <Ionicons name="checkmark" size={20} color={C.green} /> : null} />
          {coupons.map((c) => (
            <ListItem key={c.id} node={<GiftIcon color={C.purple} />} iconBg={C.purpleSoft} title={`${c.title} · ${money(Math.min(c.amount, cfg.couponMaxValue))}`} sub={`Vence el ${new Date(c.expiresAt).toLocaleDateString('es-PE')}`} onPress={() => { setCouponId(c.id); setCouponOpen(false); }} right={couponId === c.id ? <Ionicons name="checkmark" size={20} color={C.green} /> : null} />
          ))}
          <T.sub style={{ marginTop: 8 }}>Un vale por viaje. El conductor igual recibe su tarifa completa.</T.sub>
        </ScrollView>
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  whereBox: { flexDirection: 'row', alignItems: 'center', height: 52, backgroundColor: C.bg, borderRadius: 16, paddingHorizontal: 14, borderWidth: 1.5, borderColor: C.border, marginTop: 10 },
  catBtn: { flex: 1, marginHorizontal: 4, borderWidth: 2, borderColor: C.border, backgroundColor: C.white, borderRadius: 16, paddingVertical: 8, alignItems: 'center' },
  priceTile: { width: 96, marginHorizontal: 4, borderWidth: 2, borderColor: C.border, backgroundColor: C.white, borderRadius: 16, paddingVertical: 8, alignItems: 'center' },
  recent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  recentIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  rewards: { backgroundColor: C.purpleSoft, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginTop: 6 },
  ptsPill: { flexDirection: 'row', alignItems: 'center', height: 44, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.purple, ...shadow },
  hint: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', marginHorizontal: 16, marginTop: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignSelf: 'flex-start', ...shadow },
  activeBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.gold, marginHorizontal: 16, marginTop: 10, padding: 12, borderRadius: 14, ...shadow },
  gpsBtn: { position: 'absolute', right: 16, top: -64, width: 50, height: 50, borderRadius: 25, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', ...shadow },
  warn: { backgroundColor: C.redSoft, borderRadius: 10, padding: 8 },
  routeCard: { backgroundColor: C.bg, borderRadius: 16, paddingHorizontal: 12 },
  routeLine: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  searchBox: { backgroundColor: C.bg, borderRadius: 14, paddingHorizontal: 12 },
  section: { marginTop: 18, marginBottom: 2 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,26,61,0.4)', alignItems: 'center', justifyContent: 'center' },
  sizeBtn: { flex: 1, marginHorizontal: 4, borderWidth: 2, borderColor: C.border, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center' },
  helperBox: { marginTop: 16, borderWidth: 1.5, borderColor: C.border, borderRadius: 16, padding: 12 },
  stepper: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  photoBox: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.line, borderRadius: 14, padding: 14 },
  summaryPanel: { flex: 1, marginTop: -30, backgroundColor: C.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, ...shadow },
  catRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: C.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, marginTop: 14 },
  payBtn: { flex: 1, marginHorizontal: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: C.border, borderRadius: 14, padding: 10 },
  payLogo: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  couponBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.purple, backgroundColor: C.purpleSoft, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 12, padding: 10 },
});
