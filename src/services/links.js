// Règles métier des liens de téléchargement : publier, informer, télécharger.
import { cleanCopies, isLinkId } from '../validation.js';
import { pdfKey } from '../storage.js';
import { ensurePdf } from './pdf-service.js';
import { newId } from './documents.js';

const introuvable = { status: 404, body: { etat: 'introuvable' } };

// Nom de fichier simple (sans accents ni caractères spéciaux) pour l'en-tête de téléchargement.
function nomFichier(titre) {
  const base = String(titre ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 40);
  return `${base || 'journal'}.pdf`;
}

export function createLinkService({ links, docs, storage, cfg, now = Date.now }) {
  const patienter = () => ({
    status: 429,
    headers: { 'Retry-After': String(cfg.retryAfterSeconds) },
    body: { etat: 'patienter', retryAfter: cfg.retryAfterSeconds },
  });
  const epuise = () => ({ status: 410, body: { etat: 'epuise' } });

  return {
    // Publier : crée un lien stable pour un document, avec le nombre d'exemplaires choisi.
    async publish({ user, docId, copies }) {
      const doc = await docs.get(docId);
      if (!doc) return { status: 404, body: { erreur: 'introuvable', message: 'Document introuvable.' } };
      if (!doc.members.has(user.email)) {
        return { status: 403, body: { erreur: 'acces_refuse', message: "Vous n'avez pas accès à ce document." } };
      }
      const total = cleanCopies(copies, { defaut: cfg.defaultCopies, max: cfg.maxCopies });
      if (total === null) {
        return {
          status: 400,
          body: { erreur: 'exemplaires_invalides', message: `Le nombre d'exemplaires doit être un entier de 1 à ${cfg.maxCopies}.` },
        };
      }
      const linkId = newId(16);
      await links.create({
        linkId,
        docId,
        creatorEmail: user.email,
        creatorName: user.name,
        total,
        remaining: total,
        createdAt: new Date(now()).toISOString(),
      });
      return { status: 201, body: { linkId, exemplaires: total, chemin: `/journal.html?id=${linkId}` } };
    },

    // Informations publiques de la page du journal (aucune adresse e-mail, seulement des noms).
    async info(linkId) {
      if (!isLinkId(linkId)) return introuvable;
      const lien = await links.get(linkId);
      if (!lien) return introuvable;
      const doc = await docs.get(lien.docId);
      if (!doc) return introuvable;
      return {
        status: 200,
        headers: { 'Cache-Control': 'public, max-age=2' },
        body: {
          linkId,
          titre: doc.title,
          createur: lien.creatorName,
          contributeurs: Object.values(doc.contributors ?? {}),
          derniereModification: doc.updatedAt,
          version: doc.seq,
          total: lien.total,
          restants: lien.remaining,
          telechargements: lien.total - lien.remaining,
          etat: lien.remaining > 0 ? 'disponible' : 'epuise',
        },
      };
    },

    // Télécharger : chemin critique du pic. Trois réponses possibles : 200, 429 (patienter), 410 (épuisé).
    async requestDownload(linkId) {
      if (!isLinkId(linkId)) return introuvable;

      const lien = await links.get(linkId);
      if (!lien) return introuvable;
      if (lien.remaining <= 0) return epuise(); // chemin rapide : ni PDF, ni écriture

      const doc = await docs.get(lien.docId, true); // lecture cohérente : version à jour
      if (!doc) return introuvable;

      // 1. le PDF de la version courante doit exister AVANT de décompter un exemplaire
      const pret = await ensurePdf({ docs, storage, cfg, now }, doc);
      if (!pret) return patienter();

      // 2. décompte atomique (contrainte C1)
      const apres = await links.consumeOne(linkId);
      if (!apres) return epuise();
      if (apres.remaining === 0) {
        // Une seule requête arrive ici. L'envoi de l'e-mail sera ajouté plus tard.
        console.log(JSON.stringify({ evt: 'dernier_exemplaire', linkId }));
      }

      // 3. adresse temporaire vers le PDF (calcul local, ne peut pas échouer sur le réseau)
      const url = await storage.presignGet(pdfKey(doc.docId, doc.seq), nomFichier(doc.title));
      return {
        status: 200,
        body: {
          etat: 'telechargement',
          url,
          numero: apres.total - apres.remaining, // 1, 2, 3... : sert de preuve dans les tests
          restants: apres.remaining,
        },
      };
    },
  };
}
