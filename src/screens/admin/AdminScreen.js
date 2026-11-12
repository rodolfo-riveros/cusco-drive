import React, { useState } from 'react';
import { View, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, F, money, signed } from '../../theme';
import { Screen, Card, Row, T, Text, Header, Badge, Btn, Progress, CatIcon } from '../../components/ui';
import { CATEGORIES, catById, placeById } from '../../data/mock';
import { calcPrice, fmtDate, round2 } from '../../logic/pricing';
import { ACCOUNTS, TYPE_LABEL } from '../../logic/ledger';
import { useApp } from '../../store/AppStore';

const Stepper = ({ value, onChange, step = 0.1, suffix = '', prefix = '', min = 0 }) => (
  <Row>
    <TouchableOpacity onPress={() => onChange(Math.max(min, round2(value - step)))} style={st}><Ionicons name="remove" size={18} color={C.navy} /></TouchableOpacity>
    <Text style={{ minWidth: 70, textAlign: 'center', fontWeight: '800', color: C.navy, fontSize: 15 }}>{prefix}{Number(value).toFixed(step < 1 ? 2 : 0)}{suffix}</Text>
    <TouchableOpacity onPress={() => onChange(round2(value + step))} style={st}><Ionicons name="add" size={18} color={C.navy} /></TouchableOpacity>
  </Row>
);
const st = { width: 36, height: 36, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white };
const ParamRow = ({ label, sub, children }) => (
  <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
    <View style={{ flex: 1, paddingRight: 8 }}>
      <Text style={{ fontWeight: '700' }}>{label}</Text>
      {sub ? <T.sub style={{ fontSize: 12 }}>{sub}</T.sub> : null}
    </View>
    {children}
  </Row>
);
const Kpi = ({ label, value, color = C.navy, style }) => (
  <Card style={[{ flex: 1, padding: 12 }, style]}>
    <T.sub style={{ fontSize: 12 }}>{label}</T.sub>
    <Text style={{ fontFamily: F.price, fontSize: 18, color }}>{value}</Text>
  </Card>
);

export function AdminScreen({ navigation }) {
  const { state, wallets, stats, setConfig, approvePending, adminDecideSelf, toast, resolveDispute } = useApp();
  const cfg = state.config;
  const [cat, setCat] = useState('mototaxi');
  const [ledgerAll, setLedgerAll] = useState(false);
  const mg = cfg.margin[cat];
  const tf = cfg.tariffs[cat];

  const size0 = { size: Object.keys(cfg.cargoSizes[cat] || { x: 0 })[0] };
  const sample = calcPrice(cfg, { category: cat, origin: placeById('plaza'), dest: placeById('mercado'), cargo: size0 });
  const sampleLong = calcPrice(cfg, { category: cat, origin: placeById('plaza'), dest: placeById('yanahuara'), cargo: size0 });
  const sampleMid = calcPrice(cfg, { category: cat, origin: placeById('plaza'), dest: placeById('chicon'), cargo: size0 });

  const setMg = (patch) => setConfig((c) => ({ ...c, margin: { ...c.margin, [cat]: { ...c.margin[cat], ...patch } } }));
  const setTf = (patch) => setConfig((c) => ({ ...c, tariffs: { ...c.tariffs, [cat]: { ...c.tariffs[cat], ...patch } } }));
  const setC = (k) => (v) => setConfig((c) => ({ ...c, [k]: v }));

  const cap = (stats.margin * cfg.rewardsCapPct) / 100;
  const pending = [...state.pendingDrivers];
  if (state.driver.status === 'pending') pending.unshift({ id: 'self', name: state.driver.profile.name, category: state.driver.profile.category, plate: state.driver.profile.plate, docs: 5, date: new Date().toISOString() });
  const audit = round2(Object.values(wallets).reduce((a, b) => a + b, 0));
  const openDisputes = state.disputes.filter((d) => d.status === 'open');
  const ledger = ledgerAll ? state.ledger : state.ledger.slice(0, 25);

  return (
    <Screen>
      <Header title="Panel administrador (demo)" onBack={() => navigation.goBack()} />
      <Card flat style={{ backgroundColor: C.goldSoft, borderColor: C.goldSoft }}>
        <T.sub style={{ color: C.goldText }}>En producción esto es el panel web (Laravel). Todos los parámetros viven en base de datos: cámbialos aquí y se reflejan al instante en la app.</T.sub>
      </Card>

      <T.h2 style={{ marginTop: 18 }}>Dinero en la plataforma</T.h2>
      <Row style={{ marginTop: 10 }}>
        <Kpi label="Margen generado" value={money(stats.margin)} style={{ marginRight: 6 }} />
        <Kpi label="Retenido ahora" value={money(wallets.retenido)} color={C.goldText} style={{ marginLeft: 6 }} />
      </Row>
      <Row style={{ marginTop: 10 }}>
        <Kpi label="Premios y bonos" value={`−${money(stats.rewards)}`} color={C.purple} style={{ marginRight: 6 }} />
        <Kpi label="Pasarela" value={`−${money(stats.gateway)}`} color={C.red} style={{ marginLeft: 6 }} />
      </Row>
      <Row style={{ marginTop: 10 }}>
        <Kpi label="Margen neto real" value={money(stats.net)} color={C.green} style={{ marginRight: 6 }} />
        <Kpi label="Billeteras conductores" value={money(wallets.conductor + wallets.conductores)} style={{ marginLeft: 6 }} />
      </Row>
      <Row style={{ marginTop: 10, backgroundColor: audit === 0 ? C.greenSoft : C.redSoft, borderRadius: 12, padding: 10 }}>
        <Ionicons name={audit === 0 ? 'checkmark-circle' : 'alert-circle'} size={18} color={audit === 0 ? C.green : C.red} />
        <Text style={{ marginLeft: 8, fontWeight: '800', color: audit === 0 ? C.greenText : C.redText, flex: 1 }}>
          Cuadre del libro: {money(audit)} · {state.ledger.length} asientos, ninguno se borra
        </Text>
      </Row>

      <T.h2 style={{ marginTop: 20 }}>Reclamos ({openDisputes.length})</T.h2>
      <Card style={{ marginTop: 10 }}>
        {state.disputes.length ? state.disputes.map((d) => (
          <View key={d.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ fontWeight: '800', flex: 1 }}>{d.trip.origin.name.replace('Mi ubicación ', '')} → {d.trip.dest.name}</Text>
              <Badge text={d.status === 'open' ? 'Retenido' : d.status === 'paid' ? 'Pagado al conductor' : 'Reembolsado'} tone={d.status === 'open' ? 'gold' : d.status === 'paid' ? 'green' : 'navy'} />
            </Row>
            <T.sub>“{d.reason}” · {money(d.amount)} · {d.trip.driver?.name} · {fmtDate(d.createdAt)}</T.sub>
            {d.status === 'open' ? (
              <Row style={{ marginTop: 8 }}>
                <Btn small title="Pagar al conductor" variant="success" style={{ flex: 1, marginRight: 6 }} onPress={() => resolveDispute(d.id, 'driver')} />
                <Btn small title="Reembolsar" variant="secondary" style={{ flex: 1 }} onPress={() => resolveDispute(d.id, 'refund')} />
              </Row>
            ) : null}
          </View>
        )) : <T.sub>Sin reclamos. Para probar: en un viaje del pasajero, al llegar toca “Tengo un problema”.</T.sub>}
      </Card>

      <T.h2 style={{ marginTop: 20 }}>Tarifario y margen</T.h2>
      <Row style={{ marginTop: 10, flexWrap: 'wrap' }}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity key={c.id} onPress={() => setCat(c.id)} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 6, marginBottom: 6, backgroundColor: cat === c.id ? c.soft : C.white, borderWidth: 1.5, borderColor: cat === c.id ? c.color : C.border }}>
            <CatIcon id={c.id} size={18} />
            <Text style={{ fontWeight: '800', color: c.text, marginLeft: 6 }}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </Row>
      <Card style={{ marginTop: 6 }}>
        <ParamRow label="Tarifa en el centro" sub="Precio final dentro del centro"><Stepper value={tf.centerFare} step={0.5} prefix="S/ " onChange={(v) => setTf({ centerFare: v })} /></ParamRow>
        <ParamRow label="Sube por tramo" sub="Fuera del centro, por cada tramo"><Stepper value={tf.stepAmount} step={0.5} prefix="S/ " onChange={(v) => setTf({ stepAmount: v })} /></ParamRow>
        <ParamRow label="Largo del tramo"><Stepper value={tf.stepKm} step={0.5} min={0.5} suffix=" km" onChange={(v) => setTf({ stepKm: v })} /></ParamRow>
        <ParamRow label="Tarifa mínima"><Stepper value={tf.min} step={0.5} prefix="S/ " onChange={(v) => setTf({ min: v })} /></ParamRow>
        <View style={{ height: 1, backgroundColor: C.border, marginBottom: 12 }} />
        <ParamRow label="Tipo de margen">
          <Row>
            {['fixed', 'percent'].map((t) => (
              <TouchableOpacity key={t} onPress={() => setMg({ type: t, value: t === 'fixed' ? 0.5 : 10 })} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginLeft: 6, backgroundColor: mg.type === t ? C.navy : C.bg }}>
                <Text style={{ fontWeight: '700', color: mg.type === t ? C.white : C.navy }}>{t === 'fixed' ? 'Monto fijo' : 'Porcentaje'}</Text>
              </TouchableOpacity>
            ))}
          </Row>
        </ParamRow>
        <ParamRow label="Margen Cusco Drive">
          {mg.type === 'fixed' ? <Stepper value={mg.value} step={0.1} prefix="S/ " onChange={(v) => setMg({ value: v })} /> : <Stepper value={mg.value} step={1} suffix="%" onChange={(v) => setMg({ value: v })} />}
        </ParamRow>
        <View style={{ backgroundColor: C.bg, borderRadius: 12, padding: 12 }}>
          <T.sub style={{ fontWeight: '800' }}>Vista previa</T.sub>
          <T.sub>Plaza → Mercado ({sample.zone}): <Text style={{ fontWeight: '800', color: C.navy, fontSize: 13 }}>{money(sample.final)}</Text> = conductor {money(sample.driverFare)} + margen {money(sample.margin)}</T.sub>
          <T.sub>Plaza → Chicón ({sampleMid.zone}): <Text style={{ fontWeight: '800', color: C.navy, fontSize: 13 }}>{money(sampleMid.final)}</Text> = conductor {money(sampleMid.driverFare)} + margen {money(sampleMid.margin)}</T.sub>
          <T.sub>Plaza → Yanahuara ({sampleLong.zone}): <Text style={{ fontWeight: '800', color: C.navy, fontSize: 13 }}>{money(sampleLong.final)}</Text> = conductor {money(sampleLong.driverFare)} + margen {money(sampleLong.margin)}</T.sub>
        </View>
      </Card>
      <Card style={{ marginTop: 12 }}>
        <T.h3 style={{ marginBottom: 10 }}>Zonas de Urubamba</T.h3>
        <ParamRow label="Radio del centro" sub="Desde la Plaza de Armas"><Stepper value={cfg.centerRadiusKm} step={0.1} min={0.3} suffix=" km" onChange={setC('centerRadiusKm')} /></ParamRow>
        <ParamRow label="Extra al salir del centro"><Stepper value={cfg.leaveCenterExtra} step={0.5} prefix="S/ " onChange={setC('leaveCenterExtra')} /></ParamRow>
        <ParamRow label="Recorrido normal en el centro" sub="Más que esto suma tramos"><Stepper value={cfg.centerTripKm} step={0.5} min={0.5} suffix=" km" onChange={setC('centerTripKm')} /></ParamRow>
        <ParamRow label="Solo Urubamba" sub="Desactiva para probar con tu GPS en otra ciudad"><Switch value={cfg.restrictToUrubamba} onValueChange={setC('restrictToUrubamba')} trackColor={{ true: C.gold }} /></ParamRow>
        <ParamRow label="Recargo nocturno" sub="22:00 a 05:00"><Switch value={cfg.nightSurcharge} onValueChange={setC('nightSurcharge')} trackColor={{ true: C.gold }} /></ParamRow>
        <ParamRow label="Redondear a S/ 0.50" sub="Precios en múltiplos de 0.50"><Switch value={cfg.rounding === '0.50'} onValueChange={(v) => setConfig((c) => ({ ...c, rounding: v ? '0.50' : 'none' }))} trackColor={{ true: C.gold }} /></ParamRow>
        <ParamRow label="Hoy llueve" sub="Activa el recargo transparente por lluvia"><Switch value={cfg.raining} onValueChange={setC('raining')} trackColor={{ true: C.gold }} /></ParamRow>
        <T.sub>El precio depende de la zona y la distancia real por calle. No hay tarifa dinámica tipo “surge”.</T.sub>
      </Card>

      <T.h2 style={{ marginTop: 20 }}>Pago retenido</T.h2>
      <Card style={{ marginTop: 10 }}>
        <ParamRow label="Liberación automática" sub="Si el pasajero no reclama"><Stepper value={cfg.autoReleaseMin} step={1} min={1} suffix=" min" onChange={setC('autoReleaseMin')} /></ParamRow>
        <ParamRow label="Sin conductor → reembolso" sub="Tiempo máximo de búsqueda"><Stepper value={cfg.searchTimeoutMin} step={1} min={1} suffix=" min" onChange={setC('searchTimeoutMin')} /></ParamRow>
        <ParamRow label="Radio GPS para finalizar"><Stepper value={cfg.arrivalRadiusM} step={50} min={50} suffix=" m" onChange={setC('arrivalRadiusM')} /></ParamRow>
        <ParamRow label="Penalidad al cancelar" sub="Si el conductor ya llegó (va al conductor)"><Stepper value={cfg.cancelFeeArrived} step={0.5} prefix="S/ " onChange={setC('cancelFeeArrived')} /></ParamRow>
      </Card>

      <T.h2 style={{ marginTop: 20 }}>Pagos y retiros</T.h2>
      <Card style={{ marginTop: 10 }}>
        <ParamRow label="Comisión de pasarela por cobro" sub="Yape/Plin vía Culqi, Niubiz… (pendiente)"><Stepper value={cfg.gatewayFeePct} step={0.5} suffix="%" onChange={setC('gatewayFeePct')} /></ParamRow>
        <ParamRow label="Retiros gratis al mes"><Stepper value={cfg.freeWithdrawalsPerMonth} step={1} onChange={setC('freeWithdrawalsPerMonth')} /></ParamRow>
        <ParamRow label="Costo por retiro extra"><Stepper value={cfg.withdrawFee} step={0.5} prefix="S/ " onChange={setC('withdrawFee')} /></ParamRow>
        <ParamRow label="Retiro mínimo"><Stepper value={cfg.minWithdraw} step={1} prefix="S/ " onChange={setC('minWithdraw')} /></ParamRow>
        <T.sub>Sin billetera, la pasarela cobra en cada viaje: en un viaje de S/ 3.00 son {money((3 * cfg.gatewayFeePct) / 100)} de los {money(cfg.margin.mototaxi.value)} de margen.</T.sub>
      </Card>

      <T.h2 style={{ marginTop: 20 }}>Premios</T.h2>
      <Card style={{ marginTop: 10 }}>
        <ParamRow label="Tope de premios" sub="% del margen generado"><Stepper value={cfg.rewardsCapPct} step={5} suffix="%" onChange={(v) => setConfig((c) => ({ ...c, rewardsCapPct: Math.min(50, v) }))} /></ParamRow>
        <Progress value={stats.rewards / Math.max(1, cap)} color={stats.rewards > cap * 0.9 ? C.red : C.purple} />
        <T.sub style={{ marginTop: 6, marginBottom: 12 }}>{money(stats.rewards)} de {money(cap)} permitidos. Si se supera, los vales se pausan.</T.sub>
        {cfg.driverDailyBonuses.map((b, i) => (
          <ParamRow key={b.trips} label={`Bono ${b.trips} viajes/día`}>
            <Stepper value={b.amount} step={1} prefix="S/ " onChange={(v) => setConfig((c) => ({ ...c, driverDailyBonuses: c.driverDailyBonuses.map((x, k) => (k === i ? { ...x, amount: v } : x)) }))} />
          </ParamRow>
        ))}
        <ParamRow label="Viajes para premio pasajero"><Stepper value={cfg.pointsPerReward} step={1} min={2} onChange={setC('pointsPerReward')} /></ParamRow>
        <ParamRow label="Valor máximo de un vale"><Stepper value={cfg.couponMaxValue} step={0.5} prefix="S/ " onChange={setC('couponMaxValue')} /></ParamRow>
      </Card>

      <T.h2 style={{ marginTop: 20 }}>Conductores por aprobar</T.h2>
      <Card style={{ marginTop: 10, paddingVertical: 4 }}>
        {pending.length ? pending.map((p) => (
          <View key={p.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <Row>
              <CatIcon id={p.category} size={26} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <T.h3>{p.name}</T.h3>
                <T.sub>{catById(p.category).name} · {p.plate} · {p.docs}/5 documentos · {fmtDate(p.date)}</T.sub>
              </View>
              {p.id === 'self' ? <Badge text="Tú" tone="purple" /> : null}
            </Row>
            <Row style={{ marginTop: 8 }}>
              <Btn small title="Aprobar" variant="success" style={{ flex: 1, marginRight: 6 }} onPress={() => { if (p.id === 'self') adminDecideSelf(true); else approvePending(p.id); toast(`${p.name} aprobado`, 'success'); }} />
              <Btn small title="Rechazar" variant="danger" style={{ flex: 1 }} onPress={() => { if (p.id === 'self') adminDecideSelf(false, 'Documentos ilegibles'); else approvePending(p.id); toast(`${p.name} rechazado`, 'warn'); }} />
            </Row>
          </View>
        )) : <T.sub style={{ padding: 12 }}>No hay solicitudes pendientes.</T.sub>}
      </Card>

      <T.h2 style={{ marginTop: 20 }}>Libro de movimientos</T.h2>
      <T.sub>Auditable: cada operación suma cero y nunca se borra.</T.sub>
      <Card style={{ marginTop: 10, paddingVertical: 6 }}>
        {ledger.map((m) => (
          <Row key={m.id} style={{ paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.mapBg }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '700' }} numberOfLines={1}>{m.label}</Text>
              <T.sub style={{ fontSize: 11 }}>{ACCOUNTS[m.account]} · {TYPE_LABEL[m.type]} · {fmtDate(m.date)}</T.sub>
            </View>
            <Text style={{ fontFamily: F.bold, fontSize: 13, color: m.amount > 0 ? C.green : C.text }}>{signed(m.amount)}</Text>
          </Row>
        ))}
        {state.ledger.length > 25 ? <Btn small variant="ghost" title={ledgerAll ? 'Ver menos' : `Ver los ${state.ledger.length}`} style={{ marginTop: 8 }} onPress={() => setLedgerAll(!ledgerAll)} /> : null}
      </Card>
    </Screen>
  );
}
