import React from 'react';
import { View } from 'react-native';
import { C, F } from '../theme';
import { Text, CatIcon } from './ui';
import { URUBAMBA_CENTER } from '../data/mock';

export const regionAround = (pts, pad = 1.6) => {
  const list = pts.filter(Boolean);
  if (!list.length) return { ...URUBAMBA_CENTER, latitudeDelta: 0.025, longitudeDelta: 0.025 };
  const lats = list.map((p) => p.latitude);
  const lngs = list.map((p) => p.longitude);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.012, (maxLat - minLat) * pad),
    longitudeDelta: Math.max(0.012, (maxLng - minLng) * pad),
  };
};

/**
 * Marcadores del diseño:
 *  - kind 'me': punto azul con halo
 *  - kind 'origin': círculo azul · 'dest': cuadro dorado
 *  - kind 'vehicle': cuadro verde redondeado con icono de la categoría
 */
export const Pin = ({ kind = 'origin', category, label, active = true }) => {
  let body;
  if (kind === 'me') {
    body = (
      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(18,40,92,0.15)', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.navy, borderWidth: 4, borderColor: C.white }} />
      </View>
    );
  } else if (kind === 'vehicle') {
    body = (
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: active ? C.green : C.muted, borderWidth: 3, borderColor: C.white, alignItems: 'center', justifyContent: 'center', elevation: 4 }}>
        <CatIcon id={category} size={22} color={C.white} strokeWidth={2} />
      </View>
    );
  } else if (kind === 'dest') {
    body = <View style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: C.gold, borderWidth: 3, borderColor: C.white, elevation: 4 }} />;
  } else {
    body = <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.navy, borderWidth: 3, borderColor: C.white, elevation: 4 }} />;
  }
  return (
    <View style={{ alignItems: 'center' }}>
      {label ? (
        <View style={{ backgroundColor: C.white, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginBottom: 4, borderWidth: 1, borderColor: C.border }}>
          <Text style={{ fontSize: 11, fontFamily: F.black, color: C.navy }}>{label}</Text>
        </View>
      ) : null}
      {body}
    </View>
  );
};
