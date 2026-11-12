// Web / PWA: el mapa Leaflet corre en un iframe y se comunica por postMessage.
import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';

const MapFrame = forwardRef(function MapFrame({ html, onMessage, style }, ref) {
  const frame = useRef(null);
  const cb = useRef(onMessage);
  useEffect(() => {
    cb.current = onMessage;
  });
  useImperativeHandle(ref, () => ({
    send: (state) => frame.current?.contentWindow?.postMessage(JSON.stringify({ __cd: true, state }), '*'),
  }));
  useEffect(() => {
    const fn = (e) => {
      if (e.source !== frame.current?.contentWindow) return;
      cb.current?.(typeof e.data === 'string' ? e.data : JSON.stringify(e.data));
    };
    window.addEventListener('message', fn);
    return () => window.removeEventListener('message', fn);
  }, []);
  return (
    <View style={[{ flex: 1 }, style]}>
      <iframe ref={frame} srcDoc={html} title="Mapa" style={{ border: 0, width: '100%', height: '100%' }} />
    </View>
  );
});

export default MapFrame;
