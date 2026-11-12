import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Share, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, money } from '../../theme';
import { Screen, Card, Row, T, Progress, Btn, Badge, ListItem, Empty, Header, ReceiptLine, Stars, AndeanBorder, Chip } from '../../components/ui';
import { catById, placeById } from '../../data/mock';
import { fmtDate, couponValid } from '../../logic/pricing';
import { useApp } from '../../store/AppStore';
import { shareTrip } from './TripScreens';

const DAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

// ---------------- MIS PREMIOS ----------------
export function RewardsScreen() {
  const { state, applyReferral, toast } = useApp();
  const p = state.passenger;
  const cfg = state.config;
  const [code, setCode] = useState('');
  const inCycle = p.points % cfg.pointsPerReward;
  const valid = p.coupons.filter(couponValid);
  const used = p.coupons.filter((c) => !couponValid(c));
  const level = p.points >= 60 ? 'Oro' : p.points >= 25 ? 'Plata' : 'Bronce';

  const week = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { label: DAYS[d.getDay()], on: p.streak.includes(d.toISOString().slice(0, 10)) };
  });

  const redeem = () => {
    const r = applyReferral(code);
    if (r.ok) { toast('¡Código aplicado! Tienes un cupón de S/ 2.00', 'success'); setCode(''); }
    else toast(r.error, 'error');
  };

  return (
    <Screen>
      <T.h1>Mis premios</T.h1>
      <Card style={{ marginTop: 14, backgroundColor: C.purple }}>
        <Row>
          <Text style={{ fontSize: 54 }}>🦙</Text>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ color: '#E6DAF7' }}>Tus puntos · Nivel {level}</Text>
            <Text style={{ color: C.white, fontSize: 40, fontWeight: '900' }}>{p.points}</Text>
          </View>
        </Row>
        <Progress value={inCycle / cfg.pointsPerReward} color={C.gold} style={{ marginTop: 10, backgroundColor: '#8B66BC' }} height={12} />
        <Text style={{ color: C.white, marginTop: 8, fontWeight: '600' }}>
          {inCycle}/{cfg.pointsPerReward} viajes · al completar ganas un cupón de {money(cfg.pointsRewardAmount)}
        </Text>
      </Card>

      <T.h2 style={{ marginTop: 22 }}>Cupones disponibles</T.h2>
      {valid.length ? (
        valid.map((c) => (
          <View key={c.id} style={{ flexDirection: 'row', marginTop: 10, backgroundColor: C.white, borderRadius: 16, overflow: 'hidden', borderWidth: 1.5, borderColor: C.purple + '40' }}>
            <View style={{ backgroundColor: C.purple, padding: 14, justifyContent: 'center', alignItems: 'center', width: 96 }}>
              <Text style={{ color: C.white, fontWeight: '900', fontSize: 20 }}>{money(Math.min(c.amount, cfg.couponMaxValue))}</Text>
            </View>
            <View style={{ flex: 1, padding: 12 }}>
              <T.h3>{c.title}</T.h3>
              <T.sub>Vence el {new Date(c.expiresAt).toLocaleDateString('es-PE')} · 1 por viaje</T.sub>
            </View>
          </View>
        ))
      ) : (
        <Empty emoji="🎟️" title="Aún no tienes cupones" text="Viaja y junta puntos para ganar descuentos." />
      )}

      <T.h2 style={{ marginTop: 22 }}>Racha semanal</T.h2>
      <Card style={{ marginTop: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          {week.map((d, i) => (
            <View key={i} style={{ alignItems: 'center' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: d.on ? C.gold : C.bg, alignItems: 'center', justifyContent: 'center', borderWidth: i === 6 ? 2 : 0, borderColor: C.navy }}>
                {d.on ? <Ionicons name="flame" size={18} color={C.navy} /> : null}
              </View>
              <Text style={{ marginTop: 4, color: C.sub, fontWeight: '700' }}>{d.label}</Text>
            </View>
          ))}
        </Row>
        <T.sub style={{ marginTop: 10 }}>
          {p.streakRewarded ? '¡Racha completada esta semana! 🎉' : `Viaja 3 días distintos esta semana y gana un cupón de S/ 1.00 (${p.streak.length}/3).`}
        </T.sub>
      </Card>

      <T.h2 style={{ marginTop: 22 }}>Invita y gana</T.h2>
      <Card style={{ marginTop: 10 }}>
        <T.p>Comparte tu código. Cuando tu amigo complete su primer viaje, ambos reciben <Text style={{ fontWeight: '800' }}>S/ 2.00</Text> de descuento.</T.p>
        <Row style={{ marginTop: 12 }}>
          <View style={{ flex: 1, borderWidth: 2, borderStyle: 'dashed', borderColor: C.gold, borderRadius: 12, padding: 12, alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: C.navy, letterSpacing: 2 }}>{p.referralCode}</Text>
          </View>
          <Btn small title="Compartir" icon="share-social" style={{ marginLeft: 10 }} onPress={() => Share.share({ message: `Usa mi código ${p.referralCode} en Cusco Drive y gana S/ 2 en tu primer viaje 🛺` })} />
        </Row>
        <T.sub style={{ marginTop: 8 }}>{p.referralsDone} amigos ya viajaron con tu código.</T.sub>
        <View style={{ height: 1, backgroundColor: C.border, marginVertical: 14 }} />
        <T.h3>¿Te invitaron?</T.h3>
        <Row style={{ marginTop: 8 }}>
          <TextInput
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            placeholder="Ej. AMIGO10"
            placeholderTextColor={C.muted}
            style={{ flex: 1, borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 12, fontSize: 16, color: C.text }}
          />
          <Btn small title="Aplicar" variant="secondary" style={{ marginLeft: 10 }} onPress={redeem} disabled={!code} />
        </Row>
        <T.sub style={{ marginTop: 6 }}>Solo con celular verificado · 1 código por dispositivo.</T.sub>
      </Card>

      {used.length ? (
        <>
          <T.sub style={{ marginTop: 22, fontWeight: '800' }}>CUPONES USADOS O VENCIDOS</T.sub>
          {used.map((c) => (
            <ListItem key={c.id} emoji="🎟️" iconColor={C.muted} title={c.title} sub={c.used ? 'Usado' : 'Vencido'} />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

// ---------------- HISTORIAL ----------------
export function HistoryScreen({ navigation }) {
  const { state } = useApp();
  const h = state.passenger.history;
  return (
    <Screen>
      <T.h1>Mis viajes</T.h1>
      {!h.length ? <Empty emoji="🛺" title="Aún no tienes viajes" text="Cuando pidas tu primer viaje aparecerá aquí." /> : null}
      {h.map((t) => (
        <Card key={t.id} style={{ marginTop: 12 }} onPress={() => navigation.navigate('TripDetail', { id: t.id })}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row>
              <Text style={{ fontSize: 26 }}>{catById(t.category).emoji}</Text>
              <View style={{ marginLeft: 10 }}>
                <T.h3>{t.dest}</T.h3>
                <T.sub>{fmtDate(t.date)}</T.sub>
              </View>
            </Row>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontWeight: '900', fontSize: 17, color: t.status === 'cancelled' ? C.muted : C.navy, textDecorationLine: t.status === 'cancelled' ? 'line-through' : 'none' }}>{money(t.final)}</Text>
              {t.status === 'cancelled' ? <Badge text="Cancelado" color={C.red} /> : t.rating ? <Stars value={t.rating} size={12} /> : <Badge text="Sin calificar" color={C.sub} />}
            </View>
          </Row>
          <T.sub style={{ marginTop: 6 }} numberOfLines={1}>Desde {t.origin}</T.sub>
        </Card>
      ))}
    </Screen>
  );
}

export function TripDetail({ navigation, route }) {
  const { state } = useApp();
  const t = state.passenger.history.find((x) => x.id === route.params.id);
  if (!t) return null;
  return (
    <Screen>
      <Header title="Detalle del viaje" onBack={() => navigation.goBack()} />
      <Card>
        <Row>
          <Text style={{ fontSize: 34 }}>{catById(t.category).emoji}</Text>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <T.h3>{catById(t.category).name}</T.h3>
            <T.sub>{fmtDate(t.date)}</T.sub>
          </View>
          {t.status === 'cancelled' ? <Badge text="Cancelado" color={C.red} /> : <Badge text="Completado" color={C.green} />}
        </Row>
        <View style={{ marginTop: 14 }}>
          <Row><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.green }} /><T.p style={{ marginLeft: 10 }}>{t.origin}</T.p></Row>
          <View style={{ width: 2, height: 14, backgroundColor: C.border, marginLeft: 4 }} />
          <Row><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.gold }} /><T.p style={{ marginLeft: 10, fontWeight: '700' }}>{t.dest}</T.p></Row>
        </View>
      </Card>
      <Card style={{ marginTop: 12 }}>
        <T.h3>Conductor</T.h3>
        <T.p style={{ marginTop: 4 }}>{t.driverName} · Placa {t.plate}</T.p>
        {t.rating ? <Row style={{ marginTop: 6 }}><T.sub>Tu calificación: </T.sub><Stars value={t.rating} size={14} /></Row> : null}
        {t.comment ? <T.sub style={{ marginTop: 4 }}>“{t.comment}”</T.sub> : null}
        {t.cancelReason ? <T.sub style={{ marginTop: 4, color: C.red }}>Motivo: {t.cancelReason}</T.sub> : null}
      </Card>
      <Card style={{ marginTop: 12 }}>
        <T.h3 style={{ marginBottom: 4 }}>Recibo</T.h3>
        <ReceiptLine label="Tarifa del conductor" value={money(t.driverFare)} />
        <ReceiptLine label="Cargo de servicio Cusco Drive" value={money(t.commission)} />
        {t.discount ? <ReceiptLine label={t.coupon || 'Descuento'} value={`- ${money(t.discount)}`} color={C.green} /> : null}
        <View style={{ height: 1, backgroundColor: C.border, marginVertical: 4 }} />
        <ReceiptLine label={t.status === 'cancelled' ? 'No cobrado' : 'Total (efectivo)'} value={money(t.final)} bold />
      </Card>
      <Btn title="Reportar un problema" variant="ghost" icon="flag" style={{ marginTop: 16 }} onPress={() => navigation.navigate('Help', { report: true })} />
    </Screen>
  );
}

// ---------------- PERFIL ----------------
export function ProfileScreen({ navigation }) {
  const { state, logout, setRole } = useApp();
  const p = state.passenger;
  const completed = p.history.filter((h) => h.status === 'completed').length;
  return (
    <Screen>
      <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 34, fontWeight: '900', color: C.navy }}>LQ</Text>
        </View>
        <T.h2 style={{ marginTop: 10 }}>{p.name}</T.h2>
        <T.sub>+51 {state.session.phone || '987654321'} · verificado ✅</T.sub>
        <Row style={{ marginTop: 12 }}>
          <Badge text={`${completed} viajes`} color={C.navy} />
          <View style={{ width: 8 }} />
          <Badge text={`${p.points} puntos`} color={C.purple} />
        </Row>
      </Card>

      <T.sub style={{ marginTop: 20, fontWeight: '800' }}>LUGARES GUARDADOS</T.sub>
      <Card style={{ marginTop: 8, paddingVertical: 4 }}>
        {p.saved.map((sv) => (
          <ListItem key={sv.label} icon={sv.icon} title={sv.label} sub={placeById(sv.placeId)?.name} />
        ))}
      </Card>

      <T.sub style={{ marginTop: 20, fontWeight: '800' }}>CUENTA</T.sub>
      <Card style={{ marginTop: 8, paddingVertical: 4 }}>
        <ListItem icon="shield-checkmark" iconColor={C.red} title="Seguridad y SOS" sub="Contactos de emergencia" onPress={() => navigation.navigate('Help')} />
        <ListItem icon="help-circle" title="Ayuda y reportes" onPress={() => navigation.navigate('Help', { report: true })} />
        <ListItem icon="language" title="Idioma" sub="Español · Quechua (pronto)" />
        <ListItem
          icon="swap-horizontal"
          iconColor={C.green}
          title="Cambiar a modo conductor"
          sub="Gana dinero con tu vehículo"
          onPress={() => {
            setRole('driver');
            const st = state.driver.status;
            navigation.reset({ index: 0, routes: [{ name: st === 'approved' ? 'DriverTabs' : st === 'none' ? 'DriverRegister' : 'DriverStatus' }] });
          }}
        />
        <ListItem icon="settings" iconColor={C.sub} title="Panel admin (demo)" onPress={() => navigation.navigate('Admin')} />
      </Card>
      <Btn
        title="Cerrar sesión"
        variant="ghost"
        icon="log-out"
        style={{ marginTop: 20 }}
        onPress={() => { logout(); navigation.reset({ index: 0, routes: [{ name: 'RoleSelect' }] }); }}
      />
      <AndeanBorder style={{ marginTop: 24 }} height={8} />
      <T.sub style={{ textAlign: 'center', marginTop: 8 }}>Cusco Drive v1.0 · prototipo</T.sub>
    </Screen>
  );
}

// ---------------- AYUDA / SOS ----------------
export function HelpScreen({ navigation, route }) {
  const { state, toast } = useApp();
  const [topic, setTopic] = useState(null);
  const [text, setText] = useState('');
  const trip = state.trip;
  const topics = ['Cobro incorrecto', 'Conducta del conductor', 'Objeto olvidado', 'Seguridad', 'Problema con la app'];
  return (
    <Screen>
      <Header title="Ayuda y seguridad" onBack={() => navigation.goBack()} />
      <Card style={{ backgroundColor: C.red, alignItems: 'center', paddingVertical: 22 }}>
        <Text style={{ color: C.white, fontSize: 22, fontWeight: '900' }}>🚨 Emergencia</Text>
        <Text style={{ color: '#FFDADA', textAlign: 'center', marginTop: 6 }}>Llamaremos a la Policía y avisaremos a tus contactos con tu ubicación.</Text>
        <Row style={{ marginTop: 14 }}>
          <Btn small title="Llamar 105" variant="light" icon="call" onPress={() => Linking.openURL('tel:105')} />
          <View style={{ width: 10 }} />
          <Btn
            small
            title="Alertar contactos"
            variant="light"
            icon="megaphone"
            onPress={() => {
              Alert.alert('Alerta enviada', `Enviamos tu ubicación a ${state.passenger.contacts.map((c) => c.name).join(' y ')}.`);
            }}
          />
        </Row>
      </Card>
      {trip && trip.driver ? <Btn title="Compartir mi viaje por WhatsApp" icon="logo-whatsapp" variant="success" style={{ marginTop: 12 }} onPress={() => shareTrip(trip)} /> : null}

      <T.sub style={{ marginTop: 20, fontWeight: '800' }}>CONTACTOS DE EMERGENCIA</T.sub>
      <Card style={{ marginTop: 8, paddingVertical: 4 }}>
        {state.passenger.contacts.map((c) => (
          <ListItem key={c.phone} icon="person" title={c.name} sub={`+51 ${c.phone}`} right={<TouchableOpacity onPress={() => Linking.openURL(`tel:${c.phone}`)}><Ionicons name="call" size={22} color={C.green} /></TouchableOpacity>} />
        ))}
      </Card>

      <T.sub style={{ marginTop: 20, fontWeight: '800' }}>REPORTAR UN PROBLEMA</T.sub>
      <Card style={{ marginTop: 8 }}>
        <Row style={{ flexWrap: 'wrap' }}>
          {topics.map((t) => (
            <Chip key={t} label={t} active={topic === t} onPress={() => setTopic(t)} style={{ marginBottom: 8, paddingVertical: 7 }} />
          ))}
        </Row>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Cuéntanos qué pasó"
          placeholderTextColor={C.muted}
          multiline
          style={{ borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 12, minHeight: 90, textAlignVertical: 'top', color: C.text }}
        />
        <Btn
          title="Enviar reporte"
          variant="secondary"
          style={{ marginTop: 12 }}
          disabled={!topic}
          onPress={() => { toast('Reporte enviado. Te responderemos pronto.', 'success'); setTopic(null); setText(''); }}
        />
      </Card>
    </Screen>
  );
}
