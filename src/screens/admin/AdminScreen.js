import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, money } from '../../theme';
import { Screen, Card, Row, T, Header, Badge, Btn, Progress, ListItem } from '../../components/ui';
import { CATEGORIES, catById, placeById } from '../../data/mock';
import { calcPrice, fmtDate } from '../../logic/pricing';
import { useApp } from '../../store/AppStore';

const Stepper = ({ value, onChange, step = 0.1, suffix = '', prefix = '' }) => (
  <Row>
    <TouchableOpacity onPress={() => onChange(Math.max(0, Math.round((value - step) * 100) / 100))} style={st}><Ionicons name="remove" size={18} color={C.navy} /></TouchableOpacity>
    <Text style={{ minWidth: 70, textAlign: 'center', fontWeight: '800', color: C.navy, fontSize: 16 }}>{prefix}{Number(value).toFixed(step < 1 ? 2 : 0)}{suffix}</Text>
    <TouchableOpacity onPress={() => onChange(Math.round((value + step) * 100) / 100)} style={st}><Ionicons name="add" size={18} color={C.navy} /></TouchableOpacity>
  </Row>
);
const st = { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white };

export function AdminScreen({ navigation }) {
  const { state, setConfig, approvePending, adminDecideSelf, toast } = useApp();
  const cfg = state.config;
  const [cat, setCat] = useState('mototaxi');
  const cm = cfg.commission[cat];
  const tf = cfg.tariffs[cat];
  const sample = calcPrice(cfg, { category: cat, origin: placeById('plaza'), dest: placeById('mercado'), cargo: { size: Object.keys(cfg.cargoSizes[cat] || { x: 0 })[0] } });
  const sampleLong = calcPrice(cfg, { category: cat, origin: placeById('plaza'), dest: placeById('yanahuara'), cargo: { size: Object.keys(cfg.cargoSizes[cat] || { x: 0 })[0] } });

  const setCm = (patch) => setConfig((c) => ({ ...c, commission: { ...c.commission, [cat]: { ...c.commission[cat], ...patch } } }));
  const setTf = (patch) => setConfig((c) => ({ ...c, tariffs: { ...c.tariffs, [cat]: { ...c.tariffs[cat], ...patch } } }));

  const cap = (state.stats.commissionGenerated * cfg.rewardsCapPct) / 100;
  const pending = [...state.pendingDrivers];
  if (state.driver.status === 'pending') pending.unshift({ id: 'self', name: state.driver.profile.name, category: state.driver.profile.category, plate: state.driver.profile.plate, docs: 5, date: new Date().toISOString() });

  return (
    <Screen>
      <Header title="Panel administrador (demo)" onBack={() => navigation.goBack()} />
      <Card style={{ backgroundColor: C.goldSoft }}>
        <T.sub>En producción esto es el panel web (Laravel). Aquí puedes cambiar los parámetros y verlos reflejados al instante en la app.</T.sub>
      </Card>

      <T.h2 style={{ marginTop: 18 }}>Ingresos</T.h2>
      <Row style={{ marginTop: 10 }}>
        <Card style={{ flex: 1, marginRight: 6 }}><T.sub>Comisión generada</T.sub><T.h2>{money(state.stats.commissionGenerated)}</T.h2></Card>
        <Card style={{ flex: 1, marginLeft: 6 }}><T.sub>Gastado en premios</T.sub><T.h2 style={{ color: C.purple }}>{money(state.stats.rewardsSpent)}</T.h2></Card>
      </Row>
      <Card style={{ marginTop: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T.h3>Tope de premios</T.h3>
          <Stepper value={cfg.rewardsCapPct} step={5} suffix="%" onChange={(v) => setConfig((c) => ({ ...c, rewardsCapPct: Math.min(50, v) }))} />
        </Row>
        <Progress value={state.stats.rewardsSpent / cap} color={state.stats.rewardsSpent > cap * 0.9 ? C.red : C.purple} style={{ marginTop: 10 }} />
        <T.sub style={{ marginTop: 6 }}>{money(state.stats.rewardsSpent)} de {money(cap)} permitidos. Si se supera, los cupones se pausan.</T.sub>
      </Card>

      <T.h2 style={{ marginTop: 18 }}>Tarifario y comisión</T.h2>
      <Row style={{ marginTop: 10, flexWrap: 'wrap' }}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity key={c.id} onPress={() => setCat(c.id)} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 6, marginBottom: 6, backgroundColor: cat === c.id ? c.color : C.white, borderWidth: 1.5, borderColor: cat === c.id ? c.color : C.border }}>
            <Text style={{ fontWeight: '800', color: cat === c.id ? C.white : C.navy }}>{c.emoji} {c.name}</Text>
          </TouchableOpacity>
        ))}
      </Row>
      <Card style={{ marginTop: 6 }}>
        <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}><T.p>Tarifa base</T.p><Stepper value={tf.base} step={0.5} prefix="S/ " onChange={(v) => setTf({ base: v })} /></Row>
        <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}><T.p>Por km</T.p><Stepper value={tf.perKm} step={0.1} prefix="S/ " onChange={(v) => setTf({ perKm: v })} /></Row>
        <Row style={{ justifyContent: 'space-between', marginBottom: 14 }}><T.p>Tarifa mínima</T.p><Stepper value={tf.min} step={0.5} prefix="S/ " onChange={(v) => setTf({ min: v })} /></Row>
        <View style={{ height: 1, backgroundColor: C.border, marginBottom: 12 }} />
        <Row style={{ justifyContent: 'space-between' }}>
          <T.p>Tipo de comisión</T.p>
          <Row>
            {['fixed', 'percent'].map((t) => (
              <TouchableOpacity key={t} onPress={() => setCm({ type: t, value: t === 'fixed' ? 0.4 : 10 })} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginLeft: 6, backgroundColor: cm.type === t ? C.navy : C.bg }}>
                <Text style={{ fontWeight: '700', color: cm.type === t ? C.white : C.navy }}>{t === 'fixed' ? 'Monto fijo' : 'Porcentaje'}</Text>
              </TouchableOpacity>
            ))}
          </Row>
        </Row>
        <Row style={{ justifyContent: 'space-between', marginTop: 12 }}>
          <T.p>Comisión</T.p>
          {cm.type === 'fixed' ? (
            <Stepper value={cm.value} step={0.05} prefix="S/ " onChange={(v) => setCm({ value: v })} />
          ) : (
            <Stepper value={cm.value} step={1} suffix="%" onChange={(v) => setCm({ value: v })} />
          )}
        </Row>
        <View style={{ backgroundColor: C.bg, borderRadius: 12, padding: 12, marginTop: 14 }}>
          <T.sub style={{ fontWeight: '800' }}>Vista previa</T.sub>
          <T.sub>Plaza → Mercado: conductor {money(sample.driverFare)} + comisión {money(sample.commission)} = <Text style={{ fontWeight: '900', color: C.navy }}>{money(sample.final)}</Text></T.sub>
          <T.sub>Plaza → Yanahuara: conductor {money(sampleLong.driverFare)} + comisión {money(sampleLong.commission)} = <Text style={{ fontWeight: '900', color: C.navy }}>{money(sampleLong.final)}</Text></T.sub>
          <T.sub style={{ marginTop: 4 }}>La comisión equivale al {((sample.commission / sample.driverFare) * 100).toFixed(0)}% de la tarifa corta.</T.sub>
        </View>
      </Card>

      <Card style={{ marginTop: 12 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}><T.h3>Redondear a S/ 0.50</T.h3><T.sub>Evita monedas de 10 céntimos (2.90 → 3.00)</T.sub></View>
          <Switch value={cfg.rounding === '0.50'} onValueChange={(v) => setConfig((c) => ({ ...c, rounding: v ? '0.50' : 'none' }))} trackColor={{ true: C.gold }} />
        </Row>
        <Row style={{ justifyContent: 'space-between', marginTop: 14 }}>
          <View style={{ flex: 1 }}><T.h3>Hoy llueve 🌧️</T.h3><T.sub>Activa el recargo transparente por lluvia</T.sub></View>
          <Switch value={cfg.raining} onValueChange={(v) => setConfig((c) => ({ ...c, raining: v }))} trackColor={{ true: C.gold }} />
        </Row>
        <T.sub style={{ marginTop: 10 }}>Recargo nocturno automático de 22:00 a 05:00. No hay tarifa dinámica tipo “surge”.</T.sub>
      </Card>

      <T.h2 style={{ marginTop: 18 }}>Conductores por aprobar</T.h2>
      <Card style={{ marginTop: 10, paddingVertical: 4 }}>
        {pending.length ? (
          pending.map((p) => (
            <View key={p.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <Row>
                <Text style={{ fontSize: 26 }}>{catById(p.category).emoji}</Text>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <T.h3>{p.name}</T.h3>
                  <T.sub>{p.plate} · {p.docs}/5 documentos · {fmtDate(p.date)}</T.sub>
                </View>
                {p.id === 'self' ? <Badge text="Tú" color={C.purple} /> : null}
              </Row>
              <Row style={{ marginTop: 8 }}>
                <Btn small title="Aprobar" variant="success" style={{ flex: 1, marginRight: 6 }} onPress={() => { p.id === 'self' ? adminDecideSelf(true) : approvePending(p.id, true); toast(`${p.name} aprobado`, 'success'); }} />
                <Btn small title="Rechazar" variant="danger" style={{ flex: 1 }} onPress={() => { p.id === 'self' ? adminDecideSelf(false, 'Documentos ilegibles') : approvePending(p.id, false); toast(`${p.name} rechazado`, 'warn'); }} />
              </Row>
            </View>
          ))
        ) : (
          <T.sub style={{ padding: 12 }}>No hay solicitudes pendientes.</T.sub>
        )}
      </Card>

      <T.h2 style={{ marginTop: 18 }}>Bonos de conductores</T.h2>
      <Card style={{ marginTop: 10 }}>
        {cfg.driverBonuses.map((b, i) => (
          <Row key={i} style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <T.p>{b.trips} viajes/semana</T.p>
            <Stepper value={b.amount} step={1} prefix="S/ " onChange={(v) => setConfig((c) => ({ ...c, driverBonuses: c.driverBonuses.map((x, k) => (k === i ? { ...x, amount: v } : x)) }))} />
          </Row>
        ))}
        <Row style={{ justifyContent: 'space-between' }}>
          <T.p>Viajes para premio pasajero</T.p>
          <Stepper value={cfg.pointsPerReward} step={1} onChange={(v) => setConfig((c) => ({ ...c, pointsPerReward: Math.max(2, v) }))} />
        </Row>
      </Card>
    </Screen>
  );
}
