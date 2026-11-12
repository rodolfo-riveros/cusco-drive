export const C = {
  navy: '#12285C',
  navy2: '#1E3A7B',
  gold: '#F5A623',
  goldSoft: '#FFF4E0',
  green: '#2E9E44',
  greenSoft: '#E6F6EA',
  purple: '#6B3FA0',
  purpleSoft: '#F1EAFA',
  red: '#D93636',
  redSoft: '#FDECEC',
  yellowWarn: '#E0A100',
  bg: '#F5F7FB',
  white: '#FFFFFF',
  text: '#1B2333',
  sub: '#5E6B82',
  border: '#E3E8F0',
  muted: '#A3ADBF',
};

export const R = { sm: 10, md: 16, lg: 22, xl: 28 };

export const shadow = {
  shadowColor: '#12285C',
  shadowOpacity: 0.12,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 4,
};

export const money = (n) => `S/ ${(Math.round((n || 0) * 100) / 100).toFixed(2)}`;
