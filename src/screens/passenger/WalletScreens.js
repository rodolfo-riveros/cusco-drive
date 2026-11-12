import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, F, money, signed } from '../../theme';
import { Card, Row, T, Text, NavyHeader, ListItem, Screen, Badge, CatIcon } from '../../components/ui';
import { useApp } from '../../store/AppStore';
import { TYPE_LABEL } from '../../logic/ledger';
import { fmtDate } from '../../logic/pricing';
import { catById } from '../../data/mock';

const MOVE_ICON = {
  recarga: ['add-circle', C.green], bono_recarga: ['gift', C.purple], retencion: ['lock-closed', C.navy],
  reembolso: ['return-down-back', C.green], liberacion: ['checkmark-circle', C.green], bono: ['trophy', C.purple],
  retiro: ['arrow-up-circle', C.red], comision_retiro: ['remove-circle', C.red], penalidad: ['alert-circle', C.goldText],
};

/** Lista de movimientos del libro (la usa la billetera del conductor). */
export function Movements({ list }) {
  return (
    <Card style={{ marginTop: 10, paddingVertical: 4 }}>
      {list.length ? list.map((m) => {
        const [icon, color] = MOVE_ICON[m.type] || ['ellipse', C.sub];
        return (
          <ListItem
            key={m.id}
            icon={icon}
            iconColor={color}
            title={m.label}
            sub={`${TYPE_LABEL[m.type] || m.type} · ${fmtDate(m.date)}`}
            right={<Text style={{ fontFamily: F.title, fontSize: 15, color: m.amount > 0 ? C.green : C.text }}>{signed(m.amount)}</Text>}
          />
        );
      }) : <T.sub style={{ padding: 12 }}>Aún no hay movimientos.</T.sub>}
    </Card>
  );
}

const PAY_COLOR = { Yape: '#742284', Plin: '#00B2A9' };
const ST = {
  completed: ['Pagado al conductor', 'green'],
  cancelled: ['Devuelto', 'navy'],
  refunded: ['Devuelto', 'navy'],
  disputed: ['Retenido · en revisión', 'gold'],
};

// ---------------- HISTORIAL DE PAGOS DEL PASAJERO (sin billetera) ----------------
export function PaymentsScreen({ navigation }) {
  const { state } = useApp();
  const h = state.passenger.history;
  const month = new Date().getMonth();
  const thisMonth = h.filter((t) => new Date(t.date).getMonth() === month);
  const spent = thisMonth.reduce((a, t) => a + (t.status === 'completed' ? t.paid : 0), 0);
  const refunded = thisMonth.reduce((a, t) => a + (t.refund || 0), 0);
  const saved = thisMonth.reduce((a, t) => a + (t.status === 'completed' ? t.discount || 0 : 0), 0);
  const active = state.trip && ['searching', 'assigned', 'arrived', 'ongoing', 'atDestination'].includes(state.trip.status) ? state.trip : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <NavyHeader title="Mis pagos">
        <Text style={{ color: C.navyText, marginTop: 14 }}>Pagado este mes con Yape / Plin</Text>
        <Text style={{ fontFamily: F.price, fontSize: 42, color: C.white, lineHeight: 50 }}>{money(spent)}</Text>
        <Row style={{ marginTop: 4 }}>
          <Badge text={`${thisMonth.filter((t) => t.status === 'completed').length} viajes`} tone="gold" />
          {saved ? <Badge text={`Ahorraste ${money(saved)}`} tone="purple" style={{ marginLeft: 6 }} /> : null}
          {refunded ? <Badge text={`Devuelto ${money(refunded)}`} tone="green" style={{ marginLeft: 6 }} /> : null}
        </Row>
      </NavyHeader>
      <Screen edges={[]} contentStyle={{ paddingTop: 16 }}>
        {active ? (
          <Card flat style={{ backgroundColor: C.goldSoft, borderColor: C.goldSoft, marginBottom: 12 }} onPress={() => navigation.navigate('TripFlow')}>
            <Row>
              <Ionicons name="lock-closed" size={18} color={C.goldText} />
              <Text style={{ color: C.goldText, fontWeight: '800', marginLeft: 8, flex: 1 }}>{money(active.toPay)} de tu {active.method} retenidos en el viaje actual</Text>
              <Ionicons name="chevron-forward" size={18} color={C.goldText} />
            </Row>
          </Card>
        ) : null}
        <Card flat>
          <T.h3>Sin recargas, sin efectivo</T.h3>
          <T.sub style={{ marginTop: 4 }}>
            Pagas cada viaje con Yape o Plin al pedirlo. Cusco Drive retiene el pago y recién se lo da al conductor cuando llegas. Si cancelas antes de que acepten o hay un problema, te lo devolvemos al mismo Yape/Plin.
          </T.sub>
        </Card>
        <T.h2 style={{ marginTop: 20 }}>Historial</T.h2>
        <Card style={{ marginTop: 10, paddingVertical: 4 }}>
          {h.map((t) => {
            const [label, tone] = ST[t.status] || ST.completed;
            const amount = t.status === 'completed' || t.status === 'disputed' ? t.paid : t.refund ? t.refund : t.paid;
            return (
              <ListItem
                key={t.id}
                node={<CatIcon id={t.category} size={22} />}
                iconBg={catById(t.category).soft}
                title={`${t.origin} → ${t.dest}`}
                sub={`${fmtDate(t.date)} · ${t.method || 'Yape'}${t.km ? ` · ${t.km} km` : ''}`}
                onPress={() => navigation.navigate('TripDetail', { id: t.id })}
                right={
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontFamily: F.title, fontSize: 15, color: t.status === 'cancelled' || t.status === 'refunded' ? C.green : C.navy }}>
                      {t.status === 'cancelled' || t.status === 'refunded' ? '+' : '−'}{money(amount)}
                    </Text>
                    <Badge text={label} tone={tone} style={{ marginTop: 2 }} />
                  </View>
                }
              />
            );
          })}
        </Card>
        <Row style={{ marginTop: 12, justifyContent: 'center' }}>
          {['Yape', 'Plin'].map((m) => (
            <View key={m} style={{ backgroundColor: PAY_COLOR[m], borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, marginHorizontal: 4 }}>
              <Text style={{ color: C.white, fontWeight: '800', fontSize: 12 }}>{m}</Text>
            </View>
          ))}
        </Row>
      </Screen>
    </View>
  );
}
