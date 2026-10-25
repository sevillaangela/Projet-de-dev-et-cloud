// Validation des entrées : on ne fait jamais confiance à ce qui arrive du navigateur.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function cleanEmail(valeur) {
  if (typeof valeur !== 'string') return null;
  const email = valeur.trim().toLowerCase();
  return email.length <= 254 && EMAIL.test(email) ? email : null;
}

export function cleanName(valeur) {
  if (typeof valeur !== 'string') return null;
  const nom = valeur.trim();
  return nom.length >= 1 && nom.length <= 60 ? nom : null;
}

export function cleanTitle(valeur) {
  if (typeof valeur !== 'string') return null;
  const titre = valeur.trim();
  return titre.length >= 1 && titre.length <= 120 ? titre : null;
}

export function cleanText(valeur) {
  if (typeof valeur !== 'string') return null;
  return valeur.length <= 100000 ? valeur : null;
}

// Nombre d'exemplaires : entier entre 1 et le maximum ; absent = valeur par défaut.
export function cleanCopies(valeur, { defaut, max }) {
  if (valeur === undefined || valeur === null) return defaut;
  if (!Number.isInteger(valeur) || valeur < 1 || valeur > max) return null;
  return valeur;
}

// Identifiant de lien : 16 octets aléatoires encodés en base64url = 22 caractères.
export const isLinkId = (valeur) =>
  typeof valeur === 'string' && /^[A-Za-z0-9_-]{22}$/.test(valeur);
