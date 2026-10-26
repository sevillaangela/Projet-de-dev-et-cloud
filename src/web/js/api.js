import { lireIdentite } from './identite.js'

export const API = 'https://u6t0o0omz8.execute-api.eu-north-1.amazonaws.com'

export async function api(methode, chemin, corps) {
  const identite = lireIdentite()
  if (!identite) return { ok: false, status: 401, body: null }
  try {
    const reponse = await fetch(API + chemin, {
      method: methode,
      headers: {
        'content-type': 'application/json',
        'x-user-email': identite.email,
        'x-user-name': encodeURIComponent(identite.nom),
      },
      body: corps === undefined ? undefined : JSON.stringify(corps),
    })
    const body = await reponse.json().catch(() => null)
    return { ok: reponse.ok, status: reponse.status, body }
  } catch {
    return { ok: false, status: 0, body: null }
  }
}
