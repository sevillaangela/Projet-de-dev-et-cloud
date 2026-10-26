// Règles métier des documents (version minimale du bloc 1).
import { randomBytes } from 'node:crypto';
import { cleanEmail, cleanTitle, cleanSubtitle, cleanText } from '../validation.js';

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
        subtitle: '',
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
        body: { docId, titre: doc.title, sousTitre: doc.subtitle ?? '', texte: doc.text ?? '', seq: doc.seq, proprietaire: doc.ownerName, estProprietaire: doc.ownerEmail === user.email },
      };
    },

    async setText({ user, docId, text, title, subtitle }) {
      const texte = cleanText(text);
      if (texte === null) {
        return { status: 400, body: { erreur: 'donnees_invalides', message: 'Texte invalide.' } };
      }
      const doc = await docs.get(docId);
      if (!doc) return { status: 404, body: { erreur: 'introuvable', message: 'Document introuvable.' } };
      if (!doc.members.has(user.email)) {
        return { status: 403, body: { erreur: 'acces_refuse', message: "Vous n'avez pas accès à ce document." } };
      }
      const titre = title === undefined ? doc.title : cleanTitle(title);
      const sousTitre = subtitle === undefined ? (doc.subtitle ?? '') : cleanSubtitle(subtitle);
      if (!titre || sousTitre === null) {
        return { status: 400, body: { erreur: 'donnees_invalides', message: 'Titre ou sous-titre invalide.' } };
      }
      const apres = await docs.setText(docId, { text: texte, title: titre, subtitle: sousTitre }, user, now());
      return { status: 200, body: { docId, titre, sousTitre, seq: apres.seq } };
    },

    async inviter({ user, docId, email }) {
      const adresse = cleanEmail(email);
      if (!adresse) {
        return { status: 400, body: { erreur: 'donnees_invalides', message: 'Adresse invalide.' } };
      }
      const doc = await docs.get(docId);
      if (!doc) return { status: 404, body: { erreur: 'introuvable', message: 'Document introuvable.' } };
      if (doc.ownerEmail !== user.email) {
        return { status: 403, body: { erreur: 'acces_refuse', message: 'Seul le propriétaire peut inviter.' } };
      }
      if (doc.members.has(adresse)) return { status: 200, body: { docId, dejaMembre: true } };
      const ok = await docs.addMember(docId, adresse);
      if (!ok) return { status: 404, body: { erreur: 'introuvable', message: 'Document introuvable.' } };
      return { status: 201, body: { docId, dejaMembre: false } };
    },
  };
}
