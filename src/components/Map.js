// Mapa ilustrado (estilo del diseño). Funciona en Android, iOS y web sin API key.
// Para usar Google Maps real: importar ./MapNative y configurar android.config.googleMaps.apiKey en app.json.
import React, { forwardRef, useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
import Svg, { Path, Rect, Circle, Polyline, Text as SvgText } from 'react-native-svg';
import { URUBAMBA_CENTER, SERVICE_RADIUS_KM, PLACES } from '../data/mock';
import { regionAround, Pin } from './mapUtils';
import { C } from '../theme';

export { regionAround, Pin };

const Map = forwardRef(function Map({ style, initialRegion, region, markers = [], route, showArea, onRegionChangeComplete, scrollEnabled = true }, _ref) {
  const [size, setSizeRaw] = useState({ w: 360, h: 640 });
  const setSize = (s) => { if (s.w > 0 && s.h > 0) setSizeRaw(s); };
  const [reg, setReg] = useState(region || initialRegion || regionAround([URUBAMBA_CENTER]));

  useEffect(() => {
    if (region) setReg(region);
  }, [region?.latitude, region?.longitude, region?.latitudeDelta]);

  // Mantener proporción: el delta de longitud se ajusta al ancho
  const dLat = reg.latitudeDelta;
  const dLng = (dLat * size.w) / size.h / Math.cos((reg.latitude * Math.PI) / 180);
  const toXY = (p) => ({
    x: ((p.longitude - (reg.longitude - dLng / 2)) / dLng) * size.w,
    y: (((reg.latitude + dLat / 2) - p.latitude) / dLat) * size.h,
  });
  const kmPerPx = (dLat * 111) / size.h;

  const onPress = (e) => {
    if (!scrollEnabled || !onRegionChangeComplete) return;
    const { locationX, locationY } = e.nativeEvent;
    const next = {
      ...reg,
      latitude: reg.latitude + dLat / 2 - (locationY / size.h) * dLat,
      longitude: reg.longitude - dLng / 2 + (locationX / size.w) * dLng,
    };
    setReg(next);
    onRegionChangeComplete(next);
  };

  const c = toXY(URUBAMBA_CENTER);
  const { w, h } = size;
  // Calles decorativas relativas a la plaza (se mueven con el mapa)
  const ox = c.x - w / 2;
  const oy = c.y - h / 2;

  return (
    <View style={[{ flex: 1, overflow: 'hidden', backgroundColor: C.mapBg }, style]} onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <Pressable onPress={onPress} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}>
        <Svg width={w} height={h}>
          <Rect width={w} height={h} fill={C.mapBg} />
          <Path d={`M${ox - 400} ${oy + h * 0.05} C ${ox + w * 0.2} ${oy - h * 0.05}, ${ox + w * 0.5} ${oy + h * 0.12}, ${ox + w + 400} ${oy - h * 0.02} L ${ox + w + 400} ${oy - 600} L ${ox - 400} ${oy - 600} Z`} fill="#DCE8D4" />
          <Path d={`M${ox - 400} ${oy + h * 0.66} C ${ox + w * 0.25} ${oy + h * 0.56}, ${ox + w * 0.5} ${oy + h * 0.78}, ${ox + w + 400} ${oy + h * 0.6}`} stroke="#BFD9EE" strokeWidth={22} fill="none" />
          {[-0.3, 0.12, 0.36, 0.5, 0.82, 1.3].map((k, i) => (
            <Path key={'h' + i} d={`M${ox - 500} ${oy + h * k} L ${ox + w + 500} ${oy + h * (k - 0.05)}`} stroke={C.white} strokeWidth={i % 2 ? 8 : 12} />
          ))}
          {[-0.4, 0.12, 0.33, 0.72, 1.1, 1.5].map((k, i) => (
            <Path key={'v' + i} d={`M${ox + w * k} ${oy - 600} L ${ox + w * (k + 0.14)} ${oy + h + 600}`} stroke={C.white} strokeWidth={i % 2 ? 8 : 12} />
          ))}
          <Rect x={c.x - 30} y={c.y - 26} width={60} height={52} rx={8} fill="#D6E6CF" />
          <SvgText x={c.x} y={c.y + 4} fontSize={9} textAnchor="middle" fill="#4E6B45">Plaza de Armas</SvgText>
          {PLACES.filter((p) => !['plaza'].includes(p.id)).map((p) => {
            const q = toXY(p);
            if (q.x < -50 || q.y < -20 || q.x > w + 50 || q.y > h + 20) return null;
            return <SvgText key={p.id} x={q.x} y={q.y + 18} fontSize={9} textAnchor="middle" fill={C.sub}>{p.name.replace(' de Urubamba', '')}</SvgText>;
          })}
          <SvgText x={ox + w * 0.15} y={oy + h * 0.64} fontSize={9} fill="#3E6E95">Río Vilcanota</SvgText>
          {showArea ? <Circle cx={c.x} cy={c.y} r={SERVICE_RADIUS_KM / kmPerPx} stroke="rgba(18,40,92,0.35)" strokeWidth={2} fill="rgba(245,166,35,0.05)" /> : null}
          {route ? <Polyline points={route.map((p) => { const q = toXY(p); return `${q.x},${q.y}`; }).join(' ')} stroke={C.navy} strokeWidth={5} fill="none" strokeLinecap="round" /> : null}
        </Svg>
      </Pressable>
      {markers.map((m) => {
        const q = toXY(m);
        const half = { me: 21, vehicle: 20 }[m.kind] || 10;
        return (
          <View key={m.key} pointerEvents="none" style={{ position: 'absolute', left: q.x - 60, top: q.y - half - (m.label ? 24 : 0), width: 120, alignItems: 'center' }}>
            <Pin kind={m.kind} category={m.category} label={m.label} active={m.active !== false} />
          </View>
        );
      })}
    </View>
  );
});

export default Map;
