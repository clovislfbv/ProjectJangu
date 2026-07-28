export const environment = {
  production: false,
  // Les clés API ne doivent jamais être stockées ici : ce fichier est inclus dans le bundle public.
  // En local, elles sont lues par proxy.conf.cjs depuis des variables d'environnement.
  apiBaseUrl: '/api'
};
