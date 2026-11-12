import React, { forwardRef } from 'react';
import MapView, { Marker, Polyline, Circle } from 'react-native-maps';
import { C } from '../theme';
import { URUBAMBA_CENTER, SERVICE_RADIUS_KM } from '../data/mock';
import { regionAround, Pin } from './mapUtils';

export { regionAround, Pin };

// Estilo claro, parecido al mapa ilustrado del diseño (solo aplica en Google Maps / Android)
const MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#EEF1F4' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5B6478' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#DCE8D4' }, { visibility: 'on' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#BFD9EE' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

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
      customMapStyle={MAP_STYLE}
      loadingEnabled
    >
      {showArea ? (
        <Circle center={URUBAMBA_CENTER} radius={SERVICE_RADIUS_KM * 1000} strokeColor="rgba(18,40,92,0.35)" fillColor="rgba(245,166,35,0.06)" strokeWidth={2} />
      ) : null}
      {route ? <Polyline coordinates={route} strokeColor={C.navy} strokeWidth={5} /> : null}
      {markers.map((m) => (
        <Marker key={m.key} coordinate={{ latitude: m.latitude, longitude: m.longitude }} anchor={{ x: 0.5, y: m.label ? 1 : 0.5 }} tracksViewChanges>
          <Pin kind={m.kind} category={m.category} label={m.label} active={m.active !== false} />
        </Marker>
      ))}
      {children}
    </MapView>
  );
});

export default Map;
