# Cusco Drive 🛺

*Conectando personas, uniendo destinos.* — Prototipo funcional en **React Native + Expo (SDK 58)** de la app de transporte para Urubamba.

Todo funciona con **datos de ejemplo en memoria** (sin base de datos ni backend).

## Ejecutar en tu celular (Expo Go)

```bash
npm install
npx expo start
```

Escanea el QR con **Expo Go** (Android). Si el celular no está en la misma red Wi‑Fi: `npx expo start --tunnel`.

## Generar APK instalable

```bash
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview
```

(El perfil `preview` de `eas.json` genera un `.apk`.)

## Qué incluye

**Pasajero:** splash, onboarding, elegir rol, login por celular + código (demo: cualquier código de 4 dígitos), mapa de Urubamba con zona de cobertura, categorías (mototaxi, taxi, motocarga, mudanza), buscar destino / marcar en mapa, formulario de carga y cotización de mudanza, **precio fijo** con desglose (tarifa + cargo de servicio), cupones con tope, búsqueda de conductor, conductor en camino animado en el mapa, mensajes rápidos, llamar, compartir por WhatsApp, SOS, cancelación con motivo, recibo + calificación, puntos, racha semanal, referidos, historial y perfil.

**Conductor:** registro en 4 pasos con documentos, estado de aprobación (simulable), interruptor disponible, **solicitudes entrantes** con temporizador de 30 s, Llegué → Iniciar → Finalizar → Cobro en efectivo, **saldo prepago** con descuento automático de comisión, reembolso de cupones, alertas de saldo bajo/cero, recargas Yape/Plin/agente, ganancias por día/semana, bonos semanales, día sin comisión, documentos y vencimientos.

**Panel admin (demo):** tarifario por categoría, comisión fija o % por categoría, redondeo a S/ 0.50, recargo por lluvia, tope de premios, aprobación de conductores, bonos.

## Estructura

```
App.js                      Navegación
src/data/mock.js            Datos de ejemplo (lugares, conductores, tarifario…)
src/logic/pricing.js        Cálculo de precio fijo y comisión
src/store/AppStore.js       Estado global + simulación de viajes
src/components/             UI y mapa
src/screens/                common · passenger · driver · admin
```
