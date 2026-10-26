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

function ecrireEnBoucle(element) {
  const texte = element.textContent
  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduit || !texte) return

  let i = 0
  element.textContent = ''

  function ajouter() {
    i += 1
    element.textContent = texte.slice(0, i)
    if (i < texte.length) {
      window.setTimeout(ajouter, 80)
      return
    }
    window.setTimeout(() => {
      i = 0
      element.textContent = ''
      window.setTimeout(ajouter, 400)
    }, 1500)
  }

  ajouter()
}

document.querySelectorAll('[data-ecrire]').forEach(ecrireEnBoucle)
