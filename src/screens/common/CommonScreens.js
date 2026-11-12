import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, TouchableOpacity, FlatList, useWindowDimensions, Animated, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { currentPosition, placeName } from '../../logic/geo';
import { C, F, shadow } from '../../theme';
import { Btn, Logo, LogoMark, Wordmark, AndeanBorder, T, Row, Card, Text, CatIcon } from '../../components/ui';
import { ONBOARDING, CATEGORIES } from '../../data/mock';
import { useApp } from '../../store/AppStore';

// ---------------- 01 · SPLASH ----------------
export function SplashScreen({ navigation }) {
  const { state } = useApp();
  const [fade] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    const t = setTimeout(() => navigation.replace(state.onboarded ? 'Login' : 'Onboarding'), 1900);
    return () => clearTimeout(t);
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ opacity: fade, transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }], alignItems: 'center' }}>
          <Logo />
          <Text style={{ color: C.navyText, marginTop: 14, fontSize: 16, textAlign: 'center', width: 240, lineHeight: 22 }}>Conectando personas, uniendo destinos.</Text>
        </Animated.View>
      </View>
      <View style={{ alignItems: 'center', paddingBottom: 40 }}>
        <Row>
          {[C.gold, '#5A6C99', '#5A6C99'].map((c, i) => <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c, marginHorizontal: 4 }} />)}
        </Row>
        <Text style={{ color: C.navyText, marginTop: 14, fontSize: 13 }}>Transporte inteligente en Urubamba</Text>
      </View>
      <AndeanBorder height={14} bg={C.navyDeep} />
    </View>
  );
}

// ---------------- 02 · ONBOARDING ----------------
const Mountains = ({ w, h }) => (
  <Svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0 }}>
    <Path d={`M0 ${h * 0.76} L${w * 0.22} ${h * 0.5} L${w * 0.38} ${h * 0.66} L${w * 0.54} ${h * 0.41} L${w * 0.77} ${h * 0.68} L${w} ${h * 0.53} L${w} ${h} L0 ${h} Z`} fill={C.navy} opacity={0.12} />
    <Path d={`M${w * 0.13} ${h} C ${w * 0.29} ${h * 0.88}, ${w * 0.64} ${h * 0.91}, ${w * 0.51} ${h * 0.79} C ${w * 0.42} ${h * 0.7}, ${w * 0.67} ${h * 0.68}, ${w * 0.83} ${h * 0.63}`} stroke={C.gold} strokeWidth={10} fill="none" strokeLinecap="round" opacity={0.6} />
  </Svg>
);

function OnbArt({ k, w }) {
  const h = 320;
  let inner;
  if (k === 'precio') {
    inner = (
      <View style={[{ backgroundColor: C.white, borderRadius: 22, paddingVertical: 22, paddingHorizontal: 22, alignItems: 'center', width: 210 }, shadow]}>
        <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: C.goldSoft }}>
          <Text style={{ color: C.goldText, fontWeight: '800', fontSize: 12 }}>Mototaxi · Centro → Mercado</Text>
        </View>
        <Text style={{ fontFamily: F.price, fontSize: 48, color: C.navy, marginTop: 4 }}>S/ 3.00</Text>
        <T.sub>Precio fijo · pagas con billetera</T.sub>
      </View>
    );
  } else if (k === 'billetera') {
    inner = (
      <View style={[{ backgroundColor: C.white, borderRadius: 22, padding: 18, width: 230 }, shadow]}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T.sub>Mi billetera</T.sub>
          <Ionicons name="shield-checkmark" size={18} color={C.green} />
        </Row>
        <Text style={{ fontFamily: F.price, fontSize: 34, color: C.navy }}>S/ 27.00</Text>
        <Row style={{ marginTop: 8 }}>
          <View style={{ flex: 1, backgroundColor: '#742284', borderRadius: 10, padding: 8, marginRight: 6, alignItems: 'center' }}><Text style={{ color: C.white, fontWeight: '800' }}>Yape</Text></View>
          <View style={{ flex: 1, backgroundColor: '#00B2A9', borderRadius: 10, padding: 8, alignItems: 'center' }}><Text style={{ color: C.white, fontWeight: '800' }}>Plin</Text></View>
        </Row>
        <View style={{ marginTop: 10, backgroundColor: C.greenSoft, borderRadius: 10, padding: 8 }}>
          <Text style={{ color: C.greenText, fontWeight: '800', fontSize: 12 }}>🔒 S/ 3.00 retenido hasta que llegues</Text>
        </View>
      </View>
    );
  } else {
    inner = (
      <View style={[{ backgroundColor: C.white, borderRadius: 22, padding: 16, width: 240 }, shadow]}>
        <Text style={{ fontFamily: F.title, fontSize: 16, color: C.navy, marginBottom: 10 }}>¿A dónde vas?</Text>
        <Row style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {CATEGORIES.map((c) => (
            <View key={c.id} style={{ width: '48%', marginBottom: 8, borderRadius: 14, backgroundColor: c.soft, padding: 8, alignItems: 'center' }}>
              <CatIcon id={c.id} size={28} />
              <Text style={{ color: c.text, fontWeight: '800', fontSize: 12 }}>{c.name}</Text>
            </View>
          ))}
        </Row>
      </View>
    );
  }
  return (
    <View style={{ height: h, borderRadius: 28, backgroundColor: C.goldSoft, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <Mountains w={w} h={h} />
      {inner}
    </View>
  );
}

export function OnboardingScreen({ navigation }) {
  const { completeOnboarding } = useApp();
  const { width } = useWindowDimensions();
  const W = Math.min(width, 520);
  const [i, setI] = useState(0);
  const ref = useRef(null);
  const done = () => { completeOnboarding(); navigation.replace('Login'); };
  const next = () => {
    if (i < ONBOARDING.length - 1) {
      ref.current?.scrollToIndex({ index: i + 1 });
      setI(i + 1);
    } else done();
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.white, alignItems: 'center' }}>
      <View style={{ flex: 1, width: W }}>
        <Row style={{ justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 4 }}>
          <TouchableOpacity onPress={done} style={{ padding: 12 }}>
            <Text style={{ fontWeight: '800', fontSize: 15, color: C.navy }}>Saltar</Text>
          </TouchableOpacity>
        </Row>
        <FlatList
          ref={ref}
          data={ONBOARDING}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(x) => x.key}
          getItemLayout={(_, index) => ({ length: W, offset: W * index, index })}
          onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / W))}
          renderItem={({ item }) => (
            <View style={{ width: W, paddingHorizontal: 24 }}>
              <OnbArt k={item.key} w={W - 48} />
              <Row style={{ justifyContent: 'center', marginTop: 26 }}>
                {ONBOARDING.map((o, k) => (
                  <View key={o.key} style={{ width: k === i ? 24 : 8, height: 8, borderRadius: 4, backgroundColor: k === i ? C.navy : C.line, marginHorizontal: 4 }} />
                ))}
              </Row>
              <T.h1 style={{ textAlign: 'center', marginTop: 20 }}>{item.title}</T.h1>
              <T.p style={{ textAlign: 'center', marginTop: 12, color: C.sub, paddingHorizontal: 8 }}>{item.text}</T.p>
            </View>
          )}
        />
        <View style={{ padding: 24, paddingBottom: 30 }}>
          <Btn title={i === ONBOARDING.length - 1 ? 'Empezar' : 'Siguiente'} onPress={next} />
        </View>
      </View>
    </SafeAreaView>
  );
}

// ---------------- 03 · LOGIN CON CELULAR ----------------
const RoleBtn = ({ on, onPress, label, icon }) => (
  <TouchableOpacity
    onPress={onPress}
    style={{ flex: 1, borderWidth: 2, borderColor: on ? C.navy : C.border, backgroundColor: on ? C.navySoft : C.white, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginHorizontal: 5 }}
  >
    <Ionicons name={icon} size={28} color={on ? C.navy : C.text} />
    <Text style={{ fontWeight: '800', fontSize: 15, color: on ? C.navy : C.text, marginTop: 6, textAlign: 'center' }}>{label}</Text>
  </TouchableOpacity>
);

export function LoginScreen({ navigation, route }) {
  const { login, state } = useApp();
  const [role, setRole] = useState(route.params?.role || 'passenger');
  const [phone, setPhone] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [secs, setSecs] = useState(45);
  const codeRef = useRef(null);

  useEffect(() => {
    if (!sent || secs <= 0) return;
    const t = setTimeout(() => setSecs(secs - 1), 1000);
    return () => clearTimeout(t);
  }, [sent, secs]);

  const send = () => {
    if (!/^9\d{8}$/.test(phone)) return setError('Ingresa un celular válido de 9 dígitos que empiece con 9');
    setError('');
    setLoading(true);
    setTimeout(() => { setLoading(false); setSent(true); setSecs(45); setTimeout(() => codeRef.current?.focus(), 100); }, 900);
  };
  const verify = () => {
    if (code.length !== 4) return setError('El código tiene 4 dígitos');
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      login(phone, role);
      if (role === 'passenger') navigation.reset({ index: 0, routes: [{ name: 'Permissions' }] });
      else navigation.reset({ index: 0, routes: [{ name: state.driver.status === 'approved' ? 'DriverTabs' : state.driver.status === 'none' ? 'DriverRegister' : 'DriverStatus' }] });
    }, 800);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.white }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: C.navy }}>
        <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 }}>
          <Row>
            <LogoMark size={36} />
            <View style={{ marginLeft: 10 }}><Wordmark size={20} /></View>
          </Row>
          <Text style={{ fontFamily: F.title, fontSize: 24, color: C.white, marginTop: 18 }}>¡Bienvenido!</Text>
          <Text style={{ fontSize: 15, color: C.navyText }}>¿Cómo quieres usar la app?</Text>
        </View>
      </SafeAreaView>
      <AndeanBorder />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 30, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <Row style={{ marginHorizontal: -5 }}>
          <RoleBtn on={role === 'passenger'} onPress={() => setRole('passenger')} label="Quiero viajar" icon="person-outline" />
          <RoleBtn on={role === 'driver'} onPress={() => setRole('driver')} label="Quiero ser conductor" icon="car-sport-outline" />
        </Row>

        <Text style={{ fontWeight: '800', fontSize: 14, marginTop: 22, marginBottom: 8 }}>Número de celular</Text>
        <Row>
          <View style={{ height: 54, paddingHorizontal: 14, borderWidth: 1.5, borderColor: C.line, borderRadius: 14, justifyContent: 'center', marginRight: 8 }}>
            <Text style={{ fontWeight: '800', fontSize: 16 }}>+51</Text>
          </View>
          <TextInput
            value={phone}
            onChangeText={(t) => { setPhone(t.replace(/\D/g, '').slice(0, 9)); setSent(false); setCode(''); }}
            keyboardType="phone-pad"
            placeholder="987 654 321"
            placeholderTextColor={C.muted}
            style={{ flex: 1, height: 54, borderWidth: 1.5, borderColor: phone ? C.navy : C.line, borderRadius: 14, paddingHorizontal: 14, fontSize: 18, fontFamily: F.bold, color: C.text }}
          />
        </Row>
        {!sent ? (
          <TouchableOpacity onPress={() => setPhone('987654321')} style={{ marginTop: 10 }}>
            <Text style={{ color: C.navy2, fontWeight: '700' }}>Usar número demo (987 654 321)</Text>
          </TouchableOpacity>
        ) : null}

        {sent ? (
          <>
            <Text style={{ fontWeight: '800', fontSize: 14, marginTop: 20, marginBottom: 8 }}>Código que te enviamos</Text>
            <TouchableOpacity activeOpacity={1} onPress={() => codeRef.current?.focus()}>
              <Row>
                {[0, 1, 2, 3].map((k) => {
                  const filled = !!code[k];
                  const cur = k === code.length;
                  return (
                    <View key={k} style={{ width: 54, height: 60, borderRadius: 14, borderWidth: 1.5, borderColor: filled ? C.navy : cur ? C.gold : C.line, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                      <Text style={{ fontFamily: F.title, fontSize: 24, color: C.navy }}>{code[k] || ''}</Text>
                    </View>
                  );
                })}
              </Row>
            </TouchableOpacity>
            <TextInput
              ref={codeRef}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 4))}
              keyboardType="number-pad"
              autoFocus
              style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
            />
            <Text style={{ fontSize: 14, color: C.sub, marginTop: 10 }}>
              Enviado por SMS al +51 {phone}. {secs > 0 ? `Reenviar en 0:${String(secs).padStart(2, '0')}` : ''}
            </Text>
            {secs <= 0 ? (
              <TouchableOpacity onPress={() => setSecs(45)}><Text style={{ fontWeight: '800', color: C.navy, marginTop: 4 }}>Recibir por WhatsApp</Text></TouchableOpacity>
            ) : null}
            <T.sub style={{ marginTop: 6 }}>Demo: escribe cualquier código de 4 dígitos (ej. 4821).</T.sub>
          </>
        ) : null}
        {error ? <Text style={{ color: C.red, marginTop: 10, fontWeight: '700' }}>{error}</Text> : null}

        <View style={{ flex: 1, minHeight: 24 }} />
        <Btn title={sent ? 'Continuar' : 'Enviar código'} onPress={sent ? verify : send} loading={loading} />
        <Text style={{ fontSize: 12, color: C.sub, textAlign: 'center', marginTop: 12, lineHeight: 18 }}>
          Al continuar aceptas los Términos y la Política de Privacidad (Ley N.º 29733).
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Admin')} style={{ alignItems: 'center', marginTop: 14 }}>
          <Row>
            <Ionicons name="settings-outline" size={14} color={C.sub} />
            <Text style={{ color: C.sub, marginLeft: 6, fontWeight: '700', fontSize: 13 }}>Panel administrador (demo)</Text>
          </Row>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export function PermissionsScreen({ navigation }) {
  const { setHere, toast } = useApp();
  const [loading, setLoading] = useState(false);
  const go = () => navigation.reset({ index: 0, routes: [{ name: 'PassengerTabs' }] });
  const ask = async () => {
    setLoading(true);
    try {
      const p = await currentPosition();
      const nm = await placeName(p);
      setHere({ latitude: p.latitude, longitude: p.longitude, ...nm }, 'gps');
      toast(`Te ubicamos en: ${nm.name}`, 'success');
    } catch {
      toast('No pudimos leer tu GPS. Puedes tocar el mapa para marcar tu punto.', 'warn');
      // en web o sin permisos seguimos con la posición simulada
    }
    setLoading(false);
    go();
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.white, padding: 24, justifyContent: 'center' }}>
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: 150, height: 150, borderRadius: 75, backgroundColor: C.goldSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="location" size={72} color={C.gold} />
        </View>
        <T.h1 style={{ marginTop: 24, textAlign: 'center' }}>Activa tu ubicación</T.h1>
        <T.p style={{ textAlign: 'center', color: C.sub, marginTop: 10 }}>
          La usamos para que el conductor te encuentre rápido y para calcular tu precio fijo. Solo mientras usas la app.
        </T.p>
      </View>
      <Card flat style={{ marginTop: 26 }}>
        <Row><Ionicons name="navigate" size={20} color={C.navy} /><T.p style={{ marginLeft: 10, flex: 1 }}>Ubicación: para pedir y seguir tu viaje</T.p></Row>
        <Row style={{ marginTop: 12 }}><Ionicons name="notifications" size={20} color={C.navy} /><T.p style={{ marginLeft: 10, flex: 1 }}>Notificaciones: te avisamos cuando llega tu conductor</T.p></Row>
      </Card>
      <T.sub style={{ marginTop: 12, textAlign: 'center' }}>Si no das permiso, empiezas en la Plaza de Armas de Urubamba y puedes marcar tu punto tocando el mapa.</T.sub>
      <Btn title="Permitir" onPress={ask} loading={loading} style={{ marginTop: 24 }} />
      <Btn title="Ahora no" variant="ghost" onPress={go} style={{ marginTop: 10 }} />
    </SafeAreaView>
  );
}
