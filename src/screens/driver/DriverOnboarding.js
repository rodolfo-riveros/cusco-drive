import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../theme';
import { Btn, Card, Row, T, Text, Chip, Header, Badge, AndeanBorder } from '../../components/ui';
import { CATEGORIES } from '../../data/mock';
import { useApp } from '../../store/AppStore';

const STEPS = ['Datos', 'Vehículo', 'Documentos', 'Fotos'];
const DOCS = ['DNI (ambas caras)', 'Licencia de conducir', 'SOAT vigente', 'Tarjeta de propiedad'];
const PHOTOS = ['Foto de perfil', 'Vehículo de frente', 'Vehículo de costado', 'Placa visible'];

export function DriverRegister({ navigation }) {
  const { submitDriverRegistration, enterDemoDriver, toast, state } = useApp();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ name: '', dni: '', association: '', category: 'mototaxi', vehicle: '', plate: '', docs: {}, photos: {} });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const validate = () => {
    if (step === 0 && (f.name.trim().length < 5 || !/^\d{8}$/.test(f.dni))) return 'Completa tu nombre y un DNI de 8 dígitos';
    if (step === 1 && (f.vehicle.trim().length < 3 || f.plate.trim().length < 5)) return 'Completa el vehículo y la placa';
    if (step === 2 && DOCS.some((d) => !f.docs[d])) return 'Sube todos los documentos';
    if (step === 3 && PHOTOS.some((d) => !f.photos[d])) return 'Sube todas las fotos';
    return null;
  };
  const next = () => {
    const err = validate();
    if (err) return toast(err, 'warn');
    if (step < 3) return setStep(step + 1);
    submitDriverRegistration({
      name: f.name, dni: f.dni, association: f.association || 'Independiente', category: f.category,
      vehicle: f.vehicle, plate: f.plate.toUpperCase(), phone: state.session.phone,
      documents: [
        { id: 'dni', name: 'DNI', status: 'review' },
        { id: 'lic', name: 'Licencia', status: 'review' },
        { id: 'soat', name: 'SOAT', status: 'review' },
        { id: 'tarjeta', name: 'Tarjeta de propiedad', status: 'review' },
        { id: 'fotos', name: 'Fotos del vehículo y placa', status: 'review' },
      ],
    });
    navigation.reset({ index: 0, routes: [{ name: 'DriverStatus' }] });
  };
  const fillDemo = () =>
    setF({
      name: 'Wilber Choque Huamán', dni: '47581236', association: 'Paradero Plaza de Armas', category: 'mototaxi',
      vehicle: 'Bajaj RE 2022 · Verde', plate: 'MT-9012',
      docs: Object.fromEntries(DOCS.map((d) => [d, true])), photos: Object.fromEntries(PHOTOS.map((d) => [d, true])),
    });

  const Upload = ({ list, key2 }) =>
    list.map((d) => {
      const ok = f[key2][d];
      return (
        <TouchableOpacity key={d} onPress={() => set(key2, { ...f[key2], [d]: !ok })} style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 2, borderStyle: ok ? 'solid' : 'dashed', borderColor: ok ? C.green : C.border, backgroundColor: ok ? C.greenSoft : C.white, marginTop: 10 }}>
          <Ionicons name={ok ? 'checkmark-circle' : key2 === 'docs' ? 'document-attach' : 'camera'} size={26} color={ok ? C.green : C.sub} />
          <Text style={{ marginLeft: 12, flex: 1, fontWeight: '700', color: C.text }}>{d}</Text>
          <Text style={{ color: ok ? C.green : C.navy2, fontWeight: '700' }}>{ok ? 'Subido' : 'Subir'}</Text>
        </TouchableOpacity>
      );
    });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="Registro de conductor" onBack={() => (step ? setStep(step - 1) : navigation.reset({ index: 0, routes: [{ name: 'Login' }] }))} />
      <Row style={{ paddingHorizontal: 16 }}>
        {STEPS.map((s, i) => (
          <View key={s} style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: i <= step ? C.green : C.border, alignItems: 'center', justifyContent: 'center' }}>
              {i < step ? <Ionicons name="checkmark" color={C.white} size={18} /> : <Text style={{ color: i <= step ? C.white : C.sub, fontWeight: '800' }}>{i + 1}</Text>}
            </View>
            <Text style={{ fontSize: 12, marginTop: 4, color: i === step ? C.navy : C.sub, fontWeight: i === step ? '800' : '500' }}>{s}</Text>
          </View>
        ))}
      </Row>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          <Card>
            <Field label="Nombre completo" value={f.name} onChange={(v) => set('name', v)} placeholder="Como figura en tu DNI" />
            <Field label="DNI" value={f.dni} onChange={(v) => set('dni', v.replace(/\D/g, '').slice(0, 8))} placeholder="8 dígitos" keyboard="number-pad" />
            <Field label="Asociación / paradero (opcional)" value={f.association} onChange={(v) => set('association', v)} placeholder="Ej. Paradero Plaza de Armas" />
          </Card>
        ) : null}
        {step === 1 ? (
          <Card>
            <T.h3>Tipo de servicio</T.h3>
            <Row style={{ flexWrap: 'wrap', marginTop: 8 }}>
              {CATEGORIES.map((c) => (
                <Chip key={c.id} label={c.name} active={f.category === c.id} color={c.color} onPress={() => set('category', c.id)} style={{ marginBottom: 8 }} />
              ))}
            </Row>
            <Field label="Marca, modelo y color" value={f.vehicle} onChange={(v) => set('vehicle', v)} placeholder="Ej. Bajaj RE 2022 · Azul" />
            <Field label="Placa" value={f.plate} onChange={(v) => set('plate', v.toUpperCase().slice(0, 8))} placeholder="Ej. MT-4521" />
          </Card>
        ) : null}
        {step === 2 ? (
          <Card>
            <T.h3>Sube tus documentos</T.h3>
            <T.sub>Fotos claras y vigentes. (Demo: toca para simular la subida)</T.sub>
            {Upload({ list: DOCS, key2: 'docs' })}
          </Card>
        ) : null}
        {step === 3 ? (
          <Card>
            <T.h3>Fotos del vehículo</T.h3>
            <T.sub>La placa debe leerse bien.</T.sub>
            {Upload({ list: PHOTOS, key2: 'photos' })}
          </Card>
        ) : null}
        <Btn title={step === 3 ? 'Enviar para revisión' : 'Continuar'} onPress={next} style={{ marginTop: 16 }} />
        <Btn title="Autocompletar datos demo" variant="ghost" small onPress={fillDemo} style={{ marginTop: 10 }} />
        <Btn
          title="Entrar con conductor demo ya aprobado"
          variant="ghost"
          small
          onPress={() => { enterDemoDriver(); navigation.reset({ index: 0, routes: [{ name: 'DriverTabs' }] }); }}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const Field = ({ label, value, onChange, placeholder, keyboard }) => (
  <View style={{ marginTop: 12 }}>
    <T.sub style={{ fontWeight: '700', color: C.navy }}>{label}</T.sub>
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={C.muted}
      keyboardType={keyboard}
      style={{ borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 12, fontSize: 16, marginTop: 6, color: C.text }}
    />
  </View>
);

export function DriverStatus({ navigation }) {
  const { state, adminDecideSelf, resetDriverRegistration, logout } = useApp();
  const d = state.driver;
  const approved = d.status === 'approved';
  const rejected = d.status === 'rejected';
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <View style={{ width: 130, height: 130, borderRadius: 65, alignItems: 'center', justifyContent: 'center', backgroundColor: approved ? C.greenSoft : rejected ? C.redSoft : C.goldSoft }}>
            <Text style={{ fontSize: 64 }}>{approved ? '✅' : rejected ? '❌' : '⏳'}</Text>
          </View>
          <T.h1 style={{ marginTop: 16, textAlign: 'center' }}>{approved ? '¡Fuiste aprobado!' : rejected ? 'Registro rechazado' : 'Estamos revisando tus documentos'}</T.h1>
          <T.p style={{ textAlign: 'center', color: C.sub, marginTop: 8 }}>
            {approved
              ? 'Ya puedes recibir viajes. Sin comisión: cada viaje se deposita completo en tu billetera y puedes retirarlo el mismo día.'
              : rejected
              ? `Motivo: ${d.rejectReason}`
              : 'El administrador verifica tu DNI, licencia, SOAT y vehículo. Suele tardar menos de 24 horas.'}
          </T.p>
        </View>
        <Card style={{ marginTop: 20 }}>
          <T.h3>{d.profile.name}</T.h3>
          <T.sub>{d.profile.vehicle} · {d.profile.plate}</T.sub>
          {d.profile.documents.map((doc) => (
            <Row key={doc.id} style={{ justifyContent: 'space-between', marginTop: 10 }}>
              <T.p>{doc.name}</T.p>
              <Badge text={approved ? 'Aprobado' : rejected && doc.id === 'soat' ? 'Observado' : 'En revisión'} tone={approved ? 'green' : rejected && doc.id === 'soat' ? 'red' : 'gold'} />
            </Row>
          ))}
        </Card>
        {approved ? (
          <Btn title="Empezar a conducir" icon="car" variant="success" style={{ marginTop: 20 }} onPress={() => navigation.reset({ index: 0, routes: [{ name: 'DriverTabs' }] })} />
        ) : rejected ? (
          <Btn title="Corregir y reenviar" style={{ marginTop: 20 }} onPress={() => { resetDriverRegistration(); navigation.reset({ index: 0, routes: [{ name: 'DriverRegister' }] }); }} />
        ) : (
          <Card style={{ marginTop: 20, backgroundColor: C.purpleSoft }}>
            <T.h3 style={{ color: C.purple }}>Simular decisión del administrador</T.h3>
            <Row style={{ marginTop: 12 }}>
              <Btn small title="Aprobar" variant="success" style={{ flex: 1, marginRight: 8 }} onPress={() => adminDecideSelf(true)} />
              <Btn small title="Rechazar" variant="danger" style={{ flex: 1 }} onPress={() => adminDecideSelf(false, 'La foto del SOAT no se lee bien.')} />
            </Row>
          </Card>
        )}
        <Btn title="Cerrar sesión" variant="ghost" style={{ marginTop: 12 }} onPress={() => { logout(); navigation.reset({ index: 0, routes: [{ name: 'Login' }] }); }} />
        <AndeanBorder style={{ marginTop: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
