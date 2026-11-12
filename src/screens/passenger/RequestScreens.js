import React, { useState } from 'react';
import { View, TouchableOpacity, ScrollView, Switch, StyleSheet, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, F, shadow, money } from '../../theme';
import {
  Btn, Card, Row, T, Text, Progress, Header, PriceCard, ListItem, Badge, Sheet, BottomPanel, CatIcon, GiftIcon,
  RouteDots, RoundBtn, WalletPill, Input,
} from '../../components/ui';
import Map, { regionAround } from '../../components/Map';
import { CATEGORIES, PLACES, catById, placeById, URUBAMBA_CENTER, DRIVERS } from '../../data/mock';
import { useApp } from '../../store/AppStore';
import { inServiceArea, couponValid, couponDiscount, calcPrice, round2 } from '../../logic/pricing';

const myLoc = () => ({ ...placeById('plaza'), id: 'me', name: 'Mi ubicación (Plaza de Armas)' });

// ---------------- P1 · HOME / MAPA ----------------
export function PassengerHome({ navigation }) {
  const { state, wallets } = useApp();
  const [cat, setCat] = useState('mototaxi');
  const p = state.passenger;
  const cfg = state.config;
  const inCycle = p.points % cfg.pointsPerReward;
  const left = cfg.pointsPerReward - inCycle;
  const nearby = DRIVERS.filter((d) => d.category === cat);
  const recent = p.recent.map(placeById).filter(Boolean).slice(0, 2);
  const trip = state.trip;

  return (
    <View style={{ flex: 1, backgroundColor: C.mapBg }}>
      <Map
        initialRegion={{ ...URUBAMBA_CENTER, latitude: URUBAMBA_CENTER.latitude - 0.004, latitudeDelta: 0.022, longitudeDelta: 0.018 }}
        markers={[
          { key: 'me', ...URUBAMBA_CENTER, kind: 'me' },
          ...nearby.map((d) => ({ key: d.id, latitude: d.latitude, longitude: d.longitude, kind: 'vehicle', category: d.category })),
        ]}
      />
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }} pointerEvents="box-none">
        <Row style={{ paddingHorizontal: 16, paddingTop: 12, justifyContent: 'space-between' }}>
          <RoundBtn icon="menu" label="Menú" onPress={() => navigation.navigate('Profile')} />
          <Row>
            <TouchableOpacity onPress={() => navigation.navigate('Rewards')} style={s.ptsPill}>
              <GiftIcon size={18} />
              <Text style={{ color: C.white, fontWeight: '800', fontSize: 14, marginLeft: 8 }}>{p.points} pts</Text>
            </TouchableOpacity>
            <WalletPill balance={wallets.pasajero} low={cfg.rechargeAmounts[0] / 2} onPress={() => navigation.navigate('PWallet')} label="Billetera" style={{ marginLeft: 8 }} />
          </Row>
        </Row>
        {trip ? (
          <TouchableOpacity onPress={() => navigation.navigate('TripFlow')} style={s.activeBanner}>
            <Ionicons name="navigate-circle" size={22} color={C.navy} />
            <Text style={{ marginLeft: 8, fontWeight: '800', color: C.navy, flex: 1 }}>
              {trip.status === 'atDestination' ? 'Llegaste · confirma para liberar el pago' : trip.status === 'finished' ? 'Viaje terminado · califica' : 'Tienes un viaje activo · Ver'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={C.navy} />
          </TouchableOpacity>
        ) : null}
      </SafeAreaView>

      <BottomPanel style={{ paddingBottom: 14 }}>
        <Text style={{ fontFamily: F.title, fontSize: 22, color: C.navy }}>Hola, {p.name.split(' ')[0]}</Text>
        <TouchableOpacity activeOpacity={0.85} style={s.whereBox} onPress={() => navigation.navigate('SearchDestination', { category: cat })}>
          <Ionicons name="search" size={22} color={C.navy} />
          <Text style={{ fontSize: 17, fontWeight: '700', color: C.sub, marginLeft: 10, flex: 1 }}>¿A dónde vas?</Text>
        </TouchableOpacity>
        <Row style={{ marginTop: 12, marginHorizontal: -4 }}>
          {CATEGORIES.map((c) => {
            const on = cat === c.id;
            return (
              <TouchableOpacity key={c.id} onPress={() => setCat(c.id)} style={[s.catBtn, on && { borderColor: c.color, backgroundColor: c.soft }]}>
                <CatIcon id={c.id} size={30} />
                <Text style={{ fontWeight: '800', fontSize: 12, color: c.text, marginTop: 2 }}>{c.name}</Text>
              </TouchableOpacity>
            );
          })}
        </Row>
        <View style={{ marginTop: 6 }}>
          {recent.map((pl, i) => (
            <TouchableOpacity key={pl.id} onPress={() => goToDest(navigation, cat, pl)} style={[s.recent, i === 0 && recent.length > 1 && { borderBottomWidth: 1, borderBottomColor: C.mapBg }]}>
              <View style={s.recentIcon}><Ionicons name="time-outline" size={18} color={C.sub} /></View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontWeight: '800', fontSize: 15 }}>{pl.name}</Text>
                <T.sub>{pl.sub}</T.sub>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Rewards')} style={s.rewards}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: C.purpleText }}>
            Te faltan {left} viajes para {money(cfg.pointsRewardAmount)} de descuento
          </Text>
          <Progress value={inCycle / cfg.pointsPerReward} style={{ marginTop: 7 }} height={7} />
        </TouchableOpacity>
      </BottomPanel>
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
  const { state, changeDestination, toast } = useApp();
  const category = route.params?.category || 'mototaxi';
  const changeMode = route.params?.mode === 'change';
  const [q, setQ] = useState('');
  const [origin, setOrigin] = useState(route.params?.origin || myLoc());
  const [editing, setEditing] = useState('dest');
  const list = PLACES.filter((p) => (p.name + ' ' + p.sub).toLowerCase().includes(q.toLowerCase()));
  const recent = state.passenger.recent.map(placeById).filter(Boolean);

  const pick = (place) => {
    if (changeMode) {
      const r = changeDestination(place);
      if (!r.ok) {
        if (r.missing) {
          toast(r.error, 'error');
          navigation.replace('Recharge', { suggest: r.missing });
          return;
        }
        return toast(r.error || 'No se pudo cambiar el destino', 'error');
      }
      toast(r.diff > 0 ? `Destino cambiado. Retuvimos ${money(r.diff)} más.` : r.diff < 0 ? `Destino cambiado. Te devolvimos ${money(-r.diff)}.` : 'Destino cambiado. Mismo precio.', 'success');
      navigation.goBack();
      return;
    }
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
      <Header title={changeMode ? 'Cambiar destino' : catById(category).name} onBack={() => navigation.goBack()} />
      <View style={{ paddingHorizontal: 16 }}>
        <View style={s.routeBox}>
          {!changeMode ? (
            <>
              <TouchableOpacity onPress={() => setEditing('origin')} style={s.routeRow}>
                <View style={[s.dot, { backgroundColor: C.navy }]} />
                <Text style={{ flex: 1, marginLeft: 10, fontWeight: editing === 'origin' ? '800' : '600' }} numberOfLines={1}>{origin.name}</Text>
                <Text style={{ color: C.navy2, fontWeight: '800', fontSize: 13 }}>Cambiar</Text>
              </TouchableOpacity>
              <View style={{ height: 1, backgroundColor: C.border, marginLeft: 22 }} />
            </>
          ) : null}
          <View style={s.routeRow}>
            <View style={[s.dot, { backgroundColor: C.gold, borderRadius: 2 }]} />
            <TextInput
              value={q}
              onChangeText={setQ}
              onFocus={() => setEditing(changeMode ? 'dest' : editing)}
              placeholder={editing === 'origin' ? 'Busca el punto de recojo' : '¿A dónde vas?'}
              placeholderTextColor={C.muted}
              style={{ flex: 1, marginLeft: 10, fontSize: 16, color: C.text, paddingVertical: 4, fontFamily: F.bold }}
              autoFocus
            />
          </View>
        </View>
        {changeMode ? <T.sub style={{ marginTop: 8 }}>El precio se recalcula con el tarifario. Si sube, retenemos la diferencia de tu billetera; si baja, te la devolvemos.</T.sub> : null}
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        {!changeMode ? (
          <ListItem icon="map" iconColor={C.navy} title="Marcar en el mapa" sub="Toca el mapa y elige el punto exacto" onPress={() => navigation.navigate('PickOnMap', { category, origin, mode: editing })} />
        ) : null}
        {!q && recent.length ? (
          <>
            <T.label style={s.section}>RECIENTES</T.label>
            {recent.map((p) => (
              <ListItem key={'r' + p.id} icon="time-outline" iconColor={C.sub} iconBg={C.bg} title={p.name} sub={p.sub} onPress={() => pick(p)} />
            ))}
          </>
        ) : null}
        <T.label style={s.section}>{q ? 'RESULTADOS' : 'LUGARES FRECUENTES EN URUBAMBA'}</T.label>
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
              right={!ok ? <Badge text="Sin cobertura" tone="red" /> : undefined}
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
        <Ionicons name="location" size={48} color={mode === 'origin' ? C.navy : C.gold} style={{ marginBottom: 46 }} />
      </View>
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }} pointerEvents="box-none">
        <Row style={{ padding: 12 }}>
          <RoundBtn icon="arrow-back" onPress={() => navigation.goBack()} label="Volver" />
          <View style={[s.topPill, { marginLeft: 10, flex: 1 }]}>
            <Text style={{ fontWeight: '700', color: C.navy }}>Mueve o toca el mapa para ubicar el {mode === 'origin' ? 'recojo' : 'destino'}</Text>
          </View>
        </Row>
      </SafeAreaView>
      <BottomPanel style={{ paddingBottom: 24 }}>
        {!ok ? <Text style={{ color: C.red, fontWeight: '800', marginBottom: 10 }}>Ese punto está fuera de nuestra zona de servicio (Urubamba).</Text> : null}
        <Btn title="Confirmar punto" disabled={!ok} onPress={confirm} />
      </BottomPanel>
    </View>
  );
}

// ---------------- P3 · FORMULARIO DE CARGA ----------------
const SIZE_HINT = { chico: 'Bolsas y cajas', mediano: 'Sacos del mercado', grande: 'Carga voluminosa', pequeña: 'Pocas cajas', mediana: '1 habitación', grande_m: 'Casa completa' };

export function CargoForm({ navigation, route }) {
  const { state, toast } = useApp();
  const { category, dest, origin } = route.params;
  const cat = catById(category);
  const sizes = Object.keys(state.config.cargoSizes[category]);
  const [desc, setDesc] = useState('');
  const [size, setSize] = useState(sizes[Math.min(1, sizes.length - 1)]);
  const [helpers, setHelpers] = useState(category === 'mudanza' ? 1 : 0);
  const [photo, setPhoto] = useState(false);
  const [special, setSpecial] = useState(false);
  const [quoteSent, setQuoteSent] = useState(false);
  const cargo = { desc, size, helpers, photo };
  const price = calcPrice(state.config, { category, origin, dest, cargo });

  const next = () => {
    if (desc.trim().length < 3) return toast('Describe brevemente tu carga', 'warn');
    if (special) return setQuoteSent(true);
    navigation.navigate('TripSummary', { category, dest, origin, cargo });
  };

  if (quoteSent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.white, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 72 }}>📋</Text>
        <T.h1 style={{ textAlign: 'center', marginTop: 10 }}>Cotización solicitada</T.h1>
        <T.p style={{ textAlign: 'center', color: C.sub, marginTop: 10 }}>
          Un asesor de Cusco Drive revisará tu mudanza especial y te enviará un precio fijo en menos de 30 minutos. No se descuenta nada de tu billetera hasta que lo aceptes.
        </T.p>
        <Card flat style={{ alignSelf: 'stretch', marginTop: 20 }}>
          <T.sub>Referencia estándar (sin cotizar)</T.sub>
          <Text style={{ fontFamily: F.price, fontSize: 26, color: C.navy }}>{money(price.final)}</Text>
          <T.sub>{origin.name} → {dest.name}</T.sub>
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
          <Text style={{ color: cat.text, fontWeight: '800', fontSize: 13, marginLeft: 6 }}>{category === 'mudanza' ? 'Camioneta' : 'Motocarga'}</Text>
        </Row>
      </Row>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontWeight: '800', fontSize: 15, marginBottom: 8 }}>¿Qué vas a trasladar?</Text>
        <Input
          value={desc}
          onChangeText={setDesc}
          placeholder={category === 'mudanza' ? 'Cama, ropero y 6 cajas' : 'Ej. 3 sacos de papa y verduras'}
          multiline
          style={{ minHeight: 70, textAlignVertical: 'top' }}
        />
        <Text style={{ fontWeight: '800', fontSize: 15, marginTop: 18, marginBottom: 8 }}>Tamaño de la carga</Text>
        <Row style={{ marginHorizontal: -4 }}>
          {sizes.map((z, i) => {
            const on = size === z;
            const add = state.config.cargoSizes[category][z];
            const hint = category === 'mudanza' ? ['Pocas cajas', '1 habitación', 'Casa completa'][i] : SIZE_HINT[z];
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
          <Row style={[s.helperBox]}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800', fontSize: 15 }}>Ayudantes</Text>
              <T.sub>Para cargar y descargar · {money(state.config.helperPrice)} c/u</T.sub>
            </View>
            <TouchableOpacity onPress={() => setHelpers(Math.max(0, helpers - 1))} style={s.stepper} accessibilityLabel="Quitar ayudante"><Text style={{ fontSize: 22, fontWeight: '800', color: C.navy }}>−</Text></TouchableOpacity>
            <Text style={{ fontFamily: F.title, fontSize: 20, marginHorizontal: 16, color: C.navy }}>{helpers}</Text>
            <TouchableOpacity onPress={() => setHelpers(Math.min(4, helpers + 1))} style={s.stepper} accessibilityLabel="Agregar ayudante"><Text style={{ fontSize: 22, fontWeight: '800', color: C.navy }}>+</Text></TouchableOpacity>
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
        <Row style={{ marginTop: 14, backgroundColor: C.bg, borderRadius: 12, padding: 10, alignItems: 'flex-start' }}>
          <Ionicons name="information-circle" size={18} color={C.sub} />
          <T.sub style={{ marginLeft: 6, flex: 1 }}>Precio por tamaño + distancia. Si tu carga es especial, te enviamos una cotización antes de confirmar.</T.sub>
        </Row>
      </ScrollView>
      <View style={{ padding: 18, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.mapBg }}>
        <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <T.sub>{special ? 'Precio referencial' : `Precio fijo · ${size}${helpers ? ` + ${helpers} ayudante${helpers > 1 ? 's' : ''}` : ''}`}</T.sub>
          <Text style={{ fontFamily: F.price, fontSize: 26, color: C.navy }}>{money(price.final)}</Text>
        </Row>
        <Btn title={special ? 'Solicitar cotización' : category === 'mudanza' ? 'Pedir camioneta' : 'Continuar'} onPress={next} />
      </View>
    </SafeAreaView>
  );
}

// ---------------- P2 · RESUMEN Y PRECIO FIJO ----------------
export function TripSummary({ navigation, route }) {
  const { state, wallets, requestTrip, toast, rewardsBudget } = useApp();
  const { dest, origin, cargo } = route.params;
  const [category, setCategory] = useState(route.params.category);
  const [luggage, setLuggage] = useState(false);
  const [noDrivers, setNoDrivers] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const cfg = state.config;
  const destOk = inServiceArea(dest);
  const cat = catById(category);

  const price = calcPrice(cfg, { category, origin, dest, cargo, luggage });
  const coupons = state.passenger.coupons.filter(couponValid);
  const budget = rewardsBudget();
  const best = [...coupons].sort((a, b) => b.amount - a.amount)[0];
  const [couponId, setCouponId] = useState(null);
  const coupon = coupons.find((c) => c.id === couponId);
  let discount = couponDiscount(cfg, coupon, price.final);
  const capped = discount > budget;
  if (capped) discount = 0;
  const toPay = round2(price.final - discount);
  const balance = wallets.pasajero;
  const missing = round2(toPay - balance);

  const available = CATEGORIES.filter((c) => !!c.cargo === !!catById(route.params.category).cargo);

  const order = () => {
    const r = requestTrip({ category, origin, dest, cargo, luggage, couponId: discount ? couponId : null, forceNoDrivers: noDrivers });
    if (!r.ok) {
      if (r.missing) return navigation.navigate('Recharge', { suggest: r.missing });
      return toast(r.error, 'error');
    }
    navigation.reset({ index: 1, routes: [{ name: 'PassengerTabs' }, { name: 'TripFlow' }] });
  };

  if (!destOk) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.white }}>
        <Header title="Sin cobertura" onBack={() => navigation.goBack()} />
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: 72 }}>🗺️</Text>
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
    <View style={{ flex: 1, backgroundColor: C.mapBg }}>
      <View style={{ height: 260 }}>
        <Map
          initialRegion={regionAround([origin, dest], 2.2)}
          route={[origin, dest]}
          markers={[
            { key: 'o', latitude: origin.latitude, longitude: origin.longitude, kind: 'origin' },
            { key: 'd', latitude: dest.latitude, longitude: dest.longitude, kind: 'dest', label: dest.name },
          ]}
        />
        <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0 }}>
          <RoundBtn icon="arrow-back" onPress={() => navigation.goBack()} style={{ margin: 16 }} label="Volver" />
        </SafeAreaView>
      </View>
      <View style={[s.summaryPanel]}>
        <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 10 }} showsVerticalScrollIndicator={false}>
          <RouteDots origin={origin.name} dest={dest.name} />

          <View style={[s.catRow, { borderColor: cat.color, backgroundColor: cat.soft }]}>
            <CatIcon id={category} size={34} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ fontWeight: '800', fontSize: 15, color: cat.text }}>{cat.name}</Text>
              <Text style={{ fontSize: 13, color: cat.text }}>{cat.desc} · {price.km} km · ~{price.minutes} min</Text>
            </View>
            {available.length > 1 ? (
              <TouchableOpacity onPress={() => setCatOpen(true)} style={{ padding: 8 }}>
                <Text style={{ fontWeight: '800', fontSize: 14, color: C.navy }}>Cambiar</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={{ marginTop: 12 }}>
            <PriceCard price={price} discount={discount} toPay={toPay} couponTitle={coupon?.title} balance={balance} />
          </View>

          {cargo ? (
            <View style={[s.infoRow, { marginTop: 12 }]}>
              <Ionicons name="cube-outline" size={20} color={C.sub} />
              <T.sub style={{ marginLeft: 8, flex: 1 }}>{cargo.desc} · {cargo.size}{cargo.helpers ? ` · ${cargo.helpers} ayudante(s)` : ''}</T.sub>
            </View>
          ) : null}

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

          {missing > 0 ? (
            <View style={[s.infoRow, { marginTop: 12, backgroundColor: C.redSoft }]}>
              <Ionicons name="wallet-outline" size={20} color={C.redText} />
              <Text style={{ marginLeft: 8, flex: 1, color: C.redText, fontWeight: '800', fontSize: 13 }}>
                Te faltan {money(missing)} en tu billetera (saldo {money(balance)}). Recarga para pedir.
              </Text>
            </View>
          ) : (
            <View style={[s.infoRow, { marginTop: 12, backgroundColor: C.greenSoft }]}>
              <Ionicons name="lock-closed" size={18} color={C.greenText} />
              <Text style={{ marginLeft: 8, flex: 1, color: C.greenText, fontWeight: '700', fontSize: 13 }}>
                Al pedir retenemos {money(toPay)}. Si cancelas antes de que acepten, vuelve completo a tu billetera.
              </Text>
            </View>
          )}

          <Row style={{ marginTop: 12, justifyContent: 'space-between' }}>
            <T.sub style={{ flex: 1 }}>Demo: simular que nadie acepta (2 min)</T.sub>
            <Switch value={noDrivers} onValueChange={setNoDrivers} />
          </Row>
        </ScrollView>
        <View style={{ paddingHorizontal: 18, paddingBottom: 22, paddingTop: 6 }}>
          {missing > 0 ? (
            <Btn title={`Recargar para pedir · ${money(toPay)}`} icon="add-circle" variant="secondary" onPress={() => navigation.navigate('Recharge', { suggest: missing })} />
          ) : (
            <Btn title={`Pedir ahora · ${money(toPay)}`} onPress={order} textStyle={{ fontSize: 18 }} />
          )}
        </View>
      </View>

      <Sheet visible={catOpen} onClose={() => setCatOpen(false)} title="Elige el vehículo">
        {available.map((c) => {
          const pr = calcPrice(cfg, { category: c.id, origin, dest, cargo, luggage });
          return (
            <TouchableOpacity key={c.id} onPress={() => { setCategory(c.id); setCatOpen(false); }} style={[s.catRow, { marginTop: 8 }, c.id === category && { borderColor: c.color, backgroundColor: c.soft }]}>
              <CatIcon id={c.id} size={32} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontWeight: '800', fontSize: 15, color: c.text }}>{c.name}</Text>
                <T.sub>{c.desc}</T.sub>
              </View>
              <Text style={{ fontFamily: F.price, fontSize: 18, color: C.navy }}>{money(pr.final)}</Text>
            </TouchableOpacity>
          );
        })}
      </Sheet>

      <Sheet visible={couponOpen} onClose={() => setCouponOpen(false)} title="Elige un vale">
        <ScrollView>
          <ListItem icon="close-circle" iconColor={C.sub} title="No usar vale" onPress={() => { setCouponId(null); setCouponOpen(false); }} right={!couponId ? <Ionicons name="checkmark" size={20} color={C.green} /> : null} />
          {coupons.map((c) => (
            <ListItem
              key={c.id}
              node={<GiftIcon color={C.purple} />}
              iconBg={C.purpleSoft}
              title={`${c.title} · ${money(Math.min(c.amount, cfg.couponMaxValue))}`}
              sub={`Vence el ${new Date(c.expiresAt).toLocaleDateString('es-PE')}`}
              onPress={() => { setCouponId(c.id); setCouponOpen(false); }}
              right={couponId === c.id ? <Ionicons name="checkmark" size={20} color={C.green} /> : null}
            />
          ))}
          <T.sub style={{ marginTop: 8 }}>Un vale por viaje. Solo se consume si el viaje se completa. El conductor igual recibe su tarifa completa.</T.sub>
        </ScrollView>
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  whereBox: { flexDirection: 'row', alignItems: 'center', height: 54, backgroundColor: C.bg, borderRadius: 16, paddingHorizontal: 14, borderWidth: 1.5, borderColor: C.border, marginTop: 12 },
  catBtn: { flex: 1, marginHorizontal: 4, borderWidth: 2, borderColor: C.border, backgroundColor: C.white, borderRadius: 16, paddingTop: 8, paddingBottom: 8, alignItems: 'center' },
  recent: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  recentIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  rewards: { backgroundColor: C.purpleSoft, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, marginTop: 8 },
  ptsPill: { flexDirection: 'row', alignItems: 'center', height: 44, paddingHorizontal: 14, borderRadius: 999, backgroundColor: C.purple, shadowColor: C.purple, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  topPill: { backgroundColor: C.white, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24, ...shadow },
  activeBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.gold, marginHorizontal: 16, marginTop: 10, padding: 12, borderRadius: 14, ...shadow },
  routeBox: { backgroundColor: C.bg, borderRadius: 16, paddingHorizontal: 12 },
  routeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  section: { marginTop: 18, marginBottom: 2 },
  sizeBtn: { flex: 1, marginHorizontal: 4, borderWidth: 2, borderColor: C.border, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center' },
  helperBox: { marginTop: 16, borderWidth: 1.5, borderColor: C.border, borderRadius: 16, padding: 12 },
  stepper: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  photoBox: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.line, borderRadius: 14, padding: 14 },
  summaryPanel: { flex: 1, marginTop: -30, backgroundColor: C.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, ...shadow, shadowOffset: { width: 0, height: -8 } },
  catRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: C.border, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, marginTop: 14 },
  couponBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.purple, backgroundColor: C.purpleSoft, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 12, padding: 10 },
});
