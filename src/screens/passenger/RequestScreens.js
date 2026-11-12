import React, { useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, shadow, money } from '../../theme';
import { Btn, Card, Row, T, Chip, Progress, Header, PriceCard, ListItem, Badge, Sheet } from '../../components/ui';
import Map, { regionAround } from '../../components/Map';
import { CATEGORIES, PLACES, catById, placeById, URUBAMBA_CENTER, DRIVERS } from '../../data/mock';
import { useApp } from '../../store/AppStore';
import { inServiceArea, couponValid, couponDiscount, calcPrice } from '../../logic/pricing';

const MY_LOCATION = { id: 'me', name: 'Mi ubicación', sub: 'Plaza de Armas, Urubamba', ...placeById('plaza') };
const myLoc = () => ({ ...placeById('plaza'), id: 'me', name: 'Mi ubicación (Plaza de Armas)' });

// ---------------- HOME ----------------
export function PassengerHome({ navigation }) {
  const { state } = useApp();
  const [cat, setCat] = useState('mototaxi');
  const p = state.passenger;
  const cfg = state.config;
  const progress = (p.points % cfg.pointsPerReward) / cfg.pointsPerReward;
  const left = cfg.pointsPerReward - (p.points % cfg.pointsPerReward);
  const nearby = DRIVERS.filter((d) => d.category === cat);

  return (
    <View style={{ flex: 1 }}>
      <Map
        initialRegion={{ ...URUBAMBA_CENTER, latitudeDelta: 0.018, longitudeDelta: 0.018 }}
        showArea
        markers={[
          { key: 'me', ...URUBAMBA_CENTER, color: C.navy },
          ...nearby.map((d) => ({ key: d.id, latitude: d.latitude, longitude: d.longitude, emoji: catById(d.category).emoji, color: C.white })),
        ]}
      />
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <Row style={{ padding: 16, justifyContent: 'space-between' }}>
          <View style={[s.topPill]}>
            <Text style={{ fontWeight: '800', color: C.navy }}>Hola, {p.name.split(' ')[0]} 👋</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Help')} style={[s.sos]}>
            <Text style={{ color: C.white, fontWeight: '900' }}>SOS</Text>
          </TouchableOpacity>
        </Row>
        {state.trip ? (
          <TouchableOpacity onPress={() => navigation.navigate('TripFlow')} style={[s.activeBanner]}>
            <Ionicons name="navigate-circle" size={22} color={C.navy} />
            <Text style={{ marginLeft: 8, fontWeight: '800', color: C.navy, flex: 1 }}>{state.trip.status === 'finished' ? 'Tu viaje terminó · Paga y califica' : 'Tienes un viaje activo · Ver'}</Text>
            <Ionicons name="chevron-forward" size={18} color={C.navy} />
          </TouchableOpacity>
        ) : null}
      </SafeAreaView>

      <View style={s.sheet}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
          {CATEGORIES.map((c) => (
            <Chip key={c.id} emoji={c.emoji} label={c.name} active={cat === c.id} color={c.color} onPress={() => setCat(c.id)} />
          ))}
        </ScrollView>
        <TouchableOpacity activeOpacity={0.85} style={s.whereBox} onPress={() => navigation.navigate('SearchDestination', { category: cat })}>
          <Ionicons name="search" size={22} color={C.navy} />
          <Text style={{ fontSize: 19, fontWeight: '800', color: C.navy, marginLeft: 10, flex: 1 }}>¿A dónde vas?</Text>
          <Text style={{ fontSize: 22 }}>{catById(cat).emoji}</Text>
        </TouchableOpacity>
        <Row style={{ marginTop: 12 }}>
          {p.saved.map((sv) => (
            <TouchableOpacity
              key={sv.label}
              onPress={() => goToDest(navigation, cat, placeById(sv.placeId))}
              style={s.shortcut}
            >
              <Ionicons name={sv.icon} size={16} color={C.navy} />
              <Text style={{ marginLeft: 6, fontWeight: '700', color: C.navy }}>{sv.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => goToDest(navigation, cat, placeById('mercado'))} style={s.shortcut}>
            <Ionicons name="basket" size={16} color={C.navy} />
            <Text style={{ marginLeft: 6, fontWeight: '700', color: C.navy }}>Mercado</Text>
          </TouchableOpacity>
        </Row>
        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Rewards')} style={s.rewards}>
          <Text style={{ fontSize: 30 }}>🦙</Text>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ color: C.purple, fontWeight: '800' }}>{p.points} puntos · faltan {left} viajes para S/ {cfg.pointsRewardAmount.toFixed(2)}</Text>
            <Progress value={progress} style={{ marginTop: 6 }} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function goToDest(navigation, category, dest, origin) {
  const o = origin || myLoc();
  if (catById(category).cargo) navigation.navigate('CargoForm', { category, dest, origin: o });
  else navigation.navigate('TripSummary', { category, dest, origin: o });
}

// ---------------- BUSCAR DESTINO ----------------
export function SearchDestination({ navigation, route }) {
  const { state } = useApp();
  const category = route.params?.category || 'mototaxi';
  const [q, setQ] = useState('');
  const [origin, setOrigin] = useState(route.params?.origin || myLoc());
  const [editing, setEditing] = useState('dest');
  const list = PLACES.filter((p) => (p.name + ' ' + p.sub).toLowerCase().includes(q.toLowerCase()));
  const recent = state.passenger.recent.map(placeById).filter(Boolean);

  const pick = (place) => {
    if (editing === 'origin') {
      if (!inServiceArea(place)) return Alert.alert('Sin cobertura', 'El recojo debe estar dentro de Urubamba.');
      setOrigin(place);
      setEditing('dest');
      setQ('');
      return;
    }
    goToDest(navigation, category, place, origin);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.white }}>
      <Header title={`${catById(category).emoji} ${catById(category).name}`} onBack={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: 16 }}>
        <View style={s.routeBox}>
          <TouchableOpacity onPress={() => setEditing('origin')} style={[s.routeRow, editing === 'origin' && s.routeActive]}>
            <View style={[s.dot, { backgroundColor: C.green }]} />
            <Text style={{ flex: 1, marginLeft: 10, color: C.text, fontWeight: '600' }} numberOfLines={1}>{origin.name}</Text>
            <Text style={{ color: C.navy2, fontWeight: '700', fontSize: 12 }}>Cambiar</Text>
          </TouchableOpacity>
          <View style={{ height: 1, backgroundColor: C.border, marginLeft: 30 }} />
          <View style={[s.routeRow, editing === 'dest' && s.routeActive]}>
            <View style={[s.dot, { backgroundColor: C.gold }]} />
            <TextInput
              value={q}
              onChangeText={setQ}
              onFocus={() => setEditing('dest')}
              placeholder={editing === 'origin' ? 'Busca el punto de recojo' : '¿A dónde vas?'}
              placeholderTextColor={C.muted}
              style={{ flex: 1, marginLeft: 10, fontSize: 16, color: C.text, paddingVertical: 4 }}
              autoFocus
            />
          </View>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <ListItem icon="map" iconColor={C.navy} title="Marcar en el mapa" sub="Mueve el mapa y elige el punto exacto" onPress={() => navigation.navigate('PickOnMap', { category, origin, mode: editing })} />
        {!q && recent.length ? (
          <>
            <T.sub style={s.section}>RECIENTES</T.sub>
            {recent.map((p) => (
              <ListItem key={'r' + p.id} icon="time" iconColor={C.sub} title={p.name} sub={p.sub} onPress={() => pick(p)} />
            ))}
          </>
        ) : null}
        <T.sub style={s.section}>{q ? 'RESULTADOS' : 'LUGARES FRECUENTES EN URUBAMBA'}</T.sub>
        {list.map((p) => {
          const ok = inServiceArea(p);
          return (
            <ListItem
              key={p.id}
              icon={p.icon}
              iconColor={ok ? C.navy : C.muted}
              title={p.name}
              sub={p.sub}
              onPress={() => pick(p)}
              right={!ok ? <Badge text="Sin cobertura" color={C.red} /> : undefined}
            />
          );
        })}
        {!list.length ? <T.sub style={{ textAlign: 'center', marginTop: 20 }}>No encontramos “{q}”. Prueba marcarlo en el mapa.</T.sub> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------- MARCAR EN MAPA ----------------
export function PickOnMap({ navigation, route }) {
  const { category, origin, mode } = route.params;
  const [center, setCenter] = useState({ latitude: URUBAMBA_CENTER.latitude - 0.003, longitude: URUBAMBA_CENTER.longitude + 0.002 });
  const ok = inServiceArea(center);
  const confirm = () => {
    const place = { id: 'pin' + Date.now(), name: 'Punto en el mapa', sub: `${center.latitude.toFixed(4)}, ${center.longitude.toFixed(4)}`, ...center };
    if (mode === 'origin') navigation.replace('SearchDestination', { category, origin: { ...place, name: 'Recojo marcado en mapa' } });
    else goToDest(navigation, category, place, origin);
  };
  return (
    <View style={{ flex: 1 }}>
      <Map initialRegion={{ ...center, latitudeDelta: 0.012, longitudeDelta: 0.012 }} showArea onRegionChangeComplete={(r) => setCenter({ latitude: r.latitude, longitude: r.longitude })} />
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="location" size={48} color={mode === 'origin' ? C.green : C.gold} style={{ marginBottom: 46 }} />
      </View>
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
        <Row style={{ padding: 12 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.roundBtn}>
            <Ionicons name="arrow-back" size={22} color={C.navy} />
          </TouchableOpacity>
          <View style={[s.topPill, { marginLeft: 10, flex: 1 }]}>
            <Text style={{ fontWeight: '700', color: C.navy }}>Mueve el mapa para ubicar el {mode === 'origin' ? 'recojo' : 'destino'}</Text>
          </View>
        </Row>
      </SafeAreaView>
      <View style={[s.sheet, { paddingBottom: 30 }]}>
        {!ok ? <Text style={{ color: C.red, fontWeight: '700', marginBottom: 10 }}>⚠️ Ese punto está fuera de nuestra zona de servicio (Urubamba).</Text> : null}
        <Btn title="Confirmar punto" disabled={!ok} onPress={confirm} />
      </View>
    </View>
  );
}

// ---------------- FORMULARIO DE CARGA ----------------
export function CargoForm({ navigation, route }) {
  const { state, toast } = useApp();
  const { category, dest, origin } = route.params;
  const sizes = Object.keys(state.config.cargoSizes[category]);
  const [desc, setDesc] = useState('');
  const [size, setSize] = useState(sizes[0]);
  const [helpers, setHelpers] = useState(0);
  const [photo, setPhoto] = useState(false);
  const [special, setSpecial] = useState(false);
  const [quoteSent, setQuoteSent] = useState(false);
  const cargo = { desc, size, helpers, photo };
  const price = calcPrice(state.config, { category, origin, dest, cargo });

  const next = () => {
    if (desc.trim().length < 3) return toast('Describe brevemente tu carga', 'warn');
    if (special) {
      setQuoteSent(true);
      return;
    }
    navigation.navigate('TripSummary', { category, dest, origin, cargo });
  };

  if (quoteSent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.white, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 80 }}>📋</Text>
        <T.h1 style={{ textAlign: 'center', marginTop: 10 }}>Cotización solicitada</T.h1>
        <T.p style={{ textAlign: 'center', color: C.sub, marginTop: 10 }}>
          Un asesor de Cusco Drive revisará tu mudanza especial y te llamará al celular registrado en menos de 30 minutos con un precio fijo.
        </T.p>
        <Card style={{ alignSelf: 'stretch', marginTop: 20 }}>
          <T.sub>Referencia estándar (sin cotizar)</T.sub>
          <T.h2>{money(price.final)}</T.h2>
          <T.sub>{origin.name} → {dest.name}</T.sub>
        </Card>
        <Btn title="Volver al inicio" style={{ alignSelf: 'stretch', marginTop: 20 }} onPress={() => navigation.popToTop()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title={`${catById(category).emoji} Datos de la carga`} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <T.h3>¿Qué vas a transportar?</T.h3>
        <TextInput
          value={desc}
          onChangeText={setDesc}
          placeholder={category === 'mudanza' ? 'Ej. cama, ropero, refrigeradora y 10 cajas' : 'Ej. 3 sacos de papa y verduras'}
          placeholderTextColor={C.muted}
          multiline
          style={s.input}
        />
        <T.h3 style={{ marginTop: 18 }}>Tamaño de la carga</T.h3>
        <Row style={{ marginTop: 8, flexWrap: 'wrap' }}>
          {sizes.map((z) => (
            <Chip key={z} label={`${z[0].toUpperCase() + z.slice(1)}${state.config.cargoSizes[category][z] ? ` +S/${state.config.cargoSizes[category][z]}` : ''}`} active={size === z} onPress={() => setSize(z)} color={catById(category).color} style={{ marginBottom: 8 }} />
          ))}
        </Row>
        {category === 'mudanza' ? (
          <>
            <T.h3 style={{ marginTop: 14 }}>Ayudantes (S/ {state.config.helperPrice} c/u)</T.h3>
            <Row style={{ marginTop: 8 }}>
              <TouchableOpacity onPress={() => setHelpers(Math.max(0, helpers - 1))} style={s.stepper}><Ionicons name="remove" size={22} color={C.navy} /></TouchableOpacity>
              <Text style={{ fontSize: 24, fontWeight: '800', marginHorizontal: 22, color: C.navy }}>{helpers}</Text>
              <TouchableOpacity onPress={() => setHelpers(Math.min(4, helpers + 1))} style={s.stepper}><Ionicons name="add" size={22} color={C.navy} /></TouchableOpacity>
            </Row>
          </>
        ) : null}
        <T.h3 style={{ marginTop: 18 }}>Foto de la carga (opcional)</T.h3>
        <TouchableOpacity onPress={() => setPhoto(!photo)} style={[s.photoBox, photo && { borderColor: C.green, backgroundColor: C.greenSoft }]}>
          <Ionicons name={photo ? 'checkmark-circle' : 'camera'} size={30} color={photo ? C.green : C.sub} />
          <Text style={{ marginTop: 6, color: photo ? C.green : C.sub, fontWeight: '700' }}>{photo ? 'Foto agregada (demo)' : 'Tomar o subir foto'}</Text>
        </TouchableOpacity>
        {category === 'mudanza' ? (
          <Row style={{ marginTop: 18, justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <T.h3>Mudanza especial</T.h3>
              <T.sub>Pianos, muchos pisos o carga fuera de lo común: te cotizamos.</T.sub>
            </View>
            <Switch value={special} onValueChange={setSpecial} trackColor={{ true: C.purple }} />
          </Row>
        ) : null}
        <Card style={{ marginTop: 20 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T.sub>{special ? 'Precio referencial' : 'Precio fijo estimado'}</T.sub>
            <Text style={{ fontSize: 24, fontWeight: '900', color: C.navy }}>{money(price.final)}</Text>
          </Row>
        </Card>
        <Btn title={special ? 'Solicitar cotización' : 'Continuar'} onPress={next} style={{ marginTop: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------- RESUMEN DEL VIAJE ----------------
export function TripSummary({ navigation, route }) {
  const { state, requestTrip, toast, rewardsBudget } = useApp();
  const { dest, origin, cargo } = route.params;
  const [category, setCategory] = useState(route.params.category);
  const [luggage, setLuggage] = useState(false);
  const [noDrivers, setNoDrivers] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const cfg = state.config;
  const destOk = inServiceArea(dest);

  const price = calcPrice(cfg, { category, origin, dest, cargo, luggage });
  const coupons = state.passenger.coupons.filter(couponValid);
  const budget = rewardsBudget();
  const best = [...coupons].sort((a, b) => b.amount - a.amount)[0];
  const [couponId, setCouponId] = useState(best?.id || null);
  const coupon = coupons.find((c) => c.id === couponId);
  let discount = couponDiscount(cfg, coupon, price.final);
  const capped = discount > budget;
  if (capped) discount = 0;
  const toPay = Math.round((price.final - discount) * 10) / 10;

  const available = CATEGORIES.filter((c) => !!c.cargo === !!catById(route.params.category).cargo);

  const order = () => {
    const r = requestTrip({ category, origin, dest, cargo, luggage, couponId: discount ? couponId : null, forceNoDrivers: noDrivers });
    if (!r.ok) return toast(r.error, 'error');
    navigation.reset({ index: 1, routes: [{ name: 'PassengerTabs' }, { name: 'TripFlow' }] });
  };

  if (!destOk) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.white }}>
        <Header title="Sin cobertura" onBack={() => navigation.goBack()} />
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: 80 }}>🗺️</Text>
          <T.h1 style={{ textAlign: 'center', marginTop: 10 }}>Aún no llegamos a {dest.name}</T.h1>
          <T.p style={{ textAlign: 'center', color: C.sub, marginTop: 10 }}>
            Por ahora Cusco Drive opera solo dentro de Urubamba. Pronto llegaremos al resto del Valle Sagrado y a Cusco ciudad.
          </T.p>
          <Btn title="Elegir otro destino" onPress={() => navigation.goBack()} style={{ alignSelf: 'stretch', marginTop: 24 }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ height: 230 }}>
        <Map
          initialRegion={regionAround([origin, dest], 1.9)}
          route={[origin, dest]}
          markers={[
            { key: 'o', latitude: origin.latitude, longitude: origin.longitude, color: C.green },
            { key: 'd', latitude: dest.latitude, longitude: dest.longitude, color: C.gold, label: dest.name },
          ]}
        />
        <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[s.roundBtn, { margin: 12 }]}>
            <Ionicons name="arrow-back" size={22} color={C.navy} />
          </TouchableOpacity>
        </SafeAreaView>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
        <Card style={{ paddingVertical: 10 }}>
          <Row><View style={[s.dot, { backgroundColor: C.green }]} /><T.p style={{ marginLeft: 10, flex: 1 }} numberOfLines={1}>{origin.name}</T.p></Row>
          <View style={{ width: 2, height: 14, backgroundColor: C.border, marginLeft: 5 }} />
          <Row><View style={[s.dot, { backgroundColor: C.gold }]} /><T.p style={{ marginLeft: 10, flex: 1, fontWeight: '700' }} numberOfLines={1}>{dest.name}</T.p></Row>
        </Card>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 14 }}>
          {available.map((c) => {
            const p = calcPrice(cfg, { category: c.id, origin, dest, cargo, luggage });
            const act = c.id === category;
            return (
              <TouchableOpacity key={c.id} onPress={() => setCategory(c.id)} style={[s.catCard, act && { borderColor: c.color, backgroundColor: c.color + '14' }]}>
                <Text style={{ fontSize: 30 }}>{c.emoji}</Text>
                <Text style={{ fontWeight: '800', color: C.navy, marginTop: 4 }}>{c.name}</Text>
                <Text style={{ fontWeight: '900', color: act ? C.navy : C.sub, fontSize: 16 }}>{money(p.final)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <PriceCard price={price} discount={discount} toPay={toPay} couponTitle={coupon?.title} categoryName={catById(category).name} />

        {cargo ? (
          <Card style={{ marginTop: 12 }}>
            <T.sub>Carga</T.sub>
            <T.p style={{ fontWeight: '700' }}>{cargo.desc}</T.p>
            <T.sub>Tamaño {cargo.size}{cargo.helpers ? ` · ${cargo.helpers} ayudante(s)` : ''}{cargo.photo ? ' · con foto' : ''}</T.sub>
          </Card>
        ) : null}

        <Card style={{ marginTop: 12, paddingVertical: 4 }}>
          <ListItem
            icon="pricetag"
            iconColor={C.purple}
            title={coupon && discount ? coupon.title : 'Sin cupón'}
            sub={capped ? 'Cupones pausados hoy (tope de premios alcanzado)' : coupon && discount ? `Ahorras ${money(discount)}` : `${coupons.length} cupón(es) disponible(s)`}
            onPress={() => setCouponOpen(true)}
          />
          <View style={{ height: 1, backgroundColor: C.border }} />
          <ListItem icon="cash" iconColor={C.green} title="Efectivo" sub="Pagas al conductor al terminar el viaje" right={<Ionicons name="checkmark-circle" size={22} color={C.green} />} />
          {category === 'taxi' ? (
            <>
              <View style={{ height: 1, backgroundColor: C.border }} />
              <ListItem icon="briefcase" title="Llevo equipaje" sub={`+ ${money(cfg.surcharges.luggage)}`} right={<Switch value={luggage} onValueChange={setLuggage} trackColor={{ true: C.gold }} />} />
            </>
          ) : null}
        </Card>

        <Row style={{ marginTop: 14, justifyContent: 'space-between', paddingHorizontal: 4 }}>
          <T.sub style={{ flex: 1 }}>🧪 Demo: simular que no hay conductores</T.sub>
          <Switch value={noDrivers} onValueChange={setNoDrivers} />
        </Row>

        <Btn title={`Pedir ahora · ${money(toPay)}`} onPress={order} style={{ marginTop: 14 }} icon="flash" />
        <T.sub style={{ textAlign: 'center', marginTop: 8 }}>El precio no cambia durante el viaje.</T.sub>
      </ScrollView>

      <Sheet visible={couponOpen} onClose={() => setCouponOpen(false)} title="Elige un cupón">
        <ScrollView>
          <ListItem icon="close-circle" iconColor={C.sub} title="No usar cupón" onPress={() => { setCouponId(null); setCouponOpen(false); }} right={!couponId ? <Ionicons name="checkmark" size={20} color={C.green} /> : null} />
          {coupons.map((c) => (
            <ListItem
              key={c.id}
              emoji="🎟️"
              iconColor={C.purple}
              title={`${c.title} · ${money(Math.min(c.amount, cfg.couponMaxValue))}`}
              sub={`Vence el ${new Date(c.expiresAt).toLocaleDateString('es-PE')}`}
              onPress={() => { setCouponId(c.id); setCouponOpen(false); }}
              right={couponId === c.id ? <Ionicons name="checkmark" size={20} color={C.green} /> : null}
            />
          ))}
          <T.sub style={{ marginTop: 8 }}>Un cupón por viaje. Solo se consume si el viaje se completa.</T.sub>
        </ScrollView>
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 16, paddingBottom: 20, ...shadow },
  whereBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.goldSoft, borderRadius: 16, padding: 16, borderWidth: 2, borderColor: C.gold },
  shortcut: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  rewards: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.purpleSoft, borderRadius: 16, padding: 12, marginTop: 14 },
  topPill: { backgroundColor: C.white, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24, ...shadow },
  sos: { backgroundColor: C.red, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', ...shadow },
  activeBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.gold, marginHorizontal: 16, padding: 12, borderRadius: 14, ...shadow },
  routeBox: { backgroundColor: C.bg, borderRadius: 16, paddingHorizontal: 12 },
  routeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  routeActive: {},
  dot: { width: 12, height: 12, borderRadius: 6 },
  section: { marginTop: 18, marginBottom: 4, fontWeight: '800', letterSpacing: 0.5 },
  roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', ...shadow },
  input: { backgroundColor: C.white, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, padding: 14, fontSize: 16, minHeight: 80, textAlignVertical: 'top', marginTop: 8, color: C.text },
  photoBox: { marginTop: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: C.border, borderRadius: 16, padding: 20, alignItems: 'center', backgroundColor: C.white },
  stepper: { width: 46, height: 46, borderRadius: 14, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  catCard: { width: 110, padding: 12, borderRadius: 16, backgroundColor: C.white, borderWidth: 2, borderColor: C.border, marginRight: 10, alignItems: 'center' },
});
