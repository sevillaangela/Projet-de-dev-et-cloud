import { lireIdentite } from './identite.js'
import { creerTexte, textesDe, titreValide } from './textes.js'

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
  formulaire.querySelector('button').addEventListener('click', () => {
    const titre = titreValide(champTitre.value)
    if (!titre) {
      message.textContent = 'Indique un titre, entre 1 et 120 caractères.'
      return
    }
    const texte = creerTexte(identite.email, titre)
    champTitre.value = ''
    message.textContent = `« ${texte.titre} » est gardé sur cet ordinateur.`
    afficher()
  })
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
  }
}
