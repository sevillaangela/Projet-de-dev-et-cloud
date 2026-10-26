import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const dossier = fileURLToPath(new URL('.', import.meta.url))
const port = Number(process.env.PORT ?? 47231)

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.ttf': 'font/ttf',
}

function cheminDemande(url) {
  const brut = decodeURIComponent((url ?? '/').split('?')[0])
  const relatif = brut === '/' ? 'index.html' : brut.replace(/^\/+/, '')
  const complet = normalize(join(dossier, relatif))
  const prefixe = dossier.endsWith(sep) ? dossier : `${dossier}${sep}`
  if (complet !== dossier && !complet.startsWith(prefixe)) return null
  return complet
}

const serveur = createServer(async (requete, reponse) => {
  const chemin = cheminDemande(requete.url)
  if (!chemin) {
    reponse.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' })
    reponse.end('Interdit')
    return
  }

  try {
    const contenu = await readFile(chemin)
    const type = types[extname(chemin)] ?? 'application/octet-stream'
    reponse.writeHead(200, { 'Content-Type': type })
    reponse.end(contenu)
  } catch {
    reponse.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    reponse.end('Page introuvable')
  }
})

serveur.listen(port, '127.0.0.1', () => {
  console.log(`Pages sur http://127.0.0.1:${port}`)
})
