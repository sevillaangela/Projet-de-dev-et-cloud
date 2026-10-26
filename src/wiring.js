// Assemble les couches : accès aux données + règles métier + routes HTTP.
import { documentsRepo, linksRepo } from './repositories.js';
import { createDocumentService } from './services/documents.js';
import { createLinkService } from './services/links.js';
import { identify, parseBody, reply, json } from './http.js';

export function buildServices({ db, storage, cfg, now }) {
  const docs = documentsRepo(db, cfg.docsTable);
  const links = linksRepo(db, cfg.linksTable);
  return {
    documents: createDocumentService({ docs }),
    links: createLinkService({ links, docs, storage, cfg, now }),
  };
}

const identificationRequise = () =>
  json(401, { erreur: 'identification_requise', message: 'Nom et adresse e-mail requis.' });
const corpsInvalide = () => json(400, { erreur: 'corps_invalide', message: 'Le corps de la requête est invalide.' });

// Routes publiques : aucune identification, c'est le chemin du pic.
export const publicRoutes = ({ links }) => ({
  'GET /api/links/{linkId}': async (e) => reply(await links.info(e.pathParameters.linkId)),
  'POST /api/links/{linkId}/download': async (e) => reply(await links.requestDownload(e.pathParameters.linkId)),
});

// Routes des rédacteurs : identification requise.
export const editorRoutes = ({ documents, links }) => ({
  'GET /api/documents/{docId}': async (e) => {
    const user = identify(e);
    if (!user) return identificationRequise();
    return reply(await documents.lire({ user, docId: e.pathParameters.docId }));
  },
  'POST /api/documents': async (e) => {
    const user = identify(e);
    if (!user) return identificationRequise();
    const corps = parseBody(e);
    if (!corps) return corpsInvalide();
    return reply(await documents.create({ user, title: corps.titre, text: corps.texte }));
  },
  'PUT /api/documents/{docId}/texte': async (e) => {
    const user = identify(e);
    if (!user) return identificationRequise();
    const corps = parseBody(e);
    if (!corps) return corpsInvalide();
    return reply(await documents.setText({ user, docId: e.pathParameters.docId, text: corps.texte, title: corps.titre, subtitle: corps.sousTitre }));
  },
  'POST /api/documents/{docId}/invitations': async (e) => {
    const user = identify(e);
    if (!user) return identificationRequise();
    const corps = parseBody(e);
    if (!corps) return corpsInvalide();
    return reply(await documents.inviter({ user, docId: e.pathParameters.docId, email: corps.email }));
  },
  'POST /api/documents/{docId}/links': async (e) => {
    const user = identify(e);
    if (!user) return identificationRequise();
    const corps = parseBody(e);
    if (!corps) return corpsInvalide();
    return reply(await links.publish({ user, docId: e.pathParameters.docId, copies: corps.exemplaires }));
  },
});
