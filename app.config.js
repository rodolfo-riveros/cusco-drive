// Config dinámica: toma la API key de Google Maps del entorno (archivo .env local o variable de EAS).
// La key nunca se guarda en el repositorio.
module.exports = ({ config }) => {
  const key = process.env.GOOGLE_MAPS_API_KEY || '';
  return {
    ...config,
    android: {
      ...config.android,
      ...(key ? { config: { ...(config.android?.config || {}), googleMaps: { apiKey: key } } } : {}),
    },
    extra: {
      ...config.extra,
      googleMaps: !!key,
    },
  };
};
