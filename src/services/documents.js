// Règles métier des documents (version minimale du bloc 1).
import { randomBytes } from 'node:crypto';
import { cleanTitle, cleanText } from '../validation.js';

export const newId = (octets = 16) => randomBytes(octets).toString('base64url');

export function createDocumentService({ docs, now = () => new Date().toISOString() }) {
  return {
    async create({ user, title, text }) {
      const titre = cleanTitle(title);
      const texte = text === undefined ? '' : cleanText(text);
      if (!titre || texte === null) {
        return { status: 400, body: { erreur: 'donnees_invalides', message: 'Titre ou texte invalide.' } };
      }
      const docId = newId(12);
      const maintenant = now();
      await docs.create({
        docId,
        title: titre,
        text: texte,
        ownerEmail: user.email,
        ownerName: user.name,
        members: new Set([user.email]), // personnes ayant accès au document
        contributors: {}, // adresse -> nom, rempli à chaque modification acceptée
        seq: 1, // numéro de version courante, augmente à chaque modification
        createdAt: maintenant,
        updatedAt: maintenant,
      });
      return { status: 201, body: { docId, titre, seq: 1 } };
    },

    async lire({ user, docId }) {
      const doc = await docs.get(docId);
      if (!doc) return { status: 404, body: { erreur: 'introuvable', message: 'Document introuvable.' } };
      if (!doc.members.has(user.email)) {
        return { status: 403, body: { erreur: 'acces_refuse', message: "Vous n'avez pas accès à ce document." } };
      }
      return {
        status: 200,
        body: { docId, titre: doc.title, texte: doc.text ?? '', seq: doc.seq, proprietaire: doc.ownerName },
      };
    },

    async setText({ user, docId, text }) {
      const texte = cleanText(text);
      if (texte === null) {
        return { status: 400, body: { erreur: 'donnees_invalides', message: 'Texte invalide.' } };
      }
      const doc = await docs.get(docId);
      if (!doc) return { status: 404, body: { erreur: 'introuvable', message: 'Document introuvable.' } };
      if (!doc.members.has(user.email)) {
        return { status: 403, body: { erreur: 'acces_refuse', message: "Vous n'avez pas accès à ce document." } };
      }
      const apres = await docs.setText(docId, texte, user, now());
      return { status: 200, body: { docId, seq: apres.seq } };
    },
  };
}
