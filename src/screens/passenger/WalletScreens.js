import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, F, money, signed } from '../../theme';
import { Btn, Card, Row, T, Text, NavyHeader, ListItem, Header, Screen, Badge } from '../../components/ui';
import { useApp } from '../../store/AppStore';
import { forAccount, heldFor, TYPE_LABEL } from '../../logic/ledger';
import { fmtDate } from '../../logic/pricing';

const MOVE_ICON = {
  recarga: ['add-circle', C.green], bono_recarga: ['gift', C.purple], retencion: ['lock-closed', C.navy],
  reembolso: ['return-down-back', C.green], liberacion: ['checkmark-circle', C.green], bono: ['trophy', C.purple],
  retiro: ['arrow-up-circle', C.red], comision_retiro: ['remove-circle', C.red], penalidad: ['alert-circle', C.goldText],
};

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

// ---------------- BILLETERA DEL PASAJERO ----------------
export function PassengerWallet({ navigation }) {
  const { state, wallets } = useApp();
  const bal = wallets.pasajero;
  const held = state.trip ? heldFor(state.ledger, state.trip.id) : 0;
  const moves = forAccount(state.ledger, 'pasajero');
  const tone = bal <= 0 ? ['red', 'Sin saldo'] : bal < 5 ? ['gold', 'Saldo bajo'] : ['green', 'Saldo disponible'];
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <NavyHeader title="Mi billetera">
        <Text style={{ color: C.navyText, marginTop: 14 }}>Saldo disponible</Text>
        <Text style={{ fontFamily: F.price, fontSize: 44, color: C.white, lineHeight: 52 }}>{money(bal)}</Text>
        <Row style={{ marginTop: 4 }}>
          <Badge text={tone[1]} tone={tone[0]} />
          <Text style={{ color: C.navyText, marginLeft: 8, fontSize: 13 }}>Alcanza para ~{Math.floor(bal / 3)} viajes en mototaxi</Text>
        </Row>
      </NavyHeader>
      <Screen edges={[]} contentStyle={{ paddingTop: 16 }}>
        {held > 0 ? (
          <Card flat style={{ backgroundColor: C.goldSoft, borderColor: C.goldSoft, marginBottom: 12 }}>
            <Row>
              <Ionicons name="lock-closed" size={18} color={C.goldText} />
              <Text style={{ color: C.goldText, fontWeight: '800', marginLeft: 8, flex: 1 }}>{money(held)} retenidos en tu viaje actual</Text>
            </Row>
          </Card>
        ) : null}
        <Btn title="Recargar saldo" icon="add" onPress={() => navigation.navigate('Recharge')} />
        <Card flat style={{ marginTop: 12 }}>
          <T.h3>¿Cómo funciona?</T.h3>
          <T.sub style={{ marginTop: 4 }}>
            1. Recargas con Yape, Plin, tarjeta o agente.{'\n'}
            2. Al pedir, el precio fijo queda retenido.{'\n'}
            3. Al llegar, confirmas y se paga al conductor. Si cancelas antes de que acepten, vuelve completo.
          </T.sub>
        </Card>
        <T.h2 style={{ marginTop: 20 }}>Movimientos</T.h2>
        <Movements list={moves} />
      </Screen>
    </View>
  );
}

// ---------------- RECARGA ----------------
const METHODS = [
  { id: 'Yape', color: '#742284', icon: 'phone-portrait' },
  { id: 'Plin', color: '#00B2A9', icon: 'phone-portrait' },
  { id: 'Tarjeta', color: C.navy, icon: 'card' },
  { id: 'Agente', color: C.goldText, icon: 'storefront' },
];

export function RechargeScreen({ navigation, route }) {
  const { state, wallets, rechargePassenger } = useApp();
  const cfg = state.config;
  const suggest = route.params?.suggest || 0;
  const firstOk = cfg.rechargeAmounts.find((a) => a >= suggest) || cfg.rechargeAmounts[cfg.rechargeAmounts.length - 1];
  const [amount, setAmount] = useState(firstOk === cfg.rechargeAmounts[0] && !suggest ? cfg.rechargeAmounts[1] : firstOk);
  const [method, setMethod] = useState('Yape');
  const [step, setStep] = useState(1);
  const [bonus, setBonus] = useState(0);
  const bonusFor = (a) => [...cfg.rechargeBonuses].sort((x, y) => y.min - x.min).find((b) => a >= b.min)?.bonus || 0;

  const pay = () => {
    setStep(2);
    setTimeout(() => {
      const r = rechargePassenger(amount, method);
      setBonus(r.bonus);
      setStep(3);
    }, 1800);
  };

  if (step === 3) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.white, padding: 24, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: C.greenSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="checkmark-circle" size={64} color={C.green} />
        </View>
        <T.h1 style={{ marginTop: 14 }}>¡Recarga exitosa!</T.h1>
        <T.p style={{ color: C.sub, marginTop: 6, textAlign: 'center' }}>Se sumaron {money(amount)} por {method}{bonus ? ` + ${money(bonus)} de bono` : ''}.</T.p>
        <Text style={{ fontFamily: F.price, fontSize: 36, color: C.navy, marginTop: 10 }}>{money(wallets.pasajero)}</Text>
        <T.sub>Nuevo saldo</T.sub>
        <Btn title={suggest ? 'Volver a mi viaje' : 'Listo'} style={{ alignSelf: 'stretch', marginTop: 24 }} onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }
  return (
    <Screen>
      <Header title="Recargar billetera" onBack={() => navigation.goBack()} />
      <Card flat style={{ alignItems: 'center' }}>
        <T.sub>Saldo actual</T.sub>
        <Text style={{ fontFamily: F.price, fontSize: 30, color: C.navy }}>{money(wallets.pasajero)}</Text>
        {suggest ? <Badge text={`Te faltan ${money(suggest)} para tu viaje`} tone="red" style={{ alignSelf: 'center', marginTop: 4 }} /> : null}
      </Card>
      <T.h3 style={{ marginTop: 18 }}>Monto</T.h3>
      <Row style={{ marginTop: 8, marginHorizontal: -4 }}>
        {cfg.rechargeAmounts.map((v) => {
          const on = amount === v;
          const b = bonusFor(v);
          return (
            <TouchableOpacity key={v} onPress={() => setAmount(v)} style={[s.amount, on && { borderColor: C.gold, backgroundColor: C.goldSoft }]}>
              <Text style={{ fontFamily: F.price, fontSize: 22, color: C.navy }}>S/ {v}</Text>
              {b ? <Text style={{ color: C.purple, fontSize: 12, fontWeight: '800' }}>+S/ {b} de bono</Text> : <Text style={{ color: C.sub, fontSize: 12 }}>~{Math.floor(v / 3)} viajes</Text>}
            </TouchableOpacity>
          );
        })}
      </Row>
      <T.sub style={{ marginTop: 6 }}>Recarga mínima {money(cfg.minRecharge)}. Recargas más grandes = menos comisiones de pasarela.</T.sub>
      <T.h3 style={{ marginTop: 18 }}>Método</T.h3>
      {METHODS.map((m) => (
        <TouchableOpacity key={m.id} onPress={() => setMethod(m.id)} style={[s.method, method === m.id && { borderColor: m.color }]}>
          <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: m.color, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={m.icon} size={22} color={C.white} />
          </View>
          <Text style={{ flex: 1, marginLeft: 12, fontSize: 16, fontWeight: '800' }}>{m.id}</Text>
          <Ionicons name={method === m.id ? 'radio-button-on' : 'radio-button-off'} size={22} color={method === m.id ? m.color : C.muted} />
        </TouchableOpacity>
      ))}
      <Card flat style={{ marginTop: 12 }}>
        <T.sub>
          {method === 'Agente'
            ? 'Acércate a un agente autorizado (bodegas del Mercado y paraderos asociados) con tu número de celular.'
            : method === 'Tarjeta'
              ? 'Pago seguro con tarjeta de débito o crédito a través de la pasarela de pagos.'
              : `Se abrirá ${method} para aprobar el pago. La pasarela confirma la recarga al instante.`}
        </T.sub>
      </Card>
      <Btn title={step === 2 ? 'Confirmando pago…' : `Recargar ${money(amount)} con ${method}`} loading={step === 2} style={{ marginTop: 18 }} onPress={pay} />
      <T.sub style={{ textAlign: 'center', marginTop: 8 }}>Demo: el pago se aprueba automáticamente.</T.sub>
    </Screen>
  );
}

const s = StyleSheet.create({
  amount: { flex: 1, marginHorizontal: 4, paddingVertical: 14, borderRadius: 16, borderWidth: 2, borderColor: C.border, backgroundColor: C.white, alignItems: 'center' },
  method: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 2, borderColor: C.border, backgroundColor: C.white, marginTop: 10 },
});
