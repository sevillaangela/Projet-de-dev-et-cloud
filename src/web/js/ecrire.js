export function ecrireEnBoucle(element) {
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
