import { URUBAMBA_CENTER } from '../data/mock';

/** Puntos válidos para encuadrar el mapa. */
export const regionAround = (pts) => {
  const list = pts.filter(Boolean);
  return list.length ? list : [URUBAMBA_CENTER];
};
