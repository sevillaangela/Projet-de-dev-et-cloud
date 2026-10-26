import { lireIdentite } from './identite.js'
import { ecrireEnBoucle } from './ecrire.js'
import { api } from './api.js'

const id = new URLSearchParams(location.search).get('id')
const identite = lireIdentite()
const titre = document.querySelector('#titre')
const qui = document.querySelector('#qui')
const formulaire = document.querySelector('#ecriture')
const message = document.querySelector('#message-ecriture')
const champ = formulaire.querySelector('[name="corps"]')

if (!identite) {
  qui.textContent = 'Aucun nom enregistré sur cet ordinateur.'
  formulaire.hidden = true
} else {
  qui.textContent = identite.nom
  ouvrir()
}

async function ouvrir() {
  const recu = await api('GET', `/api/documents/${encodeURIComponent(id)}`)
  if (!recu.ok) {
    titre.textContent = 'Texte introuvable'
    formulaire.hidden = true
    message.textContent = recu.status === 0
      ? 'Le serveur des documents ne répond pas. Lance-le sur le port 43111.'
      : "Ce texte n'est pas sur le serveur pour ce nom."
    return
  }
  montrerTitre(recu.body.titre)
  document.title = `${recu.body.titre} — Journal de l'école`
  champ.value = recu.body.texte ?? ''
  formulaire.querySelector('button').addEventListener('click', enregistrer)
}

async function enregistrer() {
  const recu = await api('PUT', `/api/documents/${encodeURIComponent(id)}/texte`, { texte: champ.value })
  if (!recu.ok) {
    message.textContent = recu.status === 0
      ? 'Le serveur des documents ne répond pas.'
      : "Le texte n'a pas été gardé."
    return
  }
  message.textContent = 'Texte gardé sur le serveur.'
}

function montrerTitre(valeur) {
  titre.replaceChildren()
  const lecteur = document.createElement('span')
  lecteur.className = 'uniquement-lecteur'
  lecteur.textContent = valeur
  const visible = document.createElement('span')
  visible.setAttribute('aria-hidden', 'true')
  visible.textContent = valeur
  titre.append(lecteur, visible)
  ecrireEnBoucle(visible)
}
