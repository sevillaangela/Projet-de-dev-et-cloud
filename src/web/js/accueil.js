import { ecrireEnBoucle } from './ecrire.js'

const messagesEspaces = {
  association: 'L’espace association viendra plus tard. Cette page ne contacte pas AWS.',
}

const zoneEspace = document.querySelector('#message-espace')
const zoneExemple = document.querySelector('#message-exemple')

document.querySelectorAll('[data-espace]').forEach((bouton) => {
  bouton.addEventListener('click', () => {
    zoneEspace.textContent = messagesEspaces[bouton.dataset.espace]
  })
})

document.querySelectorAll('[data-exemple]').forEach((bouton) => {
  bouton.addEventListener('click', () => {
    zoneExemple.textContent = 'Exemple seulement. Aucun exemplaire n’est compté.'
  })
})

document.querySelectorAll('[data-ecrire]').forEach(ecrireEnBoucle)
