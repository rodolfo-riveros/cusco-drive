import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Animated, ScrollView, Modal, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C, R, shadow, money } from '../theme';

export function Screen({ children, scroll = true, style, edges = ['top'], contentStyle }) {
  const Body = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: C.bg }, style]} edges={edges}>
      <Body
        style={!scroll ? [{ flex: 1 }, contentStyle] : undefined}
        contentContainerStyle={scroll ? [{ padding: 16, paddingBottom: 40 }, contentStyle] : undefined}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </Body>
    </SafeAreaView>
  );
}

export function Header({ title, onBack, right, light }) {
  return (
    <View style={[st.header, light && { backgroundColor: 'transparent' }]}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={st.iconBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={C.navy} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40 }} />
      )}
      <Text style={st.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={{ minWidth: 40, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export function Btn({ title, onPress, variant = 'primary', icon, disabled, loading, style, small }) {
  const v = {
    primary: { bg: C.gold, fg: C.navy },
    secondary: { bg: C.navy, fg: C.white },
    danger: { bg: C.red, fg: C.white },
    success: { bg: C.green, fg: C.white },
    ghost: { bg: 'transparent', fg: C.navy, border: C.border },
    light: { bg: C.white, fg: C.navy, border: C.border },
  }[variant];
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      onPress={onPress}
      style={[
        st.btn,
        small && { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
        { backgroundColor: v.bg, borderColor: v.border || v.bg, opacity: disabled ? 0.45 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 16 : 20} color={v.fg} style={{ marginRight: 8 }} /> : null}
          <Text style={[st.btnText, { color: v.fg }, small && { fontSize: 14 }]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function Card({ children, style, onPress }) {
  const W = onPress ? TouchableOpacity : View;
  return (
    <W activeOpacity={0.85} onPress={onPress} style={[st.card, style]}>
      {children}
    </W>
  );
}

export const Row = ({ children, style }) => <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;

export const T = {
  h1: (p) => <Text {...p} style={[{ fontSize: 26, fontWeight: '800', color: C.navy }, p.style]} />,
  h2: (p) => <Text {...p} style={[{ fontSize: 20, fontWeight: '800', color: C.navy }, p.style]} />,
  h3: (p) => <Text {...p} style={[{ fontSize: 16, fontWeight: '700', color: C.text }, p.style]} />,
  p: (p) => <Text {...p} style={[{ fontSize: 15, color: C.text, lineHeight: 21 }, p.style]} />,
  sub: (p) => <Text {...p} style={[{ fontSize: 13, color: C.sub, lineHeight: 18 }, p.style]} />,
};

export function Chip({ label, emoji, active, onPress, color = C.navy, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[st.chip, active && { backgroundColor: color, borderColor: color }, style]}
    >
      {emoji ? <Text style={{ fontSize: 22, marginRight: 6 }}>{emoji}</Text> : null}
      <Text style={[st.chipText, active && { color: C.white }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Avatar({ name = '?', color = C.navy, size = 48 }) {
  const ini = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: C.white, fontWeight: '800', fontSize: size * 0.38 }}>{ini}</Text>
    </View>
  );
}

export function Stars({ value = 0, size = 16, onChange }) {
  return (
    <Row>
      {[1, 2, 3, 4, 5].map((i) => (
        <TouchableOpacity key={i} disabled={!onChange} onPress={() => onChange && onChange(i)} hitSlop={6}>
          <Ionicons name={i <= Math.round(value) ? 'star' : 'star-outline'} size={size} color={C.gold} style={{ marginHorizontal: onChange ? 4 : 1 }} />
        </TouchableOpacity>
      ))}
    </Row>
  );
}

export function Progress({ value, color = C.purple, height = 10, style }) {
  return (
    <View style={[{ height, backgroundColor: C.border, borderRadius: height, overflow: 'hidden' }, style]}>
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height, backgroundColor: color, borderRadius: height }} />
    </View>
  );
}

export function Badge({ text, color = C.navy, bg, icon }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: bg || color + '1A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' }}>
      {icon ? <Ionicons name={icon} size={13} color={color} style={{ marginRight: 4 }} /> : null}
      <Text style={{ color, fontWeight: '700', fontSize: 12 }}>{text}</Text>
    </View>
  );
}

// Guarda de textil cusqueño (decorativa)
export function AndeanBorder({ height = 10, style }) {
  const colors = [C.gold, C.red, C.navy, C.green, C.purple];
  return (
    <View style={[{ flexDirection: 'row', overflow: 'hidden', height: height + 4, alignItems: 'center' }, style]}>
      {Array.from({ length: 40 }).map((_, i) => (
        <View
          key={i}
          style={{ width: height, height, backgroundColor: colors[i % colors.length], transform: [{ rotate: '45deg' }], marginHorizontal: height * 0.25 }}
        />
      ))}
    </View>
  );
}

export function Logo({ size = 1, light }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: 120 * size, height: 70 * size, justifyContent: 'flex-end', alignItems: 'center' }}>
        <View style={[tri(46 * size, light ? '#FFFFFF' : C.navy), { position: 'absolute', left: 6 * size, bottom: 0 }]} />
        <View style={[tri(36 * size, C.gold), { position: 'absolute', right: 8 * size, bottom: 0 }]} />
        <View style={{ position: 'absolute', bottom: 0, width: 10 * size, height: 34 * size, backgroundColor: light ? C.navy : '#fff', borderRadius: 6, transform: [{ rotate: '18deg' }], borderWidth: 2 * size, borderColor: C.gold }} />
      </View>
      <Text style={{ fontSize: 34 * size, fontWeight: '900', marginTop: 6 * size, color: light ? C.white : C.navy }}>
        Cusco <Text style={{ color: C.gold }}>Drive</Text>
      </Text>
    </View>
  );
}
const tri = (h, color) => ({
  width: 0, height: 0, borderLeftWidth: h, borderRightWidth: h, borderBottomWidth: h * 1.3,
  borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color,
});

export function PriceCard({ price, discount = 0, toPay, couponTitle, categoryName }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={st.priceCard}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View>
          <T.sub style={{ color: '#C9D3EA' }}>Precio final · {categoryName}</T.sub>
          <Text style={{ fontSize: 42, fontWeight: '900', color: C.gold }}>{money(toPay ?? price.final)}</Text>
          {discount > 0 ? <Text style={{ color: '#9EE6AE', fontWeight: '700' }}>Incluye descuento de {money(discount)}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Badge text="Precio fijo" color={C.navy} bg={C.gold} icon="lock-closed" />
          <Text style={{ color: '#C9D3EA', marginTop: 8 }}>{price.km} km · ~{price.minutes} min</Text>
        </View>
      </Row>
      <TouchableOpacity onPress={() => setOpen(!open)} style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ color: C.white, fontWeight: '700' }}>{open ? 'Ocultar detalle' : 'Ver detalle del precio'}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} color={C.white} size={16} style={{ marginLeft: 4 }} />
      </TouchableOpacity>
      {open ? (
        <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#2D4A8A', paddingTop: 10 }}>
          <Line label="Tarifa del conductor" value={money(price.driverFare)} />
          {price.extras.map((e) => (
            <Line key={e.label} label={`   incluye ${e.label}`} value={money(e.amount)} small />
          ))}
          <Line label="Cargo de servicio Cusco Drive" value={money(price.commission)} />
          {discount > 0 ? <Line label={couponTitle || 'Cupón'} value={`- ${money(discount)}`} green /> : null}
          <Line label="Pagas en efectivo" value={money(toPay ?? price.final)} bold />
        </View>
      ) : null}
    </View>
  );
}

const Line = ({ label, value, bold, green, small }) => (
  <Row style={{ justifyContent: 'space-between', marginVertical: 3 }}>
    <Text style={{ color: green ? '#9EE6AE' : '#DCE4F5', fontSize: small ? 12 : 14, fontWeight: bold ? '800' : '500' }}>{label}</Text>
    <Text style={{ color: green ? '#9EE6AE' : C.white, fontSize: small ? 12 : 14, fontWeight: bold ? '800' : '600' }}>{value}</Text>
  </Row>
);

export function ReceiptLine({ label, value, bold, color }) {
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 6 }}>
      <Text style={{ color: C.sub, fontSize: 15, fontWeight: bold ? '800' : '400' }}>{label}</Text>
      <Text style={{ color: color || C.text, fontSize: bold ? 18 : 15, fontWeight: bold ? '900' : '600' }}>{value}</Text>
    </Row>
  );
}

export function BalancePill({ balance, cfg, onPress }) {
  const color = balance < cfg.minDriverBalance ? C.red : balance < cfg.lowBalanceAlert ? C.yellowWarn : C.green;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[st.balance, { borderColor: color }]}>
      <Ionicons name="wallet" size={18} color={color} />
      <Text style={{ marginLeft: 6, fontWeight: '800', color }}>{money(balance)}</Text>
    </TouchableOpacity>
  );
}

export function Empty({ emoji = '🦙', title, text, action }) {
  return (
    <View style={{ alignItems: 'center', padding: 30 }}>
      <Text style={{ fontSize: 64 }}>{emoji}</Text>
      <T.h3 style={{ marginTop: 10, textAlign: 'center' }}>{title}</T.h3>
      {text ? <T.sub style={{ textAlign: 'center', marginTop: 6 }}>{text}</T.sub> : null}
      {action ? <View style={{ marginTop: 16, alignSelf: 'stretch' }}>{action}</View> : null}
    </View>
  );
}

export function Toast({ toast }) {
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (toast) {
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true }).start();
    }
  }, [toast?.id]);
  if (!toast) return null;
  const bg = { success: C.green, error: C.red, warn: C.yellowWarn, info: C.navy }[toast.type] || C.navy;
  return (
    <Animated.View
      pointerEvents="none"
      style={[st.toast, { top: insets.top + 8, backgroundColor: bg, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }] }]}
    >
      <Text style={{ color: C.white, fontWeight: '700', fontSize: 14 }}>{toast.msg}</Text>
    </Animated.View>
  );
}

export function Sheet({ visible, onClose, title, children }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={st.backdrop} onPress={onClose} />
      <View style={st.sheet}>
        <View style={st.grabber} />
        {title ? <T.h2 style={{ marginBottom: 12 }}>{title}</T.h2> : null}
        {children}
      </View>
    </Modal>
  );
}

export function Confirm({ visible, title, text, confirmText = 'Confirmar', variant = 'primary', onConfirm, onCancel }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[st.backdrop, { justifyContent: 'center', padding: 24 }]}>
        <View style={[st.card, { padding: 22 }]}>
          <T.h2>{title}</T.h2>
          {text ? <T.p style={{ marginTop: 8, color: C.sub }}>{text}</T.p> : null}
          <Row style={{ marginTop: 20 }}>
            <Btn title="Volver" variant="ghost" onPress={onCancel} style={{ flex: 1, marginRight: 8 }} />
            <Btn title={confirmText} variant={variant} onPress={onConfirm} style={{ flex: 1 }} />
          </Row>
        </View>
      </View>
    </Modal>
  );
}

export function ListItem({ icon, iconColor = C.navy, title, sub, right, onPress, emoji }) {
  return (
    <TouchableOpacity disabled={!onPress} onPress={onPress} activeOpacity={0.7} style={st.listItem}>
      <View style={[st.listIcon, { backgroundColor: iconColor + '18' }]}>
        {emoji ? <Text style={{ fontSize: 20 }}>{emoji}</Text> : <Ionicons name={icon} size={20} color={iconColor} />}
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <T.h3 numberOfLines={1}>{title}</T.h3>
        {sub ? <T.sub numberOfLines={2}>{sub}</T.sub> : null}
      </View>
      {right !== undefined ? right : onPress ? <Ionicons name="chevron-forward" size={18} color={C.muted} /> : null}
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 8, backgroundColor: C.bg },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: C.navy },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 16, borderWidth: 1.5 },
  btnText: { fontSize: 17, fontWeight: '800' },
  card: { backgroundColor: C.white, borderRadius: R.md, padding: 16, ...shadow },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 30, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.border, marginRight: 8 },
  chipText: { fontWeight: '700', color: C.navy, fontSize: 15 },
  priceCard: { backgroundColor: C.navy, borderRadius: R.lg, padding: 18, ...shadow },
  balance: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderWidth: 2, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 30, ...shadow },
  toast: { position: 'absolute', left: 16, right: 16, padding: 14, borderRadius: 14, zIndex: 999, ...shadow, elevation: 20 },
  backdrop: { flex: 1, backgroundColor: 'rgba(10,20,45,0.45)' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 34, maxHeight: '85%' },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: C.border, alignSelf: 'center', marginBottom: 14 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  listIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
