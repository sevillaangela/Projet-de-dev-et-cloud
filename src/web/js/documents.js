import { lireIdentite } from './identite.js'
import { noterTexte, textesDe, titreValide } from './textes.js'
import { api } from './api.js'
import { oublierTexte } from './textes.js'

const identite = lireIdentite()
const qui = document.querySelector('#qui')
const formulaire = document.querySelector('#creation')
const message = document.querySelector('#message-creation')
const vide = document.querySelector('#vide')
const liste = document.querySelector('#documents')
const champTitre = formulaire.querySelector('[name="titre"]')

if (!identite) {
  qui.textContent = 'Aucun nom enregistré sur cet ordinateur.'
  formulaire.hidden = true
} else {
  qui.textContent = identite.nom
  afficher()
  formulaire.querySelector('button').addEventListener('click', creer)
}

async function creer() {
  const titre = titreValide(champTitre.value)
  if (!titre) {
    message.textContent = 'Indique un titre, entre 1 et 120 caractères.'
    return
  }
  const recu = await api('POST', '/api/documents', { titre, texte: '' })
  if (!recu.ok) {
    message.textContent = recu.status === 0
      ? 'Le serveur des documents ne répond pas. Lance-le sur le port 43111.'
      : "Le serveur n'a pas créé le texte."
    return
  }
  noterTexte(identite.email, recu.body.docId, recu.body.titre)
  champTitre.value = ''
  message.textContent = `« ${recu.body.titre} » est créé sur le serveur.`
  afficher()
}

function afficher() {
  const textes = textesDe(identite.email).slice().reverse()
  liste.replaceChildren()
  vide.hidden = textes.length > 0
  for (const texte of textes) {
    const item = document.createElement('li')
    item.className = 'issue'
    const titre = document.createElement('h3')
    titre.textContent = texte.titre
    const ouvrir = document.createElement('a')
    ouvrir.className = 'ouvrir'
    ouvrir.href = `editeur.html?id=${encodeURIComponent(texte.id)}`
    ouvrir.textContent = 'Ouvrir'
    item.append(titre, ouvrir)
    liste.append(item)
    const retirer = document.createElement('button')
    retirer.type = 'button'
    retirer.className = 'secondaire'
    retirer.textContent = 'Supprimer'
    retirer.addEventListener('click', () => effacer(texte))
    item.append(titre, ouvrir, retirer)
  }
}
async function effacer(texte) {
  if (!confirm(`Supprimer « ${texte.titre} » ?`)) return
  const recu = await api('DELETE', `/api/documents/${encodeURIComponent(texte.id)}`)
  oublierTexte(identite.email, texte.id)
  afficher()
  message.textContent = recu.ok
    ? `« ${texte.titre} » est supprimé.`
    : `« ${texte.titre} » est retiré de cette liste.`
}