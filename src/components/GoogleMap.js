// Google Maps nativo (Android) con la API key de app.config.js. Misma interfaz que el mapa Leaflet.
import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { URUBAMBA_CENTER, SERVICE_RADIUS_KM } from '../data/mock';
import { C } from '../theme';

const ICONS = { mototaxi: 'rickshaw', taxi: 'taxi', motocarga: 'truck-flatbed', mudanza: 'truck-delivery' };

function PinView({ m }) {
  if (m.kind === 'vehicle') {
    return (
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: m.active === false ? C.muted : C.green, borderWidth: 3, borderColor: C.white, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name={ICONS[m.category] || ICONS.mototaxi} size={22} color={C.white} />
      </View>
    );
  }
  if (m.kind === 'me') {
    return (
      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(18,40,92,0.15)', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.navy, borderWidth: 4, borderColor: C.white }} />
      </View>
    );
  }
  const dest = m.kind === 'dest';
  return <View style={{ width: 24, height: 24, borderRadius: dest ? 5 : 12, backgroundColor: dest ? C.gold : C.navy, borderWidth: 4, borderColor: C.white }} />;
}

export default function GoogleMap({ style, markers = [], route, routeColor, routeDashed, fit, fitKey, zoom, padBottom = 40, padTop = 40, showArea, onPress, onMarkerDrag }) {
  const map = useRef(null);
  const lastFit = useRef(null);
  const first = fit?.[0] || URUBAMBA_CENTER;

  useEffect(() => {
    if (!fitKey || fitKey === lastFit.current || !fit?.length || !map.current) return;
    lastFit.current = fitKey;
    if (fit.length === 1) {
      map.current.animateCamera({ center: fit[0], zoom: zoom || 16 }, { duration: 500 });
    } else {
      map.current.fitToCoordinates(fit, { edgePadding: { top: padTop + 20, bottom: padBottom + 20, left: 50, right: 50 }, animated: true });
    }
  }, [fitKey]);

  return (
    <MapView
      ref={map}
      provider={PROVIDER_GOOGLE}
      style={[{ flex: 1 }, style]}
      initialRegion={{ ...first, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
      onMapReady={() => {
        lastFit.current = null;
        if (fit?.length) {
          if (fit.length === 1) map.current?.animateCamera({ center: fit[0], zoom: zoom || 16 }, { duration: 0 });
          else map.current?.fitToCoordinates(fit, { edgePadding: { top: padTop + 20, bottom: padBottom + 20, left: 50, right: 50 }, animated: false });
          lastFit.current = fitKey;
        }
      }}
      onPress={(e) => onPress?.(e.nativeEvent.coordinate)}
      toolbarEnabled={false}
      showsPointsOfInterest
      showsCompass={false}
    >
      {showArea ? <Circle center={URUBAMBA_CENTER} radius={SERVICE_RADIUS_KM * 1000} strokeColor="rgba(18,40,92,0.45)" fillColor="rgba(245,166,35,0.06)" strokeWidth={2} /> : null}
      {route?.length > 1 ? <Polyline coordinates={route} strokeColor="#FFFFFF" strokeWidth={9} /> : null}
      {route?.length > 1 ? <Polyline coordinates={route} strokeColor={routeColor || C.navy} strokeWidth={5} lineDashPattern={routeDashed ? [2, 10] : undefined} /> : null}
      {markers.map((m) => (
        <Marker
          key={m.key}
          coordinate={{ latitude: m.latitude, longitude: m.longitude }}
          anchor={{ x: 0.5, y: 0.5 }}
          draggable={!!m.draggable}
          onDragEnd={(e) => onMarkerDrag?.(m.key, e.nativeEvent.coordinate)}
          title={m.label}
          tracksViewChanges
          zIndex={m.kind === 'vehicle' ? 5 : m.draggable ? 8 : 1}
        >
          <PinView m={m} />
        </Marker>
      ))}
    </MapView>
  );
}
