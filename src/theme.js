// Tokens de la guía de estilo de Cusco Drive (v1)
export const C = {
  navy: '#12285C',
  navy2: '#1E3A7B',
  navyDeep: '#0B1A3D',
  navySoft: '#E8ECF6',
  navyText: '#C9D3EA',
  gold: '#F5A623',
  goldSoft: '#FFF4DF',
  goldText: '#7A4B00',
  green: '#2E9E44',
  greenSoft: '#E6F4E9',
  greenText: '#1D6B2D',
  purple: '#6B3FA0',
  purpleSoft: '#F0EAF7',
  purpleText: '#4B2575',
  purpleTrack: '#DCCFEC',
  red: '#D32F2F',
  redSoft: '#FDECEC',
  redText: '#A61B1B',
  orange: '#C2571A',
  orangeSoft: '#FBEBE1',
  orangeText: '#8A3A10',
  yellowWarn: '#E0A100',
  bg: '#F6F7FA',
  mapBg: '#EEF1F4',
  white: '#FFFFFF',
  text: '#1B2333',
  sub: '#5B6478',
  border: '#E3E7EE',
  line: '#D5DAE4',
  muted: '#A3ADBF',
};

// Familias: Poppins para títulos y precios, Nunito para texto.
export const F = {
  title: 'Poppins_700Bold',
  price: 'Poppins_800ExtraBold',
  regular: 'Nunito_400Regular',
  semi: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  black: 'Nunito_800ExtraBold',
};

export const R = { sm: 10, md: 16, lg: 22, xl: 28 };

export const shadow = {
  shadowColor: '#12285C',
  shadowOpacity: 0.14,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 4 },
  elevation: 4,
};

export const money = (n) => `S/ ${(Math.round((n || 0) * 100) / 100).toFixed(2)}`;
export const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${money(Math.abs(n))}`;
