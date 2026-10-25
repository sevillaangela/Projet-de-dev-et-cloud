// Réglages de l'application, lus dans les variables d'environnement.
// Aucun secret ici : seulement des noms de ressources et des paramètres.
const num = (valeur, parDefaut) =>
  valeur === undefined || valeur === '' ? parDefaut : Number(valeur);

export const config = {
  docsTable: process.env.DOCS_TABLE,
  linksTable: process.env.LINKS_TABLE,
  pdfBucket: process.env.PDF_BUCKET,
  defaultCopies: num(process.env.DEFAULT_COPIES, 500),
  maxCopies: num(process.env.MAX_COPIES, 100000),
  presignSeconds: num(process.env.PRESIGN_SECONDS, 60),
  pdfLockSeconds: num(process.env.PDF_LOCK_SECONDS, 30),
  retryAfterSeconds: num(process.env.RETRY_AFTER_SECONDS, 2),
};
