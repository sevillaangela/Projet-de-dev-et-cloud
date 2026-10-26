import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startLocalDb, fakeStorage, aline, marc } from './helpers.js';
import { buildServices } from '../../src/wiring.js';
import { config } from '../../src/config.js';
import { cleanInviteLink } from '../../src/validation.js';

let base, envoyes, services, panne;

beforeAll(async () => {
  base = await startLocalDb();
  envoyes = [];
  panne = false;
  const mailer = {
    async sendInvitation(m) {
      if (panne) throw new Error('SES indisponible');
      envoyes.push(m);
    },
  };
  const cfg = { ...config, docsTable: 'docs', linksTable: 'links' };
  services = buildServices({ db: base.db, storage: fakeStorage(), cfg, mailer });
});
afterAll(async () => base.stop());

const lienDe = (docId) => `https://exemple.test/editeur.html?id=${docId}`;

async function nouveauDocument() {
  const r = await services.documents.create({ user: aline, title: 'Journal', text: 'Bonjour' });
  return r.body.docId;
}

describe('invitation par e-mail', () => {
  it('donne accès ET envoie un mail avec le bon lien', async () => {
    const docId = await nouveauDocument();
    expect((await services.documents.lire({ user: marc, docId })).status).toBe(403);
    const r = await services.documents.inviter({ user: aline, docId, email: 'Marc@Exemple.fr', link: lienDe(docId) });
    expect(r.status).toBe(201);
    expect(r.body.mailEnvoye).toBe(true);
    expect(envoyes.at(-1)).toMatchObject({ to: 'marc@exemple.fr', inviterName: 'Aline', link: lienDe(docId) });
    expect((await services.documents.lire({ user: marc, docId })).status).toBe(200);
  });

  it('accorde l\'accès même si l\'envoi du mail échoue', async () => {
    const docId = await nouveauDocument();
    panne = true;
    const r = await services.documents.inviter({ user: aline, docId, email: marc.email, link: lienDe(docId) });
    panne = false;
    expect(r.status).toBe(201);
    expect(r.body.mailEnvoye).toBe(false);
    expect((await services.documents.lire({ user: marc, docId })).status).toBe(200);
  });

  it('n\'envoie pas de mail si le lien est absent ou suspect, mais invite quand même', async () => {
    const docId = await nouveauDocument();
    const avant = envoyes.length;
    const r = await services.documents.inviter({ user: aline, docId, email: marc.email, link: 'https://pirate.test/phishing' });
    expect(r.status).toBe(201);
    expect(r.body.mailEnvoye).toBe(false);
    expect(envoyes.length).toBe(avant);
  });

  it('seul le propriétaire peut inviter', async () => {
    const docId = await nouveauDocument();
    const r = await services.documents.inviter({ user: marc, docId, email: 'x@exemple.fr', link: lienDe(docId) });
    expect(r.status).toBe(403);
  });
});

describe('validation du lien d\'invitation', () => {
  it('accepte uniquement l\'éditeur de ce document', () => {
    expect(cleanInviteLink('https://a.trycloudflare.com/editeur.html?id=abc', 'abc')).toBeTruthy();
    expect(cleanInviteLink('http://127.0.0.1:47231/editeur.html?id=abc', 'abc')).toBeTruthy();
    for (const mauvais of [
      'https://a.test/editeur.html?id=autre', 'https://a.test/autre.html?id=abc', 'javascript:alert(1)',
      'https://a.test/editeur.html?id=abc&x=1', 'https://u:p@a.test/editeur.html?id=abc', 'pas une url', undefined, 42,
    ]) expect(cleanInviteLink(mauvais, 'abc')).toBeNull();
  });
});
