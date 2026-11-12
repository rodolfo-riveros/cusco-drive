import React, { useEffect, useState } from 'react';
import {
  View, Text as RNText, TouchableOpacity, StyleSheet, ActivityIndicator, Animated, ScrollView, Modal, Pressable, TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Path, Polygon, Rect } from 'react-native-svg';
import { C, F, R, shadow, money } from '../theme';
import { catById } from '../data/mock';

// ---------- Tipografía ----------
const WEIGHT_FONT = { normal: F.regular, '400': F.regular, '500': F.semi, '600': F.semi, '700': F.bold, bold: F.bold, '800': F.black, '900': F.black };

/** Text con Nunito por defecto (mapea fontWeight a la variante de la fuente). */
export function Text({ style, ...p }) {
  const fl = StyleSheet.flatten(style) || {};
  const fontFamily = fl.fontFamily || WEIGHT_FONT[String(fl.fontWeight || '400')] || F.regular;
  return <RNText {...p} style={[{ color: C.text }, style, { fontFamily, fontWeight: 'normal' }]} />;
}

export const T = {
  h1: (p) => <Text {...p} style={[{ fontFamily: F.title, fontSize: 26, color: C.navy, lineHeight: 33 }, p.style]} />,
  h2: (p) => <Text {...p} style={[{ fontFamily: F.title, fontSize: 20, color: C.navy, lineHeight: 27 }, p.style]} />,
  h3: (p) => <Text {...p} style={[{ fontWeight: '800', fontSize: 16, color: C.text }, p.style]} />,
  p: (p) => <Text {...p} style={[{ fontSize: 16, color: C.text, lineHeight: 23 }, p.style]} />,
  sub: (p) => <Text {...p} style={[{ fontSize: 13, color: C.sub, lineHeight: 18 }, p.style]} />,
  price: (p) => <Text {...p} style={[{ fontFamily: F.price, fontSize: 44, color: C.navy }, p.style]} />,
  label: (p) => <Text {...p} style={[{ fontWeight: '800', fontSize: 12, color: C.sub, letterSpacing: 0.6 }, p.style]} />,
};

// ---------- Marca ----------
export function LogoMark({ size = 48, light = true }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M2 40 L18 12 L28 28 L34 20 L46 40 Z" fill={light ? '#FFFFFF' : C.navy} />
      <Path d="M18 12 L23 21 L18 19 L14 22 Z" fill={C.gold} />
      <Path d="M34 20 L38 27 L34 25.5 L31 26 Z" fill={C.gold} />
      <Path d="M21 40 C 23 35, 31 35, 28 31 C 26 28, 30 27, 33 26" stroke={C.gold} strokeWidth={3} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

export function Wordmark({ size = 20, light = true }) {
  return (
    <Text style={{ fontFamily: F.price, fontSize: size, color: light ? C.white : C.navy, letterSpacing: -0.4 }}>
      Cusco <Text style={{ fontFamily: F.price, fontSize: size, color: C.gold }}>Drive</Text>
    </Text>
  );
}

export function Logo({ size = 1, light = true }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <LogoMark size={132 * size} light={light} />
      <View style={{ marginTop: 12 * size }}><Wordmark size={38 * size} light={light} /></View>
    </View>
  );
}

/** Guarda andina: dientes dorados sobre azul (borde decorativo del diseño). */
export function AndeanBorder({ height = 10, bg = C.navy, style }) {
  const [w, setW] = useState(400);
  const n = Math.ceil(w / height) + 1;
  return (
    <View style={[{ height, backgroundColor: bg, overflow: 'hidden' }, style]} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <Svg width={w} height={height}>
        {Array.from({ length: n }).map((_, i) => (
          <Polygon key={i} points={`${i * height},0 ${(i + 1) * height},0 ${i * height + height / 2},${height / 2}`} fill={C.gold} />
        ))}
      </Svg>
    </View>
  );
}

// ---------- Iconos de categoría (Material Community Icons) ----------
const CAT_ICONS = {
  mototaxi: 'rickshaw',
  taxi: 'taxi',
  motocarga: 'truck-flatbed',
  mudanza: 'truck-delivery',
};

export function CatIcon({ id, size = 30, color }) {
  return <MaterialCommunityIcons name={CAT_ICONS[id] || CAT_ICONS.mototaxi} size={size} color={color || catById(id).text} />;
}

export function GiftIcon({ size = 18, color = C.white }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={3} y={8} width={18} height={13} rx={2} />
      <Path d="M12 8v13M3 12h18M12 8c-2-4-6-4-6-1s6 1 6 1zM12 8c2-4 6-4 6-1s-6 1-6 1z" />
    </Svg>
  );
}

// ---------- Layout ----------
export function Screen({ children, scroll = true, style, edges = ['top'], contentStyle, bg = C.bg }) {
  const Body = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: bg }, style]} edges={edges}>
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

export function Header({ title, onBack, right }) {
  return (
    <View style={st.header}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} style={st.iconBtn} hitSlop={10} accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={24} color={C.navy} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 44 }} />
      )}
      <Text style={st.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={{ minWidth: 44, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

/** Cabecera azul marino con guarda andina (Mis premios, Billetera, Bonos). */
export function NavyHeader({ title, onBack, right, children, color = C.navy }) {
  return (
    <View>
      <SafeAreaView edges={['top']} style={{ backgroundColor: color }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 22 }}>
          <Row style={{ justifyContent: 'space-between', minHeight: 44 }}>
            <Row style={{ flex: 1 }}>
              {onBack ? (
                <TouchableOpacity onPress={onBack} style={st.headerBack} accessibilityLabel="Volver">
                  <Ionicons name="arrow-back" size={22} color={C.white} />
                </TouchableOpacity>
              ) : null}
              <Text style={{ fontFamily: F.title, fontSize: 20, color: C.white }}>{title}</Text>
            </Row>
            {right}
          </Row>
          {children}
        </View>
      </SafeAreaView>
      <AndeanBorder bg={color} />
    </View>
  );
}

export const Row = ({ children, style }) => <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;

export function Btn({ title, onPress, variant = 'primary', icon, disabled, loading, style, small, textStyle }) {
  const v = {
    primary: { bg: C.gold, fg: C.navy },
    secondary: { bg: C.navy, fg: C.white },
    danger: { bg: C.red, fg: C.white },
    dangerOutline: { bg: C.white, fg: '#B71C1C', border: C.red },
    success: { bg: C.green, fg: C.white },
    ghost: { bg: 'transparent', fg: C.navy, border: C.line },
    light: { bg: C.white, fg: C.navy, border: C.line },
    purple: { bg: C.purple, fg: C.white },
  }[variant];
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      disabled={disabled || loading}
      onPress={onPress}
      accessibilityRole="button"
      style={[
        st.btn,
        small && { height: 44, paddingHorizontal: 14, borderRadius: 12 },
        { backgroundColor: v.bg, borderColor: v.border || v.bg, opacity: disabled ? 0.45 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={small ? 16 : 20} color={v.fg} style={{ marginRight: 8 }} /> : null}
          <Text style={[st.btnText, { color: v.fg }, small && { fontSize: 14 }, textStyle]} numberOfLines={1}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function Card({ children, style, onPress, flat }) {
  const W = onPress ? TouchableOpacity : View;
  return (
    <W activeOpacity={0.85} onPress={onPress} style={[st.card, flat && st.flat, style]}>
      {children}
    </W>
  );
}

/** Panel inferior blanco con agarradera (estilo del diseño). */
export function BottomPanel({ children, style }) {
  return (
    <View style={[st.panel, style]}>
      <View style={st.grabber} />
      {children}
    </View>
  );
}

export function Chip({ label, active, onPress, color = C.navy, style, icon }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[st.chip, active && { backgroundColor: color, borderColor: color }, style]}>
      {icon ? <Ionicons name={icon} size={15} color={active ? C.white : C.navy} style={{ marginRight: 6 }} /> : null}
      <Text style={[st.chipText, active && { color: C.white }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Avatar({ name = '?', size = 48, bg = C.navySoft, color = C.navy }) {
  const ini = name.split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontFamily: F.title, fontSize: size * 0.34 }}>{ini}</Text>
    </View>
  );
}

export function Stars({ value = 0, size = 16, onChange }) {
  return (
    <Row>
      {[1, 2, 3, 4, 5].map((i) => (
        <TouchableOpacity key={i} disabled={!onChange} onPress={() => onChange && onChange(i)} hitSlop={6} accessibilityLabel={`${i} estrellas`}>
          <Ionicons name={i <= Math.round(value) ? 'star' : 'star-outline'} size={size} color={C.gold} style={{ marginHorizontal: onChange ? 4 : 1 }} />
        </TouchableOpacity>
      ))}
    </Row>
  );
}

export function Progress({ value, color = C.purple, track = C.purpleTrack, height = 8, style }) {
  return (
    <View style={[{ height, backgroundColor: track, borderRadius: height, overflow: 'hidden' }, style]}>
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height, backgroundColor: color, borderRadius: height }} />
    </View>
  );
}

const TONES = {
  green: [C.greenSoft, C.greenText],
  gold: [C.goldSoft, C.goldText],
  red: [C.redSoft, C.redText],
  navy: [C.navySoft, C.navy],
  purple: [C.purpleSoft, C.purpleText],
  grey: [C.bg, C.sub],
};
export function Badge({ text, tone = 'navy', icon, style }) {
  const [bg, fg] = TONES[tone] || TONES.navy;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, alignSelf: 'flex-start' }, style]}>
      {icon ? <Ionicons name={icon} size={12} color={fg} style={{ marginRight: 4 }} /> : null}
      <Text style={{ color: fg, fontWeight: '800', fontSize: 12 }}>{text}</Text>
    </View>
  );
}

/** Pasos del viaje: Buscando › En camino › En curso › Listo */
export function StepPills({ steps, index, style, dark }) {
  return (
    <Row style={[{ flexWrap: 'wrap' }, style]}>
      {steps.map((s, i) => {
        const done = i < index;
        const cur = i === index;
        const bg = cur ? (dark ? C.white : C.navy) : done ? (dark ? 'rgba(255,255,255,0.2)' : C.greenSoft) : dark ? 'rgba(255,255,255,0.2)' : C.bg;
        const fg = cur ? (dark ? C.greenText : C.white) : done ? (dark ? C.white : C.greenText) : dark ? C.white : C.sub;
        return (
          <Row key={s}>
            <View style={{ paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: bg }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: fg }}>{s}</Text>
            </View>
            {i < steps.length - 1 ? <Text style={{ marginHorizontal: 5, color: dark ? C.white : C.sub, fontWeight: '800', fontSize: 11 }}>›</Text> : null}
          </Row>
        );
      })}
    </Row>
  );
}

/** Recojo (círculo azul) → destino (cuadro dorado). */
export function RouteDots({ origin, dest, originSub, destSub, labels = true, style }) {
  return (
    <Row style={[{ alignItems: 'stretch' }, style]}>
      <View style={{ alignItems: 'center', paddingTop: labels ? 20 : 6, width: 14 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.navy }} />
        <View style={{ width: 2, flex: 1, minHeight: 22, backgroundColor: C.line, marginVertical: 4 }} />
        <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: C.gold, marginBottom: labels ? 6 : 6 }} />
      </View>
      <View style={{ flex: 1, marginLeft: 10 }}>
        <View>
          {labels ? <T.sub style={{ fontSize: 12 }}>Recojo</T.sub> : null}
          <Text style={{ fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{origin}</Text>
          {originSub ? <T.sub>{originSub}</T.sub> : null}
        </View>
        <View style={{ marginTop: 10 }}>
          {labels ? <T.sub style={{ fontSize: 12 }}>Destino</T.sub> : null}
          <Text style={{ fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{dest}</Text>
          {destSub ? <T.sub>{destSub}</T.sub> : null}
        </View>
      </View>
    </Row>
  );
}

/** Tarjeta azul de precio fijo (P2). */
export function PriceCard({ price, discount = 0, toPay, couponTitle, balance }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={st.priceCard}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Text style={{ fontSize: 13, color: C.navyText }}>Precio fijo · no cambia</Text>
          <Text style={{ fontFamily: F.price, fontSize: 44, color: C.gold, lineHeight: 50 }}>{money(toPay ?? price.final)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', paddingBottom: 6 }}>
          <Row>
            <Ionicons name="wallet-outline" size={18} color={C.white} />
            <Text style={{ color: C.white, fontWeight: '800', marginLeft: 6 }}>Billetera</Text>
          </Row>
          {balance !== undefined ? <Text style={{ color: C.navyText, fontSize: 12, marginTop: 2 }}>Saldo {money(balance)}</Text> : null}
        </View>
      </Row>
      {discount > 0 ? <Text style={{ color: '#9EE6AE', fontWeight: '800', fontSize: 13 }}>Antes {money(price.final)} · ahorras {money(discount)}</Text> : null}
      <TouchableOpacity onPress={() => setOpen(!open)} style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center' }}>
        <Ionicons name={open ? 'caret-down' : 'caret-forward'} color={C.navyText} size={12} />
        <Text style={{ color: C.navyText, fontWeight: '700', fontSize: 13, marginLeft: 4 }}>Ver detalle</Text>
      </TouchableOpacity>
      {open ? (
        <View style={{ marginTop: 6 }}>
          <Line label="Tarifa del conductor" value={money(price.driverFare)} />
          {price.extras.map((e) => (
            <Line key={e.label} label={`   incluye ${e.label}`} value={money(e.amount)} small />
          ))}
          <Line label="Servicio Cusco Drive" value={money(price.margin)} />
          {discount > 0 ? <Line label={couponTitle || 'Vale'} value={`− ${money(discount)}`} green /> : null}
          <Line label="Se descuenta de tu billetera al pedir" value={money(toPay ?? price.final)} bold />
          <Text style={{ color: C.navyText, fontSize: 12, marginTop: 6, lineHeight: 17 }}>
            Tu pago queda retenido y se libera al conductor recién cuando llegas a tu destino.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const Line = ({ label, value, bold, green, small }) => (
  <Row style={{ justifyContent: 'space-between', marginVertical: 2 }}>
    <Text style={{ color: green ? '#9EE6AE' : C.navyText, fontSize: small ? 12 : 13, fontWeight: bold ? '800' : '400', flex: 1 }}>{label}</Text>
    <Text style={{ color: green ? '#9EE6AE' : C.white, fontSize: small ? 12 : 13, fontWeight: bold ? '800' : '700' }}>{value}</Text>
  </Row>
);

export function ReceiptLine({ label, value, bold, color, sub }) {
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: 5 }}>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={{ color: bold ? C.text : C.sub, fontSize: 15, fontWeight: bold ? '800' : '400' }}>{label}</Text>
        {sub ? <T.sub style={{ fontSize: 12 }}>{sub}</T.sub> : null}
      </View>
      <Text style={{ color: color || C.text, fontSize: bold ? 18 : 15, fontFamily: bold ? F.price : F.bold }}>{value}</Text>
    </Row>
  );
}

/** Píldora de saldo: verde (bien), dorado (bajo), rojo (sin saldo). */
export function WalletPill({ balance, low = 5, onPress, label = 'Saldo', style }) {
  const [bg, fg] = balance <= 0 ? [C.red, C.white] : balance < low ? [C.gold, C.navy] : [C.green, C.white];
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[{ alignItems: 'flex-end', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: bg, ...shadow }, style]}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: fg }}>{label}</Text>
      <Text style={{ fontFamily: F.price, fontSize: 18, color: fg, lineHeight: 22 }}>{money(balance)}</Text>
    </TouchableOpacity>
  );
}

export function StatusTile({ tone = 'green', text }) {
  const [bg, fg] = TONES[tone];
  return (
    <View style={{ flex: 1, borderRadius: 12, padding: 10, backgroundColor: bg }}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: '800' }}>{text}</Text>
    </View>
  );
}

export function Empty({ emoji = '🦙', title, text, action }) {
  return (
    <View style={{ alignItems: 'center', padding: 30 }}>
      <Text style={{ fontSize: 60 }}>{emoji}</Text>
      <T.h3 style={{ marginTop: 10, textAlign: 'center' }}>{title}</T.h3>
      {text ? <T.sub style={{ textAlign: 'center', marginTop: 6 }}>{text}</T.sub> : null}
      {action ? <View style={{ marginTop: 16, alignSelf: 'stretch' }}>{action}</View> : null}
    </View>
  );
}

export function Toast({ toast }) {
  const insets = useSafeAreaInsets();
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (toast) {
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true }).start();
    }
  }, [toast?.id]);
  if (!toast) return null;
  const bg = { success: C.green, error: C.red, warn: C.goldText, info: C.navy }[toast.type] || C.navy;
  return (
    <Animated.View
      pointerEvents="none"
      style={[st.toast, { top: insets.top + 8, backgroundColor: bg, opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }] }]}
    >
      <Text style={{ color: C.white, fontWeight: '800', fontSize: 14 }}>{toast.msg}</Text>
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

export function ListItem({ icon, iconColor = C.navy, iconBg, title, sub, right, onPress, emoji, node }) {
  return (
    <TouchableOpacity disabled={!onPress} onPress={onPress} activeOpacity={0.7} style={st.listItem}>
      <View style={[st.listIcon, { backgroundColor: iconBg || iconColor + '18' }]}>
        {node || (emoji ? <Text style={{ fontSize: 20 }}>{emoji}</Text> : <Ionicons name={icon} size={19} color={iconColor} />)}
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontWeight: '800', fontSize: 15 }} numberOfLines={1}>{title}</Text>
        {sub ? <T.sub numberOfLines={2}>{sub}</T.sub> : null}
      </View>
      {right !== undefined ? right : onPress ? <Ionicons name="chevron-forward" size={18} color={C.muted} /> : null}
    </TouchableOpacity>
  );
}

export function Input(props) {
  return <TextInput placeholderTextColor={C.muted} {...props} style={[st.input, props.style]} />;
}

export const Divider = ({ style }) => <View style={[{ height: 1, backgroundColor: C.mapBg, marginVertical: 8 }, style]} />;

export const RoundBtn = ({ icon, onPress, style, color = C.navy, label }) => (
  <TouchableOpacity onPress={onPress} style={[st.roundBtn, style]} accessibilityLabel={label}>
    <Ionicons name={icon} size={22} color={color} />
  </TouchableOpacity>
);

export const SosBtn = ({ onPress, style }) => (
  <TouchableOpacity onPress={onPress} style={[st.sos, style]} accessibilityLabel="SOS">
    <Text style={{ color: C.white, fontFamily: F.price, fontSize: 14 }}>SOS</Text>
  </TouchableOpacity>
);

export const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 6 },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: F.title, fontSize: 18, color: C.navy },
  headerBack: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 56, paddingHorizontal: 20, borderRadius: 16, borderWidth: 2 },
  btnText: { fontFamily: F.title, fontSize: 17 },
  card: { backgroundColor: C.white, borderRadius: R.md, padding: 16, ...shadow },
  flat: { shadowOpacity: 0, elevation: 0, borderWidth: 1, borderColor: C.border },
  panel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 18, ...shadow, shadowOffset: { width: 0, height: -8 }, elevation: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 40, borderRadius: 999, backgroundColor: C.white, borderWidth: 1.5, borderColor: C.line, marginRight: 8 },
  chipText: { fontWeight: '800', color: C.navy, fontSize: 13 },
  priceCard: { backgroundColor: C.navy, borderRadius: 18, paddingVertical: 16, paddingHorizontal: 18 },
  toast: { position: 'absolute', left: 16, right: 16, padding: 14, borderRadius: 14, zIndex: 999, ...shadow, elevation: 20 },
  backdrop: { flex: 1, backgroundColor: 'rgba(11,26,61,0.45)' },
  sheet: { backgroundColor: C.white, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, paddingBottom: 34, maxHeight: '88%' },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: C.line, alignSelf: 'center', marginBottom: 12 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  listIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  input: { backgroundColor: C.white, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: C.text, fontFamily: F.bold },
  roundBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', ...shadow },
  sos: { backgroundColor: C.red, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', ...shadow },
});
