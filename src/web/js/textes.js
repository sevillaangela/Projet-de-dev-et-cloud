const CLE = 'journal-documents'

export function titreValide(valeur) {
  if (typeof valeur !== 'string') return null
  const titre = valeur.trim()
  if (titre.length < 1 || titre.length > 120) return null
  return titre
}

function lireTous() {
  try {
    const brut = localStorage.getItem(CLE)
    const liste = brut ? JSON.parse(brut) : []
    return Array.isArray(liste) ? liste : []
  } catch {
    return []
  }
}

function ecrireTous(liste) {
  localStorage.setItem(CLE, JSON.stringify(liste))
}

export function textesDe(email) {
  if (typeof email !== 'string') return []
  return lireTous().filter((texte) => texte.email === email)
}

export function creerTexte(email, titre) {
  const propre = titreValide(titre)
  if (typeof email !== 'string' || email.length === 0 || !propre) return null
  const texte = {
    id: crypto.randomUUID(),
    email,
    titre: propre,
    corps: '',
    maj: new Date().toISOString(),
  }
  ecrireTous([...lireTous(), texte])
  return texte
}

export function lireTexte(email, id) {
  return textesDe(email).find((texte) => texte.id === id) ?? null
}

export function garderCorps(email, id, corps) {
  if (typeof corps !== 'string' || corps.length > 100000) return null
  const liste = lireTous()
  const index = liste.findIndex((texte) => texte.id === id && texte.email === email)
  if (index < 0) return null
  liste[index] = { ...liste[index], corps, maj: new Date().toISOString() }
  ecrireTous(liste)
  return liste[index]
}

export function noterTexte(email, id, titre) {
  const propre = titreValide(titre)
  if (typeof email !== 'string' || typeof id !== 'string' || !propre) return null
  const texte = { id, email, titre: propre, corps: '', maj: new Date().toISOString() }
  ecrireTous([...lireTous().filter((item) => item.id !== id), texte])
  return texte
}
export function oublierTexte(email, id) {
  ecrireTous(lireTous().filter((item) => !(item.id === id && item.email === email)))
}