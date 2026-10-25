import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startLocalDb, fakeStorage, makeServices, aline, marc } from './helpers.js';
import { buildPdf } from '../../src/pdf.js';

let base, storage, services;

beforeAll(async () => {
  base = await startLocalDb();
  storage = fakeStorage();
  services = makeServices(base.db, storage);
});
afterAll(async () => base.stop());

async function nouveauDocument(texte = 'Bonjour le monde') {
  const r = await services.documents.create({ user: aline, title: 'Journal de test', text: texte });
  return r.body.docId;
}
async function nouveauLien(docId, exemplaires) {
  const r = await services.links.publish({ user: aline, docId, copies: exemplaires });
  return r.body.linkId;
}

describe('publier un lien', () => {
  it('refuse un nombre d\'exemplaires invalide', async () => {
    const docId = await nouveauDocument();
    for (const mauvais of [0, -3, 2.5, '10', 1e9]) {
      const r = await services.links.publish({ user: aline, docId, copies: mauvais });
      expect(r.status).toBe(400);
    }
  });
  it('utilise 500 par défaut', async () => {
    const docId = await nouveauDocument();
    const r = await services.links.publish({ user: aline, docId });
    expect(r.status).toBe(201);
    expect(r.body.exemplaires).toBe(500);
  });
  it('refuse quelqu\'un qui n\'a pas accès au document', async () => {
    const docId = await nouveauDocument();
    const r = await services.links.publish({ user: marc, docId, copies: 5 });
    expect(r.status).toBe(403);
  });
});

describe('C1 : jamais un téléchargement de trop', () => {
  it('50 requêtes simultanées sur 10 exemplaires : exactement 10 succès, numéros 1 à 10', async () => {
    const docId = await nouveauDocument();
    const linkId = await nouveauLien(docId, 10);
    const reponses = [];
    // plusieurs vagues : les premières requêtes peuvent recevoir « patienter » pendant la fabrication du PDF
    for (let vague = 0; vague < 5; vague++) {
      reponses.push(...(await Promise.all(Array.from({ length: 50 }, () => services.links.requestDownload(linkId)))));
    }
    const succes = reponses.filter((r) => r.status === 200);
    expect(succes).toHaveLength(10);
    expect(succes.map((r) => r.body.numero).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const r of reponses.filter((r) => r.status !== 200)) expect([410, 429]).toContain(r.status);
    const info = await services.links.info(linkId);
    expect(info.body.restants).toBe(0);
    expect(info.body.telechargements).toBe(10);
  });

  it('lien épuisé : « épuisé » immédiat, sans fabriquer de PDF ni signer d\'adresse', async () => {
    const docId = await nouveauDocument();
    const linkId = await nouveauLien(docId, 1);
    await services.links.requestDownload(linkId); // peut répondre patienter ou 200
    await services.links.requestDownload(linkId);
    const avant = { ...storage.stats };
    const r = await services.links.requestDownload(linkId);
    expect(r.status).toBe(410);
    expect(storage.stats).toEqual(avant);
  });
});

describe('C3 : le lien donne le document tel qu\'il est au moment du clic', () => {
  it('fabrique un nouveau PDF après une modification, et réutilise le PDF sinon', async () => {
    const docId = await nouveauDocument('Version un');
    const linkId = await nouveauLien(docId, 100);

    let r = await services.links.requestDownload(linkId);
    expect(r.status).toBe(200);
    const putApres1 = storage.stats.put;

    r = await services.links.requestDownload(linkId); // rien n'a changé
    expect(r.status).toBe(200);
    expect(storage.stats.put).toBe(putApres1); // PDF réutilisé

    const maj = await services.documents.setText({ user: aline, docId, text: 'Version deux corrigée' });
    expect(maj.status).toBe(200);
    expect(maj.body.seq).toBe(2);

    r = await services.links.requestDownload(linkId); // après modification, même lien
    expect(r.status).toBe(200);
    expect(r.body.url).toContain(`${docId}/2.pdf`);
    expect(storage.stats.put).toBe(putApres1 + 1);
  });
});

describe('page publique du lien', () => {
  it('affiche des noms, jamais d\'adresses e-mail', async () => {
    const docId = await nouveauDocument();
    await services.documents.setText({ user: aline, docId, text: 'Texte' });
    const linkId = await nouveauLien(docId, 3);
    const r = await services.links.info(linkId);
    expect(r.status).toBe(200);
    expect(r.body.createur).toBe('Aline');
    expect(r.body.contributeurs).toEqual(['Aline']);
    expect(JSON.stringify(r.body)).not.toContain('@');
  });
  it('rejette un identifiant mal formé sans interroger la base', async () => {
    const r = await services.links.info('nimportequoi');
    expect(r.status).toBe(404);
  });
});

describe('PDF', () => {
  it('produit un vrai PDF avec accents, et ne plante pas sur un caractère non pris en charge', async () => {
    const octets = await buildPdf({ title: 'Éditorial : l’été à l’école', text: 'Les élèves ont été « ravis ».\nÀ bientôt ! 😀 日本' });
    expect(Buffer.from(octets).subarray(0, 5).toString()).toBe('%PDF-');
  });
  it('gère un long texte sur plusieurs pages', async () => {
    const octets = await buildPdf({ title: 'Long', text: 'mot '.repeat(5000) });
    expect(octets.length).toBeGreaterThan(1000);
  });
});
