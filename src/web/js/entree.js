import { garderIdentite, lireIdentite } from './identite.js'

const formulaire = document.querySelector('#formulaire-entree')
const message = document.querySelector('#message-entree')
const champNom = formulaire.querySelector('[name="nom"]')
const champEmail = formulaire.querySelector('[name="email"]')

const deja = lireIdentite()
if (deja) {
  champNom.value = deja.nom
  champEmail.value = deja.email
  message.textContent = 'Identité déjà enregistrée sur cet ordinateur.'
}

formulaire.querySelector('button').addEventListener('click', () => {
  const identite = garderIdentite(champNom.value, champEmail.value)
  if (!identite) {
    message.textContent = 'Indique un nom et une adresse électronique valides.'
    return
  }
  message.textContent = `${identite.nom} est enregistré sur cet ordinateur. L’adresse n’est pas affichée.`
})
