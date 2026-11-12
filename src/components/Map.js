import React, { forwardRef } from 'react';
import { View, Text } from 'react-native';
import MapView, { Marker, Polyline, Circle } from 'react-native-maps';
import { C } from '../theme';
import { URUBAMBA_CENTER, SERVICE_RADIUS_KM } from '../data/mock';

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

export const Pin = ({ color = C.navy, emoji, label }) => (
  <View style={{ alignItems: 'center' }}>
    {label ? (
      <View style={{ backgroundColor: C.white, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginBottom: 3, borderWidth: 1, borderColor: C.border }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: C.navy }}>{label}</Text>
      </View>
    ) : null}
    <View style={{ width: emoji ? 38 : 22, height: emoji ? 38 : 22, borderRadius: 20, backgroundColor: color, borderWidth: 3, borderColor: C.white, alignItems: 'center', justifyContent: 'center', elevation: 4 }}>
      {emoji ? <Text style={{ fontSize: 18 }}>{emoji}</Text> : null}
    </View>
  </View>
);

const Map = forwardRef(function Map({ style, initialRegion, region, markers = [], route, showArea, children, onRegionChangeComplete, scrollEnabled = true }, ref) {
  return (
    <MapView
      ref={ref}
      style={[{ flex: 1 }, style]}
      initialRegion={initialRegion || (region ? undefined : regionAround([URUBAMBA_CENTER]))}
      region={region}
      onRegionChangeComplete={onRegionChangeComplete}
      scrollEnabled={scrollEnabled}
      toolbarEnabled={false}
      showsPointsOfInterest={false}
      loadingEnabled
    >
      {showArea ? (
        <Circle center={URUBAMBA_CENTER} radius={SERVICE_RADIUS_KM * 1000} strokeColor="rgba(18,40,92,0.35)" fillColor="rgba(245,166,35,0.06)" strokeWidth={2} />
      ) : null}
      {route ? <Polyline coordinates={route} strokeColor={C.navy} strokeWidth={5} lineDashPattern={[1]} /> : null}
      {markers.map((m) => (
        <Marker key={m.key} coordinate={{ latitude: m.latitude, longitude: m.longitude }} anchor={{ x: 0.5, y: 1 }} tracksViewChanges>
          <Pin color={m.color} emoji={m.emoji} label={m.label} />
        </Marker>
      ))}
      {children}
    </MapView>
  );
});

export default Map;
