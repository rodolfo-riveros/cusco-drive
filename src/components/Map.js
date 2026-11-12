// Mapa real (OpenStreetMap + Leaflet). Funciona en Android, iOS y web, sin API key.
// Props:
//   markers: [{ key, latitude, longitude, kind: 'me'|'origin'|'dest'|'vehicle', category, label, draggable, active }]
//   route: [{latitude, longitude}]   routeColor   routeDashed
//   fit: [puntos] + fitKey (solo reencuadra cuando cambia fitKey)   zoom (si fit tiene 1 punto)
//   showArea: círculo de cobertura   onPress(coord)   onMarkerDrag(key, coord)
import React, { useEffect, useRef } from 'react';
import { View, Platform } from 'react-native';
import Constants from 'expo-constants';
import GoogleMap from './GoogleMap';
import MapFrame from './MapFrame';
import { buildMapHtml } from './mapHtml';
import { URUBAMBA_CENTER, SERVICE_RADIUS_KM } from '../data/mock';
import { C } from '../theme';

export { regionAround } from './mapUtils';

const HTML = buildMapHtml();
// Android con API key configurada → Google Maps nativo. Web / sin key → Leaflet (OpenStreetMap).
const USE_GOOGLE = Platform.OS === 'android' && !!Constants.expoConfig?.extra?.googleMaps;

export default function Map(props) {
  return USE_GOOGLE ? <GoogleMap {...props} /> : <LeafletMap {...props} />;
}

function LeafletMap({ style, markers = [], route, routeColor, routeDashed, fit, fitKey, zoom, padBottom, padTop, showArea, onPress, onMarkerDrag }) {
  const frame = useRef(null);
  const ready = useRef(false);
  const handlers = useRef({ onPress, onMarkerDrag });
  useEffect(() => {
    handlers.current = { onPress, onMarkerDrag };
  });

  // Firma del estado: solo se envía al mapa cuando algo cambió de verdad
  const sig = JSON.stringify({
    markers, route, routeColor, routeDashed, fit, fitKey, zoom, padBottom, padTop,
    area: showArea ? { ...URUBAMBA_CENTER, radius: SERVICE_RADIUS_KM * 1000 } : null,
  });
  const stateRef = useRef(sig);
  useEffect(() => {
    stateRef.current = sig;
    if (ready.current) frame.current?.send(JSON.parse(sig));
  }, [sig]);

  const onMessage = (raw) => {
    let m;
    try {
      m = JSON.parse(raw);
    } catch {
      return;
    }
    if (m.type === 'ready') {
      ready.current = true;
      frame.current?.send(JSON.parse(stateRef.current));
    } else if (m.type === 'press') handlers.current.onPress?.({ latitude: m.latitude, longitude: m.longitude });
    else if (m.type === 'drag') handlers.current.onMarkerDrag?.(m.key, { latitude: m.latitude, longitude: m.longitude });
  };

  return (
    <View style={[{ flex: 1, backgroundColor: C.mapBg }, style]}>
      <MapFrame ref={frame} html={HTML} onMessage={onMessage} />
    </View>
  );
}
