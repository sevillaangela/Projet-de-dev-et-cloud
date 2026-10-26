const CLE = 'journal-identite'
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function identiteValide(nom, email) {
  if (typeof nom !== 'string' || typeof email !== 'string') return null
  const name = nom.trim()
  const adresse = email.trim().toLowerCase()
  if (name.length < 1 || name.length > 60) return null
  if (adresse.length > 254 || !EMAIL.test(adresse)) return null
  return { nom: name, email: adresse }
}

export function lireIdentite() {
  try {
    const brut = localStorage.getItem(CLE)
    if (!brut) return null
    const valeur = JSON.parse(brut)
    return identiteValide(valeur.nom, valeur.email)
  } catch {
    return null
  }
}

export function garderIdentite(nom, email) {
  const identite = identiteValide(nom, email)
  if (!identite) return null
  localStorage.setItem(CLE, JSON.stringify(identite))
  return identite
}
