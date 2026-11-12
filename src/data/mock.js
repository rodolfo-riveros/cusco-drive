// Datos de ejemplo (sin base de datos). Todo vive en memoria mientras la app está abierta.
// En producción: tablas `configuracion`, `tarifas`, `categorias`, etc. (ver CUSCO_DRIVE_NEGOCIO.md §8)

export const URUBAMBA_CENTER = { latitude: -13.3048, longitude: -72.116 };
export const SERVICE_RADIUS_KM = 9;

// Simulación: 1 minuto real del negocio = 6 segundos en el demo (x10)
export const DEMO_SPEED = 10;

export const CATEGORIES = [
  { id: 'mototaxi', name: 'Mototaxi', emoji: '🛺', color: '#F5A623', soft: '#FFF4DF', text: '#7A4B00', desc: 'Hasta 3 pasajeros', seats: 3 },
  { id: 'taxi', name: 'Taxi', emoji: '🚕', color: '#12285C', soft: '#E8ECF6', text: '#12285C', desc: 'Hasta 4 pasajeros', seats: 4 },
  { id: 'motocarga', name: 'Motocarga', emoji: '📦', color: '#2E9E44', soft: '#E6F4E9', text: '#1D6B2D', desc: 'Compras y paquetes', cargo: true },
  { id: 'mudanza', name: 'Mudanza', emoji: '🚚', color: '#C2571A', soft: '#FBEBE1', text: '#8A3A10', desc: 'Camioneta para carga', cargo: true },
];

export const catById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];

// Parámetros de negocio: los cambia el administrador (panel admin). Nada de esto va fijo en el código.
export const INITIAL_CONFIG = {
  // Tarifa por zonas (precio final que paga el pasajero, ya incluye el margen)
  //  centerFare: dentro del centro de Urubamba · stepKm/stepAmount: cuánto sube por tramo fuera del centro
  tariffs: {
    mototaxi: { centerFare: 3, stepKm: 1.5, stepAmount: 1, min: 3 },
    taxi: { centerFare: 5, stepKm: 1.5, stepAmount: 1.5, min: 5 },
    motocarga: { centerFare: 5, stepKm: 1.5, stepAmount: 1.5, min: 5 },
    mudanza: { centerFare: 50, stepKm: 2, stepAmount: 5, min: 50 },
  },
  centerRadiusKm: 1.2, // radio del "centro de Urubamba" desde la Plaza de Armas
  centerTripKm: 2.5, // recorrido normal dentro del centro (más que esto suma tramos)
  leaveCenterExtra: 1, // + S/ 1.00 cuando el viaje sale del centro
  nightSurcharge: false,
  restrictToUrubamba: true, // cobertura solo en Urubamba (desactívalo en admin para probar en otra ciudad)
  // Margen de Cusco Drive incluido en el precio del pasajero
  margin: {
    mototaxi: { type: 'fixed', value: 0.5 },
    taxi: { type: 'fixed', value: 0.5 },
    motocarga: { type: 'percent', value: 10 },
    mudanza: { type: 'percent', value: 8 },
  },
  surcharges: {
    night: { mototaxi: 0.5, taxi: 1.0, motocarga: 1.0, mudanza: 10 },
    rain: { mototaxi: 0.5, taxi: 1.0, motocarga: 1.0, mudanza: 10 },
    luggage: 1.0,
  },
  cargoSizes: {
    motocarga: { chico: 0, mediano: 2, grande: 4 },
    mudanza: { pequeña: 0, mediana: 30, grande: 70 },
  },
  helperPrice: 15,
  rounding: '0.50', // 'none' | '0.50'
  raining: false,

  // Pago retenido
  autoReleaseMin: 5, // se libera solo si el pasajero no reclama
  searchTimeoutMin: 2, // si nadie acepta, se reembolsa
  arrivalRadiusM: 300, // GPS debe estar cerca del destino para finalizar
  cancelFeeArrived: 1.0, // penalidad si el pasajero cancela con el conductor ya en el punto (va al conductor)

  // Pago del pasajero: directo con Yape / Plin en cada viaje (sin billetera ni recargas)
  paymentMethods: ['Yape', 'Plin'],
  gatewayFeePct: 3.5, // pendiente: comisión real de la pasarela por cobro (Culqi / Niubiz / Izipay…)

  // Billetera del conductor
  minWithdraw: 5,
  freeWithdrawalsPerMonth: 4,
  withdrawFee: 0.5,

  // Premios
  rewardsCapPct: 30,
  pointsPerReward: 20,
  pointsRewardAmount: 2,
  couponMaxValue: 3,
  couponExpiryDays: 60,
  driverDailyBonuses: [
    { trips: 15, amount: 1 },
    { trips: 20, amount: 3 },
    { trips: 30, amount: 6 },
  ],
  bonusMinRating: 4.5,
  bonusMaxCancelPct: 10,
};

export const PLACES = [
  { id: 'plaza', name: 'Plaza de Armas', sub: 'Centro de Urubamba', icon: 'business', latitude: -13.3048, longitude: -72.116 },
  { id: 'mercado', name: 'Mercado de Urubamba', sub: 'Jr. Comercio', icon: 'basket', latitude: -13.3062, longitude: -72.1138 },
  { id: 'terminal', name: 'Terminal de Urubamba', sub: 'Av. Cabo Conchatupa', icon: 'bus', latitude: -13.3079, longitude: -72.1215 },
  { id: 'hospital', name: 'Hospital de Urubamba', sub: 'Av. Cabo Conchatupa', icon: 'medkit', latitude: -13.3018, longitude: -72.1128 },
  { id: 'lasalle', name: 'Colegio La Salle', sub: 'Educación', icon: 'school', latitude: -13.3033, longitude: -72.1197 },
  { id: 'estadio', name: 'Estadio Municipal', sub: 'Deportes', icon: 'football', latitude: -13.3002, longitude: -72.1182 },
  { id: 'ovalo', name: 'Óvalo Pachacútec', sub: 'Puente Urubamba', icon: 'git-merge', latitude: -13.3098, longitude: -72.1152 },
  { id: 'pumahuanca', name: 'Pumahuanca', sub: 'Comunidad', icon: 'leaf', latitude: -13.2842, longitude: -72.1092 },
  { id: 'chicon', name: 'Chicón', sub: 'Comunidad', icon: 'leaf', latitude: -13.2893, longitude: -72.1242 },
  { id: 'yanahuara', name: 'Yanahuara', sub: 'Comunidad · 5 km', icon: 'leaf', latitude: -13.2835, longitude: -72.1495 },
  { id: 'huayllabamba', name: 'Huayllabamba', sub: 'Distrito vecino · 7 km', icon: 'leaf', latitude: -13.3365, longitude: -72.0665 },
  { id: 'ollanta', name: 'Ollantaytambo', sub: 'Fuera de cobertura (fase 3)', icon: 'trail-sign', latitude: -13.2585, longitude: -72.2633 },
  { id: 'cusco', name: 'Cusco – Plaza de Armas', sub: 'Fuera de cobertura (fase 3)', icon: 'trail-sign', latitude: -13.5167, longitude: -71.9787 },
];

export const placeById = (id) => PLACES.find((p) => p.id === id);

export const DRIVERS = [
  { id: 'd1', name: 'Juan Mamani', category: 'mototaxi', vehicle: 'Mototaxi Bajaj · roja', plate: 'MT-4521', rating: 4.9, trips: 1240, star: true, latitude: -13.3035, longitude: -72.1175, phone: '987654321' },
  { id: 'd2', name: 'Rosa Huamán', category: 'mototaxi', vehicle: 'Mototaxi TVS · azul', plate: 'MT-3310', rating: 4.8, trips: 860, latitude: -13.3068, longitude: -72.1128, phone: '987111222' },
  { id: 'd3', name: 'Pedro Quispe', category: 'mototaxi', vehicle: 'Mototaxi Bajaj · amarilla', plate: 'MT-7788', rating: 4.7, trips: 530, latitude: -13.3021, longitude: -72.1199, phone: '987333444' },
  { id: 'd4', name: 'Carlos Ccori', category: 'taxi', vehicle: 'Toyota Yaris · blanco', plate: 'X2T-541', rating: 4.9, trips: 2100, star: true, latitude: -13.3055, longitude: -72.1185, phone: '987555666' },
  { id: 'd5', name: 'Marco Condori', category: 'taxi', vehicle: 'Kia Rio · plata', plate: 'X4B-902', rating: 4.6, trips: 640, latitude: -13.3008, longitude: -72.1141, phone: '987777888' },
  { id: 'd6', name: 'Luis Apaza', category: 'motocarga', vehicle: 'Motocarga Wanxin', plate: 'MC-1205', rating: 4.8, trips: 410, latitude: -13.3071, longitude: -72.1162, phone: '987999000' },
  { id: 'd7', name: 'Hilda Puma', category: 'motocarga', vehicle: 'Motocarga Zongshen', plate: 'MC-0871', rating: 4.7, trips: 300, latitude: -13.3029, longitude: -72.1121, phone: '986111333' },
  { id: 'd8', name: 'Transportes Valle', category: 'mudanza', vehicle: 'Hyundai H100 · furgón', plate: 'C5K-221', rating: 4.9, trips: 190, latitude: -13.3089, longitude: -72.1188, phone: '986222444' },
];

export const PASSENGER_NAMES = ['Lucía Ttito', 'Andrés Huallpa', 'Doña Martha', 'Kevin Rojas', 'Sonia Puma', 'Don Julio', 'Valeria Cusi', 'Ruth Mamani'];

const at = (daysAgo, h = 10, m = 15) => {
  const t = new Date();
  t.setDate(t.getDate() - daysAgo);
  t.setHours(h, m, 0, 0);
  return t.toISOString();
};
const inDays = (d) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  return t.toISOString();
};

export const INITIAL_HISTORY = [
  { id: 'h1', date: at(1, 8), category: 'mototaxi', origin: 'Plaza de Armas', dest: 'Mercado de Urubamba', driverName: 'Juan Mamani', plate: 'MT-4521', driverFare: 2.5, margin: 0.5, discount: 0, final: 3, paid: 3, method: 'Yape', status: 'completed', rating: 5 },
  { id: 'h2', date: at(2, 18), category: 'taxi', origin: 'Terminal de Urubamba', dest: 'Yanahuara', driverName: 'Carlos Ccori', plate: 'X2T-541', driverFare: 9.5, margin: 0.5, discount: 1, final: 10, paid: 9, method: 'Yape', status: 'completed', rating: 5, coupon: 'Cupón de bienvenida' },
  { id: 'h3', date: at(4, 7), category: 'mototaxi', origin: 'Hospital de Urubamba', dest: 'Colegio La Salle', driverName: 'Rosa Huamán', plate: 'MT-3310', driverFare: 2.5, margin: 0.5, discount: 0, final: 3, paid: 3, method: 'Yape', status: 'completed', rating: 4 },
  { id: 'h5', date: at(0, 7, 40), category: 'mototaxi', origin: 'Terminal de Urubamba', dest: 'Óvalo Pachacútec', driverName: 'Pedro Quispe', plate: 'MT-7788', driverFare: 2.5, margin: 0.5, discount: 0, final: 3, paid: 3, method: 'Yape', status: 'disputed', disputeReason: 'No llegué a mi destino' },
  { id: 'h4', date: at(6, 20), category: 'mototaxi', origin: 'Estadio Municipal', dest: 'Plaza de Armas', driverName: '—', plate: '—', driverFare: 2.5, margin: 0.5, discount: 0, final: 3, paid: 0, refund: 3, method: 'Yape', status: 'cancelled', cancelReason: 'Cancelado antes de que un conductor acepte' },
];

export const INITIAL_COUPONS = [
  { id: 'c1', title: 'Cupón de bienvenida', type: 'welcome', amount: 1, expiresAt: inDays(58), used: false },
  { id: 'c2', title: 'Racha semanal', type: 'streak', amount: 1, expiresAt: inDays(5), used: false },
];

/**
 * Libro inicial (demo). Se escribe en orden cronológico; el store lo invierte (más reciente primero).
 * Todos los grupos suman cero.
 */
export const SEED_LEDGER_EVENTS = [
  // Histórico de la plataforma antes de este demo
  { date: at(30, 9), entries: [
    { account: 'plataforma', type: 'historico', amount: 186.5, label: 'Margen acumulado del mes (demo)' },
    { account: 'plataforma', type: 'vale', amount: -31, label: 'Premios entregados en el mes (demo)' },
    { account: 'externo', type: 'historico', amount: -155.5, label: 'Saldo inicial (demo)' },
  ] },
  // Pasajero: pagos de viajes con Yape / Plin (sin billetera)
  { date: at(6, 20), tripId: 'h4', entries: [
    { account: 'externo', type: 'retencion', amount: -3, label: 'Pago retenido · Estadio → Plaza (Yape)' },
    { account: 'retenido', type: 'retencion', amount: 3, label: 'Pago retenido · Estadio → Plaza' },
  ] },
  { date: at(6, 20, 17), tripId: 'h4', entries: [
    { account: 'retenido', type: 'reembolso', amount: -3, label: 'Reembolso · cancelado sin conductor' },
    { account: 'externo', type: 'reembolso', amount: 3, label: 'Devolución a Yape' },
  ] },
  { date: at(4, 7), tripId: 'h3', entries: [
    { account: 'externo', type: 'retencion', amount: -3, label: 'Viaje Hospital → La Salle (Yape)' },
    { account: 'conductores', type: 'liberacion', amount: 2.5, label: 'Pago a Rosa Huamán' },
    { account: 'plataforma', type: 'margen', amount: 0.5, label: 'Margen viaje Hospital → La Salle' },
  ] },
  { date: at(2, 18), tripId: 'h2', entries: [
    { account: 'externo', type: 'retencion', amount: -9, label: 'Viaje Terminal → Yanahuara (Yape)' },
    { account: 'conductores', type: 'liberacion', amount: 9.5, label: 'Pago a Carlos Ccori' },
    { account: 'plataforma', type: 'margen', amount: 0.5, label: 'Margen viaje Terminal → Yanahuara' },
    { account: 'plataforma', type: 'vale', amount: -1, label: 'Cupón de bienvenida' },
  ] },
  { date: at(1, 8), tripId: 'h1', entries: [
    { account: 'externo', type: 'retencion', amount: -3, label: 'Viaje Plaza → Mercado (Yape)' },
    { account: 'conductores', type: 'liberacion', amount: 2.5, label: 'Pago a Juan Mamani' },
    { account: 'plataforma', type: 'margen', amount: 0.5, label: 'Margen viaje Plaza → Mercado' },
  ] },
  { date: at(0, 7, 40), tripId: 'h5', entries: [
    { account: 'externo', type: 'retencion', amount: -3, label: 'Pago retenido · Terminal → Óvalo (Yape)' },
    { account: 'retenido', type: 'retencion', amount: 3, label: 'Pago retenido · Terminal → Óvalo' },
  ] },
  // Conductor (Juan): viajes de ayer, bono y retiro
  { date: at(1, 21), entries: [
    { account: 'externo', type: 'liberacion', amount: -45, label: 'Viajes de ayer (18)' },
    { account: 'conductor', type: 'liberacion', amount: 45, label: 'Viajes de ayer (18 viajes)' },
  ] },
  { date: at(1, 21), entries: [
    { account: 'plataforma', type: 'bono', amount: -1, label: 'Bono del día · 15 viajes' },
    { account: 'conductor', type: 'bono', amount: 1, label: 'Bono del día · 15 viajes' },
  ] },
  { date: at(1, 21, 30), entries: [
    { account: 'conductor', type: 'retiro', amount: -40, label: 'Retiro a Yape ***321' },
    { account: 'externo', type: 'retiro', amount: 40, label: 'Retiro a Yape ***321' },
  ] },
  { date: at(0, 8, 40), entries: [
    { account: 'externo', type: 'liberacion', amount: -35, label: 'Viajes de hoy (14)' },
    { account: 'conductor', type: 'liberacion', amount: 35, label: 'Viajes de hoy (14 viajes)' },
  ] },
];

export const INITIAL_DRIVER = {
  name: 'Juan Mamani Ccori',
  phone: '987654321',
  dni: '45879632',
  category: 'mototaxi',
  vehicle: 'Bajaj RE 205 · roja',
  plate: 'MT-4521',
  association: 'Asoc. Mototaxis Señor de Torrechayoc',
  rating: 4.86,
  totalTrips: 1240,
  documents: [
    { id: 'dni', name: 'DNI', status: 'ok', expires: null },
    { id: 'lic', name: 'Licencia B-IIc', status: 'ok', expires: inDays(410) },
    { id: 'soat', name: 'SOAT', status: 'warn', expires: inDays(23) },
    { id: 'tarjeta', name: 'Tarjeta de propiedad', status: 'ok', expires: null },
    { id: 'fotos', name: 'Fotos del vehículo y placa', status: 'ok', expires: null },
  ],
  badges: ['verificado', 'estrella'],
  payout: { method: 'Yape', account: '987654321' },
};

// Ganancias de los últimos 7 días (índice 6 = hoy). Sin comisión: el conductor recibe su tarifa completa.
export const INITIAL_EARNINGS_WEEK = [
  { trips: 24, earned: 62.0, bonus: 3 },
  { trips: 28, earned: 72.5, bonus: 3 },
  { trips: 19, earned: 49.0, bonus: 1 },
  { trips: 31, earned: 80.5, bonus: 6 },
  { trips: 26, earned: 67.0, bonus: 3 },
  { trips: 18, earned: 45.0, bonus: 1 },
  { trips: 14, earned: 35.0, bonus: 0 },
];

export const PENDING_DRIVERS = [
  { id: 'p1', name: 'Wilber Choque', category: 'mototaxi', plate: 'MT-9012', docs: 5, date: at(1) },
  { id: 'p2', name: 'Nancy Sutta', category: 'motocarga', plate: 'MC-2233', docs: 4, date: at(2) },
];

export const CANCEL_REASONS = ['El conductor tarda mucho', 'Cambié de planes', 'Me equivoqué de destino', 'Encontré otro transporte', 'Otro motivo'];
export const DRIVER_CANCEL_REASONS = ['El pasajero no aparece', 'Problema con el vehículo', 'Dirección incorrecta', 'Otro motivo'];
export const DISPUTE_REASONS = ['No llegué a mi destino', 'El conductor no vino', 'Cobro incorrecto', 'Mal trato o inseguridad', 'Otro motivo'];
export const QUICK_MESSAGES = ['Ya voy', 'Estoy en la puerta', 'Llámame, por favor'];
export const RATING_TAGS = ['Puntual', 'Amable', 'Manejo seguro', 'Vehículo limpio', 'Buena ruta'];

export const ONBOARDING = [
  { key: 'pedir', title: 'Pide tu movilidad\nen 3 toques', text: 'Mototaxi, taxi, motocarga o mudanza. Todo Urubamba en una sola app.' },
  { key: 'precio', title: 'Precio claro,\nsin regateo', text: 'Antes de pedir ves cuánto pagarás. El precio no cambia durante el viaje.' },
  { key: 'billetera', title: 'Paga con Yape o Plin', text: 'Pagas al pedir, sin recargas ni efectivo. Tu pago queda protegido y solo se libera al conductor cuando llegas.' },
];

// Reclamo abierto de ejemplo (el dinero sigue retenido hasta que el admin lo resuelva)
export const INITIAL_DISPUTES = [
  {
    id: 'dp1', reason: 'No llegué a mi destino', amount: 3, status: 'open', createdAt: at(0, 7, 52),
    trip: {
      id: 'h5', category: 'mototaxi', discount: 0, toPay: 3,
      origin: PLACES.find((p) => p.id === 'terminal'), dest: PLACES.find((p) => p.id === 'ovalo'),
      price: { driverFare: 2.5, margin: 0.5, final: 3 }, driver: { name: 'Pedro Quispe', plate: 'MT-7788' },
    },
  },
];
