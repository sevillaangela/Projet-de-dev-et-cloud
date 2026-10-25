// Outils HTTP communs : réponses JSON, identification, routage, erreurs.
import { cleanEmail, cleanName } from './validation.js';

export const json = (status, body, headers = {}) => ({
  statusCode: status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  },
  body: JSON.stringify(body),
});

// Identification déclarative (le sujet n'exige pas de vrais comptes) :
// en-têtes X-User-Email et X-User-Name (ce dernier encodé avec encodeURIComponent).
export function identify(event) {
  const h = event.headers ?? {};
  let nomBrut = h['x-user-name'];
  try {
    nomBrut = nomBrut === undefined ? undefined : decodeURIComponent(nomBrut);
  } catch {
    return null;
  }
  const email = cleanEmail(h['x-user-email']);
  const name = cleanName(nomBrut);
  return email && name ? { email, name } : null;
}

export function parseBody(event) {
  if (!event.body) return {};
  const brut = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf8')
    : event.body;
  try {
    const valeur = JSON.parse(brut);
    return valeur && typeof valeur === 'object' ? valeur : null;
  } catch {
    return null;
  }
}

// Une limitation d'AWS (trop de requêtes) n'est pas une panne :
// on la présente comme « patienter », jamais comme une erreur 5xx.
const LIMITATIONS = new Set([
  'ProvisionedThroughputExceededException',
  'ThrottlingException',
  'RequestLimitExceeded',
  'TooManyRequestsException',
]);

function reponseErreur(err) {
  console.error(JSON.stringify({ niveau: 'erreur', nom: err?.name, message: err?.message }));
  if (LIMITATIONS.has(err?.name)) {
    return json(429, { etat: 'patienter', retryAfter: 2 }, { 'Retry-After': '2' });
  }
  return json(
    503,
    { erreur: 'indisponible', message: 'Service momentanément indisponible, réessayez.' },
    { 'Retry-After': '2' },
  );
}

// Associe « MÉTHODE /chemin » (routeKey de l'API HTTP) à une fonction.
export function router(routes) {
  return async (event) => {
    const route = routes[event.routeKey];
    if (!route) return json(404, { erreur: 'route_inconnue', message: 'Route inconnue.' });
    try {
      return await route(event);
    } catch (err) {
      return reponseErreur(err);
    }
  };
}

export const reply = (r) => json(r.status, r.body, r.headers);
