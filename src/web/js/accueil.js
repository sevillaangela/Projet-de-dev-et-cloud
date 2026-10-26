import { ecrireEnBoucle } from './ecrire.js'

const messagesEspaces = {
  association: 'L’espace association n est pas encore disponible.',
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
    zoneExemple.textContent = 'Procurez vous du lien pour pouvoir télécharger  l article.'
  })
})

document.querySelectorAll('[data-ecrire]').forEach(ecrireEnBoucle)
