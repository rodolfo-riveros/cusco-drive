import React, { useState } from 'react';
import { View, TouchableOpacity, Share, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, F, money } from '../../theme';
import {
  Screen, Card, Row, T, Text, Progress, Btn, Badge, ListItem, Empty, Header, ReceiptLine, Stars, AndeanBorder, Chip,
  NavyHeader, CatIcon, Input, Avatar, GiftIcon,
} from '../../components/ui';
import { catById, placeById } from '../../data/mock';
import { fmtDate, couponValid } from '../../logic/pricing';
import { useApp } from '../../store/AppStore';
import { shareTrip } from './TripScreens';

const DAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

// ---------------- P7 · MIS PREMIOS ----------------
export function RewardsScreen() {
  const { state, applyReferral, toast } = useApp();
  const p = state.passenger;
  const cfg = state.config;
  const [code, setCode] = useState('');
  const inCycle = p.points % cfg.pointsPerReward;
  const valid = p.coupons.filter(couponValid);
  const used = p.coupons.filter((c) => !couponValid(c));

  const week = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { label: DAYS[d.getDay()], on: p.streak.includes(d.toISOString().slice(0, 10)) };
  });

  const redeem = () => {
    const r = applyReferral(code);
    if (r.ok) { toast('¡Código aplicado! Tienes un vale de S/ 2.00', 'success'); setCode(''); }
    else toast(r.error, 'error');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <NavyHeader title="Mis premios" color={C.purple}>
        <Row style={{ marginTop: 12, alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#E6DAF7' }}>Tus puntos</Text>
            <Text style={{ fontFamily: F.price, fontSize: 44, color: C.white, lineHeight: 52 }}>{p.points}</Text>
          </View>
          <Text style={{ color: '#E6DAF7', marginBottom: 10 }}>1 viaje = 1 punto</Text>
        </Row>
      </NavyHeader>
      <Screen edges={[]} contentStyle={{ paddingTop: 16 }}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ fontWeight: '800', color: C.purpleText }}>Próximo premio: {money(cfg.pointsRewardAmount)} de descuento</Text>
            <Text style={{ fontWeight: '800', color: C.purpleText }}>{inCycle}/{cfg.pointsPerReward}</Text>
          </Row>
          <Progress value={inCycle / cfg.pointsPerReward} style={{ marginTop: 10 }} />
          <T.sub style={{ marginTop: 6 }}>Te faltan {cfg.pointsPerReward - inCycle} viajes completados.</T.sub>
        </Card>

        <T.h2 style={{ marginTop: 20 }}>Vales disponibles</T.h2>
        {valid.length ? valid.map((c) => {
          const days = Math.ceil((new Date(c.expiresAt) - new Date()) / 86400000);
          return (
            <Row key={c.id} style={{ marginTop: 10, backgroundColor: C.white, borderRadius: 16, overflow: 'hidden', borderWidth: 1.5, borderColor: C.purpleTrack }}>
              <View style={{ backgroundColor: C.purpleSoft, paddingVertical: 14, width: 86, alignItems: 'center', alignSelf: 'stretch', justifyContent: 'center', borderRightWidth: 1.5, borderRightColor: C.purpleTrack, borderStyle: 'dashed' }}>
                <Text style={{ fontFamily: F.price, color: C.purple, fontSize: 20 }}>S/ {Math.min(c.amount, cfg.couponMaxValue)}</Text>
                <Text style={{ color: C.purpleText, fontSize: 11, fontWeight: '800' }}>dscto.</Text>
              </View>
              <View style={{ flex: 1, padding: 12 }}>
                <Text style={{ fontWeight: '800' }}>{c.title}</Text>
                <T.sub>Vence en {days} días · 1 por viaje</T.sub>
              </View>
            </Row>
          );
        }) : <Empty emoji="🎟️" title="Aún no tienes vales" text="Viaja y junta puntos para ganar descuentos." />}

        <T.h2 style={{ marginTop: 20 }}>Racha semanal</T.h2>
        <Card style={{ marginTop: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            {week.map((d, i) => (
              <View key={i} style={{ alignItems: 'center' }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: d.on ? C.gold : C.bg, alignItems: 'center', justifyContent: 'center', borderWidth: i === 6 ? 2 : 0, borderColor: C.navy }}>
                  {d.on ? <Ionicons name="flame" size={17} color={C.navy} /> : null}
                </View>
                <Text style={{ marginTop: 4, color: C.sub, fontWeight: '700' }}>{d.label}</Text>
              </View>
            ))}
          </Row>
          <T.sub style={{ marginTop: 10 }}>
            {p.streakRewarded ? '¡Racha completada esta semana! 🎉' : `Viaja 3 días distintos esta semana y gana un vale de S/ 1.00 (${p.streak.length}/3).`}
          </T.sub>
        </Card>

        <View style={{ marginTop: 20, backgroundColor: C.navy, borderRadius: 18, padding: 16 }}>
          <Text style={{ fontFamily: F.title, fontSize: 18, color: C.white }}>Invita y ganen los dos</Text>
          <Text style={{ color: C.navyText, marginTop: 4 }}>Cuando tu amigo complete su primer viaje, ambos reciben S/ 2 de saldo.</Text>
          <Row style={{ marginTop: 12 }}>
            <View style={{ flex: 1, borderWidth: 2, borderStyle: 'dashed', borderColor: C.gold, borderRadius: 12, padding: 10, alignItems: 'center' }}>
              <Text style={{ fontFamily: F.title, fontSize: 20, color: C.gold, letterSpacing: 2 }}>{p.referralCode}</Text>
            </View>
            <Btn small title="Compartir" style={{ marginLeft: 10 }} onPress={() => Share.share({ message: `Usa mi código ${p.referralCode} en Cusco Drive y gana S/ 2 en tu primer viaje` })} />
          </Row>
          <Text style={{ color: C.navyText, marginTop: 8, fontSize: 12 }}>{p.referralsDone} amigos ya viajaron con tu código.</Text>
        </View>
        <Card style={{ marginTop: 12 }}>
          <T.h3>¿Te invitaron?</T.h3>
          <Row style={{ marginTop: 8 }}>
            <Input value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="Ej. AMIGO-10" style={{ flex: 1 }} />
            <Btn small title="Aplicar" variant="secondary" style={{ marginLeft: 10 }} onPress={redeem} disabled={!code} />
          </Row>
          <T.sub style={{ marginTop: 6 }}>Solo con celular verificado · 1 código por dispositivo.</T.sub>
        </Card>

        {used.length ? (
          <>
            <T.label style={{ marginTop: 22 }}>VALES USADOS O VENCIDOS</T.label>
            {used.map((c) => <ListItem key={c.id} node={<GiftIcon color={C.muted} />} iconBg={C.bg} title={c.title} sub={c.used ? 'Usado' : 'Vencido'} />)}
          </>
        ) : null}
      </Screen>
    </View>
  );
}

const STATUS = {
  completed: ['Completado', 'green'],
  cancelled: ['Cancelado', 'red'],
  refunded: ['Reembolsado', 'navy'],
  disputed: ['En revisión', 'gold'],
};

// ---------------- HISTORIAL ----------------
export function HistoryScreen({ navigation }) {
  const { state } = useApp();
  const h = state.passenger.history;
  return (
    <Screen>
      <T.h1>Mis viajes</T.h1>
      {!h.length ? <Empty emoji="🛺" title="Aún no tienes viajes" text="Cuando pidas tu primer viaje aparecerá aquí." /> : null}
      {h.map((t) => {
        const [label, tone] = STATUS[t.status] || STATUS.completed;
        return (
          <Card key={t.id} style={{ marginTop: 12 }} onPress={() => navigation.navigate('TripDetail', { id: t.id })}>
            <Row>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: catById(t.category).soft, alignItems: 'center', justifyContent: 'center' }}>
                <CatIcon id={t.category} size={26} />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{t.dest}</Text>
                <T.sub numberOfLines={1}>Desde {t.origin} · {fmtDate(t.date)}</T.sub>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontFamily: F.title, fontSize: 16, color: t.status === 'completed' || t.status === 'disputed' ? C.navy : C.muted }}>{money(t.status === 'completed' || t.status === 'disputed' ? t.paid : t.paid || 0)}</Text>
                {t.status === 'completed' && t.rating ? <Stars value={t.rating} size={11} /> : <Badge text={label} tone={tone} />}
              </View>
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}

export function TripDetail({ navigation, route }) {
  const { state } = useApp();
  const t = state.passenger.history.find((x) => x.id === route.params.id);
  if (!t) return null;
  const [label, tone] = STATUS[t.status] || STATUS.completed;
  return (
    <Screen>
      <Header title="Detalle del viaje" onBack={() => navigation.goBack()} />
      <Card>
        <Row>
          <CatIcon id={t.category} size={34} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <T.h3>{catById(t.category).name}</T.h3>
            <T.sub>{fmtDate(t.date)}</T.sub>
          </View>
          <Badge text={label} tone={tone} />
        </Row>
        <View style={{ marginTop: 14 }}>
          <Row><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.navy }} /><T.p style={{ marginLeft: 10 }}>{t.origin}</T.p></Row>
          <View style={{ width: 2, height: 14, backgroundColor: C.line, marginLeft: 4 }} />
          <Row><View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: C.gold }} /><T.p style={{ marginLeft: 10, fontWeight: '800' }}>{t.dest}</T.p></Row>
        </View>
      </Card>
      <Card style={{ marginTop: 12 }}>
        <T.h3>Conductor</T.h3>
        <T.p style={{ marginTop: 4 }}>{t.driverName} · Placa {t.plate}</T.p>
        {t.rating ? <Row style={{ marginTop: 6 }}><T.sub>Tu calificación: </T.sub><Stars value={t.rating} size={14} /></Row> : null}
        {t.comment ? <T.sub style={{ marginTop: 4 }}>“{t.comment}”</T.sub> : null}
        {t.cancelReason ? <T.sub style={{ marginTop: 4, color: C.red }}>Motivo: {t.cancelReason}</T.sub> : null}
        {t.disputeReason ? <T.sub style={{ marginTop: 4, color: C.goldText }}>Reclamo: {t.disputeReason}</T.sub> : null}
      </Card>
      <Card style={{ marginTop: 12 }}>
        <T.h3 style={{ marginBottom: 4 }}>Recibo</T.h3>
        <ReceiptLine label="Tarifa del conductor" value={money(t.driverFare)} />
        <ReceiptLine label="Servicio Cusco Drive" value={money(t.margin)} />
        {t.discount ? <ReceiptLine label={t.coupon || 'Vale'} value={`− ${money(t.discount)}`} color={C.green} /> : null}
        <View style={{ height: 1, backgroundColor: C.border, marginVertical: 4 }} />
        {t.status === 'completed' ? <ReceiptLine label="Pagado con billetera" value={money(t.paid)} bold /> : null}
        {t.status === 'disputed' ? <ReceiptLine label="Retenido (en revisión)" value={money(t.paid)} bold color={C.goldText} /> : null}
        {t.refund ? <ReceiptLine label="Devuelto a tu billetera" value={money(t.refund)} bold color={C.green} /> : null}
        {t.status === 'cancelled' && t.paid ? <ReceiptLine label="Penalidad (al conductor)" value={money(t.paid)} /> : null}
      </Card>
      <Btn title="Reportar un problema" variant="ghost" icon="flag" style={{ marginTop: 16 }} onPress={() => navigation.navigate('Help', { report: true })} />
    </Screen>
  );
}

// ---------------- PERFIL ----------------
export function ProfileScreen({ navigation }) {
  const { state, wallets, logout, setRole } = useApp();
  const p = state.passenger;
  const completed = p.history.filter((h) => h.status === 'completed').length;
  return (
    <Screen>
      <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
        <Avatar name={p.name} size={84} bg={C.gold} />
        <T.h2 style={{ marginTop: 10 }}>{p.name}</T.h2>
        <T.sub>+51 {state.session.phone || '987654321'} · verificado</T.sub>
        <Row style={{ marginTop: 12 }}>
          <Badge text={`${completed} viajes`} tone="navy" />
          <Badge text={`${p.points} puntos`} tone="purple" style={{ marginLeft: 8 }} />
          <Badge text={money(wallets.pasajero)} tone="green" icon="wallet" style={{ marginLeft: 8 }} />
        </Row>
      </Card>

      <T.label style={{ marginTop: 20 }}>LUGARES GUARDADOS</T.label>
      <Card style={{ marginTop: 8, paddingVertical: 4 }}>
        {p.saved.map((sv) => <ListItem key={sv.label} icon={sv.icon} title={sv.label} sub={placeById(sv.placeId)?.name} />)}
      </Card>

      <T.label style={{ marginTop: 20 }}>CUENTA</T.label>
      <Card style={{ marginTop: 8, paddingVertical: 4 }}>
        <ListItem icon="wallet" iconColor={C.green} title="Mi billetera" sub="Recargas y movimientos" onPress={() => navigation.navigate('PWallet')} />
        <ListItem icon="shield-checkmark" iconColor={C.red} title="Seguridad y SOS" sub="Contactos de emergencia" onPress={() => navigation.navigate('Help')} />
        <ListItem icon="help-circle" title="Ayuda y reportes" onPress={() => navigation.navigate('Help', { report: true })} />
        <ListItem icon="language" title="Idioma" sub="Español · Quechua (pronto)" />
        <ListItem
          icon="swap-horizontal"
          iconColor={C.green}
          title="Cambiar a modo conductor"
          sub="Gana tu tarifa completa, sin comisión"
          onPress={() => {
            setRole('driver');
            const st = state.driver.status;
            navigation.reset({ index: 0, routes: [{ name: st === 'approved' ? 'DriverTabs' : st === 'none' ? 'DriverRegister' : 'DriverStatus' }] });
          }}
        />
        <ListItem icon="settings" iconColor={C.sub} title="Panel admin (demo)" onPress={() => navigation.navigate('Admin')} />
      </Card>
      <Btn title="Cerrar sesión" variant="ghost" icon="log-out" style={{ marginTop: 20 }} onPress={() => { logout(); navigation.reset({ index: 0, routes: [{ name: 'Login' }] }); }} />
      <AndeanBorder style={{ marginTop: 24, borderRadius: 4 }} />
      <T.sub style={{ textAlign: 'center', marginTop: 8 }}>Cusco Drive v1.0 · prototipo</T.sub>
    </Screen>
  );
}

// ---------------- AYUDA / SOS ----------------
export function HelpScreen({ navigation }) {
  const { state, toast } = useApp();
  const [topic, setTopic] = useState(null);
  const [text, setText] = useState('');
  const trip = state.trip;
  const topics = ['Cobro incorrecto', 'Conducta del conductor', 'Objeto olvidado', 'Seguridad', 'Problema con la app'];
  return (
    <Screen>
      <Header title="Ayuda y seguridad" onBack={() => navigation.goBack()} />
      <Card style={{ backgroundColor: C.red, alignItems: 'center', paddingVertical: 22 }}>
        <Text style={{ color: C.white, fontFamily: F.title, fontSize: 22 }}>Emergencia</Text>
        <Text style={{ color: '#FFDADA', textAlign: 'center', marginTop: 6 }}>Llamaremos a la Policía y avisaremos a tus contactos con tu ubicación.</Text>
        <Row style={{ marginTop: 14 }}>
          <Btn small title="Llamar 105" variant="light" icon="call" onPress={() => Linking.openURL('tel:105')} />
          <View style={{ width: 10 }} />
          <Btn small title="Alertar contactos" variant="light" icon="megaphone" onPress={() => Alert.alert('Alerta enviada', `Enviamos tu ubicación a ${state.passenger.contacts.map((c) => c.name).join(' y ')}.`)} />
        </Row>
      </Card>
      {trip && trip.driver ? <Btn title="Compartir mi viaje por WhatsApp" icon="logo-whatsapp" variant="success" style={{ marginTop: 12 }} onPress={() => shareTrip(trip)} /> : null}

      <T.label style={{ marginTop: 20 }}>CONTACTOS DE EMERGENCIA</T.label>
      <Card style={{ marginTop: 8, paddingVertical: 4 }}>
        {state.passenger.contacts.map((c) => (
          <ListItem key={c.phone} icon="person" title={c.name} sub={`+51 ${c.phone}`} right={<TouchableOpacity onPress={() => Linking.openURL(`tel:${c.phone}`)}><Ionicons name="call" size={22} color={C.green} /></TouchableOpacity>} />
        ))}
      </Card>

      <T.label style={{ marginTop: 20 }}>REPORTAR UN PROBLEMA</T.label>
      <Card style={{ marginTop: 8 }}>
        <Row style={{ flexWrap: 'wrap' }}>
          {topics.map((t) => <Chip key={t} label={t} active={topic === t} onPress={() => setTopic(t)} style={{ marginBottom: 8 }} />)}
        </Row>
        <Input value={text} onChangeText={setText} placeholder="Cuéntanos qué pasó" multiline style={{ minHeight: 90, textAlignVertical: 'top' }} />
        <Btn title="Enviar reporte" variant="secondary" style={{ marginTop: 12 }} disabled={!topic} onPress={() => { toast('Reporte enviado. Te responderemos pronto.', 'success'); setTopic(null); setText(''); }} />
      </Card>
    </Screen>
  );
}
