import { lireIdentite } from './identite.js'
import { ecrireEnBoucle } from './ecrire.js'
import { garderCorps, lireTexte } from './textes.js'

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
  const texte = lireTexte(identite.email, id)
  if (!texte) {
    titre.textContent = 'Texte introuvable'
    formulaire.hidden = true
    message.textContent = "Ce texte n'est pas sur cet ordinateur pour ce nom."
  } else {
    montrerTitre(texte.titre)
    document.title = `${texte.titre} — Journal de l'école`
    champ.value = texte.corps
    formulaire.querySelector('button').addEventListener('click', () => {
      const garde = garderCorps(identite.email, texte.id, champ.value)
      if (!garde) {
        message.textContent = "Le texte dépasse la limite et n'a pas été gardé."
        return
      }
      message.textContent = 'Texte gardé sur cet ordinateur.'
    })
  }
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
