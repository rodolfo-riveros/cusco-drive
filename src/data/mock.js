// Datos de ejemplo (sin base de datos). Todo vive en memoria mientras la app está abierta.

export const URUBAMBA_CENTER = { latitude: -13.3048, longitude: -72.116 };
export const SERVICE_RADIUS_KM = 9;

export const CATEGORIES = [
  { id: 'mototaxi', name: 'Mototaxi', emoji: '🛺', color: '#F5A623', desc: 'Viajes cortos en la ciudad', seats: 3 },
  { id: 'taxi', name: 'Taxi', emoji: '🚕', color: '#12285C', desc: 'Más comodidad, hasta 4 pasajeros', seats: 4 },
  { id: 'motocarga', name: 'Motocarga', emoji: '📦', color: '#2E9E44', desc: 'Paquetes y compras del mercado', cargo: true },
  { id: 'mudanza', name: 'Mudanza', emoji: '🚚', color: '#6B3FA0', desc: 'Camioneta para carga pesada', cargo: true },
];

export const catById = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];

// Tarifario: lo configura el administrador (aquí editable desde "Panel admin demo")
export const INITIAL_CONFIG = {
  tariffs: {
    mototaxi: { base: 1.5, perKm: 0.7, min: 2.5 },
    taxi: { base: 3.0, perKm: 1.2, min: 5.0 },
    motocarga: { base: 3.0, perKm: 1.0, min: 4.0 },
    mudanza: { base: 30, perKm: 3.0, min: 40 },
  },
  commission: {
    mototaxi: { type: 'fixed', value: 0.4 },
    taxi: { type: 'percent', value: 8 },
    motocarga: { type: 'percent', value: 10 },
    mudanza: { type: 'percent', value: 10 },
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
  rounding: 'none', // 'none' | '0.50'
  raining: false,
  rewardsCapPct: 30,
  pointsPerReward: 20,
  pointsRewardAmount: 3,
  couponMaxValue: 5,
  couponExpiryDays: 60,
  minDriverBalance: 0.4,
  lowBalanceAlert: 2,
  driverBonuses: [
    { trips: 30, amount: 5 },
    { trips: 60, amount: 12 },
  ],
};

export const PLACES = [
  { id: 'plaza', name: 'Plaza de Armas', sub: 'Centro de Urubamba', icon: 'business', latitude: -13.3048, longitude: -72.116 },
  { id: 'mercado', name: 'Mercado Central', sub: 'Jr. Grau', icon: 'basket', latitude: -13.3062, longitude: -72.1138 },
  { id: 'terminal', name: 'Terminal Terrestre', sub: 'Salida a Cusco', icon: 'bus', latitude: -13.3079, longitude: -72.1215 },
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
  { id: 'd1', name: 'Juan Mamani', category: 'mototaxi', vehicle: 'Bajaj RE · Azul', plate: 'MT-4521', rating: 4.9, trips: 1240, star: true, latitude: -13.3035, longitude: -72.1175, phone: '987654321', color: '#F5A623' },
  { id: 'd2', name: 'Rosa Huamán', category: 'mototaxi', vehicle: 'TVS King · Rojo', plate: 'MT-3310', rating: 4.8, trips: 860, latitude: -13.3068, longitude: -72.1128, phone: '987111222', color: '#D93636' },
  { id: 'd3', name: 'Pedro Quispe', category: 'mototaxi', vehicle: 'Bajaj RE · Amarillo', plate: 'MT-7788', rating: 4.7, trips: 530, latitude: -13.3021, longitude: -72.1199, phone: '987333444', color: '#2E9E44' },
  { id: 'd4', name: 'Carlos Ccori', category: 'taxi', vehicle: 'Toyota Yaris · Blanco', plate: 'X2T-541', rating: 4.9, trips: 2100, star: true, latitude: -13.3055, longitude: -72.1185, phone: '987555666', color: '#12285C' },
  { id: 'd5', name: 'Marco Condori', category: 'taxi', vehicle: 'Kia Rio · Plata', plate: 'X4B-902', rating: 4.6, trips: 640, latitude: -13.3008, longitude: -72.1141, phone: '987777888', color: '#5E6B82' },
  { id: 'd6', name: 'Luis Apaza', category: 'motocarga', vehicle: 'Motocarga Wanxin', plate: 'MC-1205', rating: 4.8, trips: 410, latitude: -13.3071, longitude: -72.1162, phone: '987999000', color: '#2E9E44' },
  { id: 'd7', name: 'Hilda Puma', category: 'motocarga', vehicle: 'Motocarga Zongshen', plate: 'MC-0871', rating: 4.7, trips: 300, latitude: -13.3029, longitude: -72.1121, phone: '986111333', color: '#6B3FA0' },
  { id: 'd8', name: 'Transportes Valle', category: 'mudanza', vehicle: 'Hyundai H100 · Furgón', plate: 'C5K-221', rating: 4.9, trips: 190, latitude: -13.3089, longitude: -72.1188, phone: '986222444', color: '#6B3FA0' },
];

export const PASSENGER_NAMES = ['Lucía', 'Andrés', 'Doña Martha', 'Kevin', 'Sonia', 'Don Julio', 'Valeria', 'Ruth'];

const daysAgo = (d, h = 10) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(h, 15, 0, 0);
  return t.toISOString();
};

export const INITIAL_HISTORY = [
  { id: 'h1', date: daysAgo(1, 8), category: 'mototaxi', origin: 'Plaza de Armas', dest: 'Mercado Central', driverName: 'Juan Mamani', plate: 'MT-4521', driverFare: 2.5, commission: 0.4, surcharge: 0, discount: 0, final: 2.9, status: 'completed', rating: 5 },
  { id: 'h2', date: daysAgo(2, 18), category: 'taxi', origin: 'Terminal Terrestre', dest: 'Yanahuara', driverName: 'Carlos Ccori', plate: 'X2T-541', driverFare: 9.6, commission: 0.8, surcharge: 0, discount: 1, final: 9.4, status: 'completed', rating: 5, coupon: 'Cupón de bienvenida' },
  { id: 'h3', date: daysAgo(4, 7), category: 'mototaxi', origin: 'Hospital de Urubamba', dest: 'Colegio La Salle', driverName: 'Rosa Huamán', plate: 'MT-3310', driverFare: 2.5, commission: 0.4, surcharge: 0, discount: 0, final: 2.9, status: 'completed', rating: 4 },
  { id: 'h4', date: daysAgo(6, 12), category: 'motocarga', origin: 'Mercado Central', dest: 'Chicón', driverName: 'Luis Apaza', plate: 'MC-1205', driverFare: 6.5, commission: 0.7, surcharge: 0, discount: 0, final: 7.2, status: 'completed', rating: 5 },
  { id: 'h5', date: daysAgo(9, 20), category: 'mototaxi', origin: 'Estadio Municipal', dest: 'Plaza de Armas', driverName: '—', plate: '—', driverFare: 2.5, commission: 0.4, surcharge: 0, discount: 0, final: 2.9, status: 'cancelled', cancelReason: 'Cambié de planes' },
];

const inDays = (d) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  return t.toISOString();
};

export const INITIAL_COUPONS = [
  { id: 'c1', title: 'Cupón de bienvenida', type: 'welcome', amount: 1, expiresAt: inDays(30), used: false },
  { id: 'c2', title: 'Racha semanal', type: 'streak', amount: 1.5, expiresAt: inDays(5), used: false },
];

export const INITIAL_DRIVER = {
  name: 'Juan Mamani Ccori',
  phone: '987654321',
  dni: '45879632',
  category: 'mototaxi',
  vehicle: 'Bajaj RE 205 · Azul',
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
};

export const INITIAL_MOVEMENTS = [
  { id: 'm1', date: daysAgo(0, 9), type: 'commission', label: 'Comisión viaje Plaza → Mercado', amount: -0.4 },
  { id: 'm2', date: daysAgo(0, 8), type: 'commission', label: 'Comisión viaje Terminal → Hospital', amount: -0.4 },
  { id: 'm3', date: daysAgo(1, 19), type: 'recharge', label: 'Recarga por Yape', amount: 10 },
  { id: 'm4', date: daysAgo(2, 11), type: 'bonus', label: 'Bono semanal (30 viajes)', amount: 5 },
  { id: 'm5', date: daysAgo(3, 16), type: 'refund', label: 'Reembolso cupón de pasajero', amount: 1 },
];

// Ganancias de los últimos 7 días (índice 6 = hoy)
export const INITIAL_EARNINGS_WEEK = [
  { trips: 24, gross: 74.4, commission: 9.6 },
  { trips: 28, gross: 86.2, commission: 11.2 },
  { trips: 19, gross: 60.1, commission: 7.6 },
  { trips: 31, gross: 97.5, commission: 12.4 },
  { trips: 26, gross: 80.6, commission: 10.4 },
  { trips: 22, gross: 69.0, commission: 8.8 },
  { trips: 8, gross: 24.8, commission: 3.2 },
];

export const PENDING_DRIVERS = [
  { id: 'p1', name: 'Wilber Choque', category: 'mototaxi', plate: 'MT-9012', docs: 5, date: daysAgo(1) },
  { id: 'p2', name: 'Nancy Sutta', category: 'motocarga', plate: 'MC-2233', docs: 4, date: daysAgo(2) },
];

export const CANCEL_REASONS = ['El conductor tarda mucho', 'Cambié de planes', 'Me equivoqué de destino', 'Encontré otro transporte', 'Otro motivo'];
export const DRIVER_CANCEL_REASONS = ['El pasajero no aparece', 'Problema con el vehículo', 'Dirección incorrecta', 'Otro motivo'];
export const QUICK_MESSAGES = ['Ya voy', 'Estoy en la puerta', 'Llámame, por favor'];
export const RATING_TAGS = ['Puntual', 'Amable', 'Manejo seguro', 'Vehículo limpio', 'Buena ruta'];

export const ONBOARDING = [
  { emoji: '🛺', title: 'Pide tu movilidad', text: 'Mototaxi, taxi, motocarga o mudanza. Todo Urubamba en una sola app.' },
  { emoji: '💰', title: 'Precio claro y fijo', text: 'Ves el precio final antes de pedir. Sin regateo, sin sorpresas.' },
  { emoji: '🦙', title: 'Viaja seguro y gana premios', text: 'Conductores verificados, botón SOS y puntos en cada viaje.' },
];
