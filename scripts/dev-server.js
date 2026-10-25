// Serveur LOCAL facultatif : fait tourner les mêmes routes que sur AWS, avec une fausse
// base (dynalite) et un faux S3 en mémoire. Utile pour essayer sans déployer :
//   node scripts/dev-server.js       (puis API_URL=http://127.0.0.1:3000 ...)
import http from 'node:http';
import { startLocalDb, makeServices } from '../tests/unit/helpers.js';
import { router } from '../src/http.js';
import { publicRoutes, editorRoutes } from '../src/wiring.js';

const PORT = Number(process.env.PORT ?? 3000);
const base = `http://127.0.0.1:${PORT}`;
const { db } = await startLocalDb();

const objets = new Map();
const storage = {
  async putPdf(key, bytes) { objets.set(key, bytes); },
  async presignGet(key) { return `${base}/_s3/${key}`; },
};
const services = makeServices(db, storage);
const routes = { ...publicRoutes(services), ...editorRoutes(services) };
const handler = router(routes);

// « METHODE /chemin/{param} » -> expression régulière
const motifs = Object.keys(routes).map((cle) => {
  const [methode, chemin] = cle.split(' ');
  const noms = [];
  const re = new RegExp('^' + chemin.replace(/\{(\w+)\}/g, (_, n) => (noms.push(n), '([^/]+)')) + '$');
  return { cle, methode, re, noms };
});

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  'Access-Control-Allow-Headers': 'content-type,x-user-email,x-user-name',
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, base);
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS).end(); return; }
  if (url.pathname.startsWith('/_s3/')) {
    const octets = objets.get(decodeURIComponent(url.pathname.slice(5)));
    if (!octets) { res.writeHead(404, CORS).end(); return; }
    res.writeHead(200, { ...CORS, 'Content-Type': 'application/pdf' }).end(Buffer.from(octets));
    return;
  }
  let corps = '';
  for await (const morceau of req) corps += morceau;
  let event = { routeKey: 'INCONNUE', headers: req.headers, body: corps || undefined, isBase64Encoded: false, pathParameters: {} };
  for (const m of motifs) {
    const r = m.methode === req.method && m.re.exec(url.pathname);
    if (r) {
      event.routeKey = m.cle;
      event.pathParameters = Object.fromEntries(m.noms.map((n, i) => [n, decodeURIComponent(r[i + 1])]));
      break;
    }
  }
  const out = await handler(event);
  res.writeHead(out.statusCode, { ...CORS, ...out.headers }).end(out.body);
}).listen(PORT, '127.0.0.1', () => console.log(`Serveur local sur ${base}`));
