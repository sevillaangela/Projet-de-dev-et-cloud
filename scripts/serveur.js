// Serveur unique : les pages du site ET l'écriture à plusieurs (WebSocket), sur le même port.
// Un seul port à exposer sur Internet (tunnel), et une adresse unique à donner aux invités.
//   npm run serveur        puis ouvrir http://127.0.0.1:47231
import { Server } from '@hocuspocus/server'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const dossier = fileURLToPath(new URL('../src/web/', import.meta.url))
const port = Number(process.env.PORT ?? 47231)
// L'API AWS : sert à vérifier qu'une personne a bien accès au document avant de la laisser écrire.
const API = (process.env.API_URL ?? 'https://u6t0o0omz8.execute-api.eu-north-1.amazonaws.com').replace(/\/$/, '')

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
}

function cheminDemande(url) {
  const brut = decodeURIComponent((url ?? '/').split('?')[0])
  const relatif = brut === '/' ? 'index.html' : brut.replace(/^\/+/, '')
  const complet = normalize(join(dossier, relatif))
  return complet.startsWith(dossier.endsWith(sep) ? dossier : dossier + sep) ? complet : null
}

const pages = {
  async onRequest({ request, response }) {
    const chemin = cheminDemande(request.url)
    if (!chemin) {
      response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Interdit')
    } else {
      try {
        const contenu = await readFile(chemin)
        response.writeHead(200, { 'Content-Type': types[extname(chemin)] ?? 'application/octet-stream' }).end(contenu)
      } catch {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Page introuvable')
      }
    }
    throw null // la réponse est envoyée : on arrête les autres traitements
  },
}

// Qui a le droit d'écrire ? On pose la question à l'API (la même règle que partout ailleurs).
const acces = {
  async onAuthenticate({ token, documentName }) {
    let personne
    try {
      personne = JSON.parse(token)
    } catch {
      throw new Error('identité illisible')
    }
    const reponse = await fetch(`${API}/api/documents/${encodeURIComponent(documentName)}`, {
      headers: { 'x-user-email': String(personne.email), 'x-user-name': encodeURIComponent(String(personne.nom)) },
    })
    if (!reponse.ok) throw new Error('accès refusé')
    const doc = await reponse.json()
    return { nom: personne.nom, role: doc.estProprietaire ? 'proprio' : 'collab' }
  },
}

const serveur = new Server({ port, address: '127.0.0.1', quiet: true, extensions: [pages, acces] })
serveur.listen().then(() => console.log(`Site et écriture à plusieurs sur http://127.0.0.1:${port}`))
