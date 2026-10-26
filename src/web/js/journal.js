import { API } from './api.js'

const id = new URLSearchParams(location.search).get('id')
const titre = document.querySelector('#titre')
const detail = document.querySelector('#detail')
const etat = document.querySelector('#etat')
const bouton = document.querySelector('#telecharger')
const message = document.querySelector('#message')

const recu = await fetch(`${API}/api/links/${encodeURIComponent(id ?? '')}`)
const corps = await recu.json().catch(() => null)

if (!recu.ok || !corps) {
  titre.textContent = 'Journal introuvable'
  detail.textContent = 'Ce lien ne correspond à aucune parution.'
  bouton.hidden = true
} else {
  titre.textContent = corps.titre
  detail.textContent = `${corps.createur} · ${corps.telechargements} téléchargements sur ${corps.total}`
  etat.textContent = corps.etat === 'disponible' ? 'Disponible' : 'Épuisé'
  etat.className = corps.etat === 'disponible' ? 'state state-open' : 'state state-empty'
  if (corps.etat !== 'disponible') bouton.hidden = true
}

bouton.addEventListener('click', async () => {
  const reponse = await fetch(`${API}/api/links/${encodeURIComponent(id)}/download`, { method: 'POST' })
  const body = await reponse.json().catch(() => null)
  if (reponse.status === 200 && body?.url) {
    location.href = body.url
    return
  }
  if (reponse.status === 410) message.textContent = 'Ce journal est épuisé.'
  else if (reponse.status === 429) message.textContent = 'Le PDF se prépare. Réessaie dans un instant.'
  else message.textContent = "Le téléchargement n'a pas abouti."
})
