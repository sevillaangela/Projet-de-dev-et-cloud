// Test C1 : « un lien permet exactement le nombre de téléchargements autorisé »
// Usage : API_URL=https://xxxx.execute-api.eu-west-3.amazonaws.com node tests/load/c1-concurrence.mjs
// Variables facultatives : COPIES (500), REQUESTS (2000).
// Les résultats bruts (une ligne par requête) et le résumé sont écrits dans tests/results/.
import { Agent, setGlobalDispatcher } from 'undici';
import { mkdirSync, writeFileSync } from 'node:fs';

const API = (process.env.API_URL ?? '').replace(/\/$/, '');
const COPIES = Number(process.env.COPIES ?? 500);
const REQUESTS = Number(process.env.REQUESTS ?? 2000);
if (!API) { console.error('Définir API_URL (adresse de base de l\'API).'); process.exit(1); }

setGlobalDispatcher(new Agent({ connections: REQUESTS, pipelining: 1 }));

const entetes = { 'Content-Type': 'application/json', 'X-User-Email': 'test@exemple.fr', 'X-User-Name': 'Testeur' };
const appel = async (methode, chemin, corps) => {
  const r = await fetch(API + chemin, { method: methode, headers: entetes, body: corps ? JSON.stringify(corps) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
};

// 1. Préparer un document et un lien
const doc = await appel('POST', '/api/documents', { titre: 'Test C1', texte: 'Texte du test de concurrence.' });
const lien = await appel('POST', `/api/documents/${doc.body.docId}/links`, { exemplaires: COPIES });
if (lien.status !== 201) { console.error('Création du lien impossible', lien); process.exit(1); }
const linkId = lien.body.linkId;
console.log(`Lien créé avec ${COPIES} exemplaires. Envoi de ${REQUESTS} requêtes simultanées...`);

// 2. Première vague : toutes les requêtes en même temps. Puis on relance celles qui ont reçu
//    « patienter » ou une erreur temporaire, comme le ferait un navigateur.
const brut = []; // une ligne par réponse, conservée telle quelle
const tirer = async (vague, id) => {
  const t0 = performance.now();
  let status = 0, body = null;
  try { ({ status, body } = await appel('POST', `/api/links/${linkId}/download`)); }
  catch (e) { status = -1; body = { erreur: String(e.cause?.code ?? e.message) }; }
  const ms = Math.round(performance.now() - t0);
  brut.push({ vague, id, status, ms, etat: body?.etat ?? body?.erreur, numero: body?.numero, url: body?.url });
  return status;
};
let attente = Array.from({ length: REQUESTS }, (_, i) => i);
for (let vague = 1; vague <= 30 && attente.length; vague++) {
  const statuts = await Promise.all(attente.map((id) => tirer(vague, id)));
  attente = attente.filter((_, i) => ![200, 410, 404].includes(statuts[i]));
  console.log(`vague ${vague} : ${statuts.length} requêtes, restent ${attente.length} à relancer`);
  if (attente.length) await new Promise((ok) => setTimeout(ok, 1500));
}

// 3. Vérifications
const succes = brut.filter((r) => r.status === 200);
const numeros = succes.map((r) => r.numero).sort((a, b) => a - b);
const attendus = Array.from({ length: Math.min(COPIES, REQUESTS) }, (_, i) => i + 1);
const numerosOk = numeros.length === attendus.length && numeros.every((n, i) => n === attendus[i]);
const info = await appel('GET', `/api/links/${linkId}`);
const comptes = {};
for (const r of brut) comptes[r.status] = (comptes[r.status] ?? 0) + 1;
const ms = brut.map((r) => r.ms).sort((a, b) => a - b);
const pct = (p) => ms[Math.min(ms.length - 1, Math.floor((p / 100) * ms.length))];

// Contrôle de bout en bout : l'adresse signée donne bien un PDF
let pdfOk = null;
if (succes[0]) {
  const f = await fetch(succes[0].url);
  const debut = Buffer.from(await f.arrayBuffer()).subarray(0, 5).toString();
  pdfOk = f.status === 200 && debut === '%PDF-';
}

const resume = {
  date: new Date().toISOString(), api: API, exemplairesAutorises: COPIES, requetesInitiales: REQUESTS,
  reponsesTotales: brut.length, reponsesParStatut: comptes,
  succes: succes.length, numerosDistinctsEtComplets: numerosOk,
  restantsSelonLApi: info.body?.restants, telechargementsSelonLApi: info.body?.telechargements,
  millisecondes: { p50: pct(50), p95: pct(95), max: ms[ms.length - 1] },
  pdfDeBoutEnBoutOk: pdfOk,
  verdict: succes.length === Math.min(COPIES, REQUESTS) && numerosOk && info.body?.restants === Math.max(0, COPIES - succes.length) ? 'C1 RESPECTEE' : 'C1 NON RESPECTEE',
};
mkdirSync('tests/results', { recursive: true });
const horo = new Date().toISOString().replace(/[:.]/g, '-');
writeFileSync(`tests/results/c1-${horo}-brut.jsonl`, brut.map((r) => JSON.stringify({ ...r, url: undefined })).join('\n'));
writeFileSync(`tests/results/c1-${horo}-resume.json`, JSON.stringify(resume, null, 2));
console.log(JSON.stringify(resume, null, 2));
process.exit(resume.verdict === 'C1 RESPECTEE' ? 0 : 2);
