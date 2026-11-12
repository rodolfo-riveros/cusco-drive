// Android / iOS: el mapa Leaflet corre dentro de un WebView.
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { WebView } from 'react-native-webview';

const MapFrame = forwardRef(function MapFrame({ html, onMessage, style }, ref) {
  const wv = useRef(null);
  useImperativeHandle(ref, () => ({
    send: (state) => wv.current?.injectJavaScript(`window.__update && window.__update(${JSON.stringify(state)}); true;`),
  }));
  return (
    <WebView
      ref={wv}
      style={[{ flex: 1, backgroundColor: 'transparent' }, style]}
      originWhitelist={['*']}
      source={{ html, baseUrl: 'https://cuscodrive.local/' }}
      onMessage={(e) => onMessage(e.nativeEvent.data)}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
      overScrollMode="never"
      bounces={false}
    />
  );
});

export default MapFrame;
