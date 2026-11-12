import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Dimensions, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { C, shadow } from '../../theme';
import { Btn, Logo, AndeanBorder, T, Row, Card, Header } from '../../components/ui';
import { ONBOARDING } from '../../data/mock';
import { useApp } from '../../store/AppStore';

const W = Dimensions.get('window').width;

export function SplashScreen({ navigation }) {
  const { state } = useApp();
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    const t = setTimeout(() => navigation.replace(state.onboarded ? 'RoleSelect' : 'Onboarding'), 1800);
    return () => clearTimeout(t);
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: C.navy, justifyContent: 'center', alignItems: 'center' }}>
      <Animated.View style={{ opacity: fade, transform: [{ scale: fade.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }], alignItems: 'center' }}>
        <Logo light size={1.1} />
        <Text style={{ color: '#C9D3EA', marginTop: 10, fontSize: 15, fontStyle: 'italic' }}>Conectando personas, uniendo destinos.</Text>
      </Animated.View>
      <View style={{ position: 'absolute', bottom: 40, left: 0, right: 0 }}>
        <AndeanBorder />
        <Text style={{ color: C.gold, textAlign: 'center', marginTop: 10, fontWeight: '700' }}>Transporte inteligente en Urubamba</Text>
      </View>
    </View>
  );
}

export function OnboardingScreen({ navigation }) {
  const { completeOnboarding } = useApp();
  const [i, setI] = useState(0);
  const ref = useRef(null);
  const next = () => {
    if (i < ONBOARDING.length - 1) {
      ref.current?.scrollToIndex({ index: i + 1 });
      setI(i + 1);
    } else {
      completeOnboarding();
      navigation.replace('RoleSelect');
    }
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.white }}>
      <Row style={{ justifyContent: 'flex-end', padding: 16 }}>
        <TouchableOpacity onPress={() => { completeOnboarding(); navigation.replace('RoleSelect'); }}>
          <Text style={{ color: C.sub, fontWeight: '700' }}>Saltar</Text>
        </TouchableOpacity>
      </Row>
      <FlatList
        ref={ref}
        data={ONBOARDING}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(x) => x.title}
        onMomentumScrollEnd={(e) => setI(Math.round(e.nativeEvent.contentOffset.x / W))}
        renderItem={({ item }) => (
          <View style={{ width: W, alignItems: 'center', justifyContent: 'center', padding: 30 }}>
            <View style={{ width: 200, height: 200, borderRadius: 100, backgroundColor: C.goldSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 96 }}>{item.emoji}</Text>
            </View>
            <T.h1 style={{ marginTop: 30, textAlign: 'center' }}>{item.title}</T.h1>
            <T.p style={{ textAlign: 'center', marginTop: 12, color: C.sub, fontSize: 17 }}>{item.text}</T.p>
          </View>
        )}
      />
      <Row style={{ justifyContent: 'center', marginBottom: 20 }}>
        {ONBOARDING.map((_, k) => (
          <View key={k} style={{ width: k === i ? 26 : 8, height: 8, borderRadius: 4, backgroundColor: k === i ? C.gold : C.border, marginHorizontal: 4 }} />
        ))}
      </Row>
      <View style={{ padding: 20 }}>
        <Btn title={i === ONBOARDING.length - 1 ? 'Empezar' : 'Siguiente'} onPress={next} />
      </View>
      <AndeanBorder />
    </SafeAreaView>
  );
}

export function RoleSelectScreen({ navigation }) {
  const go = (role) => navigation.navigate('Login', { role });
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ backgroundColor: C.navy, paddingTop: 30, paddingBottom: 26, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
        <Logo light size={0.8} />
        <Text style={{ color: '#C9D3EA', textAlign: 'center', marginTop: 6 }}>¿Cómo quieres usar Cusco Drive?</Text>
        <AndeanBorder style={{ marginTop: 18 }} height={8} />
      </View>
      <View style={{ padding: 20, flex: 1 }}>
        <RoleCard emoji="🙋" title="Quiero viajar" text="Pide mototaxi, taxi, motocarga o mudanza con precio fijo." color={C.gold} onPress={() => go('passenger')} />
        <RoleCard emoji="🛺" title="Quiero ser conductor" text="Recibe viajes cerca de ti y gana bonos cada semana." color={C.green} onPress={() => go('driver')} />
        <TouchableOpacity onPress={() => navigation.navigate('Admin')} style={{ marginTop: 'auto', alignItems: 'center', padding: 12 }}>
          <Row>
            <Ionicons name="settings-outline" size={16} color={C.sub} />
            <Text style={{ color: C.sub, marginLeft: 6, fontWeight: '600' }}>Panel administrador (demo)</Text>
          </Row>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const RoleCard = ({ emoji, title, text, color, onPress }) => (
  <Card onPress={onPress} style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', padding: 20, borderLeftWidth: 6, borderLeftColor: color }}>
    <Text style={{ fontSize: 46 }}>{emoji}</Text>
    <View style={{ flex: 1, marginLeft: 14 }}>
      <T.h2>{title}</T.h2>
      <T.sub style={{ marginTop: 4 }}>{text}</T.sub>
    </View>
    <Ionicons name="chevron-forward" size={24} color={C.navy} />
  </Card>
);

export function LoginScreen({ navigation, route }) {
  const role = route.params?.role || 'passenger';
  const { login, state } = useApp();
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState(1);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [secs, setSecs] = useState(30);

  useEffect(() => {
    if (step !== 2 || secs <= 0) return;
    const t = setTimeout(() => setSecs(secs - 1), 1000);
    return () => clearTimeout(t);
  }, [step, secs]);

  const send = () => {
    if (!/^9\d{8}$/.test(phone)) return setError('Ingresa un celular válido de 9 dígitos que empiece con 9');
    setError('');
    setLoading(true);
    setTimeout(() => { setLoading(false); setStep(2); setSecs(30); }, 1200);
  };
  const verify = () => {
    if (code.length !== 4) return setError('El código tiene 4 dígitos');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      login(phone, role);
      if (role === 'passenger') navigation.reset({ index: 0, routes: [{ name: 'Permissions', params: { role } }] });
      else navigation.reset({ index: 0, routes: [{ name: state.driver.status === 'approved' ? 'DriverTabs' : state.driver.status === 'none' ? 'DriverRegister' : 'DriverStatus' }] });
    }, 900);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.white }}>
      <Header title="" onBack={() => (step === 2 ? setStep(1) : navigation.goBack())} />
      <View style={{ padding: 24 }}>
        <Text style={{ fontSize: 46 }}>{role === 'passenger' ? '📱' : '🛺'}</Text>
        <T.h1 style={{ marginTop: 10 }}>{step === 1 ? 'Ingresa tu celular' : 'Código de verificación'}</T.h1>
        <T.sub style={{ marginTop: 6, fontSize: 15 }}>
          {step === 1
            ? `Te enviaremos un código por SMS o WhatsApp${role === 'driver' ? ' para tu cuenta de conductor' : ''}.`
            : `Enviamos un código al +51 ${phone}. (Demo: escribe cualquier código de 4 dígitos, ej. 1234)`}
        </T.sub>
        {step === 1 ? (
          <Row style={{ marginTop: 26, borderWidth: 2, borderColor: C.border, borderRadius: 16, paddingHorizontal: 14 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: C.navy }}>🇵🇪 +51</Text>
            <TextInput
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/\D/g, '').slice(0, 9))}
              keyboardType="phone-pad"
              placeholder="987 654 321"
              placeholderTextColor={C.muted}
              style={{ flex: 1, fontSize: 20, paddingVertical: 14, marginLeft: 10, color: C.text, letterSpacing: 1 }}
              autoFocus
            />
          </Row>
        ) : (
          <TextInput
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            placeholder="• • • •"
            placeholderTextColor={C.muted}
            style={{ marginTop: 26, borderWidth: 2, borderColor: C.border, borderRadius: 16, fontSize: 32, textAlign: 'center', letterSpacing: 16, paddingVertical: 14, color: C.navy, fontWeight: '800' }}
            autoFocus
          />
        )}
        {error ? <Text style={{ color: C.red, marginTop: 10 }}>{error}</Text> : null}
        {step === 1 ? (
          <TouchableOpacity onPress={() => setPhone('987654321')} style={{ marginTop: 12 }}>
            <Text style={{ color: C.navy2, fontWeight: '600' }}>Usar número demo (987654321)</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity disabled={secs > 0} onPress={() => setSecs(30)} style={{ marginTop: 12 }}>
            <Text style={{ color: secs > 0 ? C.muted : C.navy2, fontWeight: '600' }}>
              {secs > 0 ? `Reenviar código en ${secs}s` : 'Reenviar código por WhatsApp'}
            </Text>
          </TouchableOpacity>
        )}
        <Btn title={step === 1 ? 'Enviar código' : 'Verificar'} onPress={step === 1 ? send : verify} loading={loading} style={{ marginTop: 26 }} />
        <T.sub style={{ marginTop: 16, textAlign: 'center' }}>Al continuar aceptas los Términos y la Política de Privacidad (Ley N.º 29733).</T.sub>
      </View>
    </SafeAreaView>
  );
}

export function PermissionsScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const ask = async () => {
    setLoading(true);
    try {
      await Location.requestForegroundPermissionsAsync();
    } catch (e) {}
    setLoading(false);
    navigation.reset({ index: 0, routes: [{ name: 'PassengerTabs' }] });
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
      <Card style={{ marginTop: 26 }}>
        <Row><Ionicons name="navigate" size={20} color={C.navy} /><T.p style={{ marginLeft: 10, flex: 1 }}>Ubicación: para pedir y seguir tu viaje</T.p></Row>
        <Row style={{ marginTop: 12 }}><Ionicons name="notifications" size={20} color={C.navy} /><T.p style={{ marginLeft: 10, flex: 1 }}>Notificaciones: te avisamos cuando llega tu conductor</T.p></Row>
      </Card>
      <T.sub style={{ marginTop: 12, textAlign: 'center' }}>Demo: tu posición se simula en la Plaza de Armas de Urubamba.</T.sub>
      <Btn title="Permitir" onPress={ask} loading={loading} style={{ marginTop: 24 }} />
      <Btn title="Ahora no" variant="ghost" onPress={() => navigation.reset({ index: 0, routes: [{ name: 'PassengerTabs' }] })} style={{ marginTop: 10 }} />
    </SafeAreaView>
  );
}
