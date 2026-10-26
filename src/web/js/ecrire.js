export function ecrireEnBoucle(element) {
  const texte = element.dataset.texteComplet ?? element.textContent
  element.dataset.texteComplet = texte
  const tour = String(Number(element.dataset.tour || 0) + 1)
  element.dataset.tour = tour
  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduit || !texte) {
    element.textContent = texte
    return
  }

  let i = 0
  element.textContent = ''

  function ajouter() {
    if (element.dataset.tour !== tour) return
    i += 1
    element.textContent = texte.slice(0, i)
    if (i < texte.length) {
      window.setTimeout(ajouter, 80)
      return
    }
    window.setTimeout(() => {
      if (element.dataset.tour !== tour) return
      i = 0
      element.textContent = ''
      window.setTimeout(ajouter, 400)
    }, 1500)
  }

  ajouter()
}
