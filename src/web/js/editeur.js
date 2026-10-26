import { lireIdentite } from './identite.js'
import { ecrireEnBoucle } from './ecrire.js'
import { api } from './api.js'
import { noterTexte } from './textes.js'

const id = new URLSearchParams(location.search).get('id')
const identite = lireIdentite()
const titre = document.querySelector('#titre')
const qui = document.querySelector('#qui')
const formulaire = document.querySelector('#ecriture')
const message = document.querySelector('#message-ecriture')
const champTitre = formulaire.querySelector('[name="titre"]')
const champSousTitre = formulaire.querySelector('[name="sous-titre"]')
const champ = formulaire.querySelector('[name="corps"]')

if (!identite) {
  qui.textContent = 'Aucun nom enregistré sur cet ordinateur.'
  formulaire.hidden = true
} else {
  qui.textContent = identite.nom
  ouvrir()
}

async function ouvrir() {
  const recu = await api('GET', `/api/documents/${encodeURIComponent(id)}`)
  if (!recu.ok) {
    titre.textContent = 'Texte introuvable'
    formulaire.hidden = true
    message.textContent = recu.status === 0
      ? 'Le serveur des documents ne répond pas. Lance-le sur le port 43111.'
      : "Ce texte n'est pas sur le serveur pour ce nom."
    return
  }
  montrerTitre(recu.body.titre)
  champTitre.value = recu.body.titre
  champSousTitre.value = recu.body.sousTitre ?? ''
  document.title = `${recu.body.titre} — Journal de l'école`
  qui.textContent = recu.body.estProprietaire
    ? `Tu es le propriétaire, ${recu.body.proprietaire}.`
    : `Propriétaire : ${recu.body.proprietaire}.`
  champ.value = recu.body.texte ?? ''
  formulaire.querySelector('#garder').addEventListener('click', enregistrer)
  document.querySelector('#apercu').addEventListener('click', basculerApercu)
}

async function enregistrer() {
  const recu = await api('PUT', `/api/documents/${encodeURIComponent(id)}/texte`, {
    titre: champTitre.value,
    sousTitre: champSousTitre.value,
    texte: champ.value,
  })
  if (!recu.ok) {
    message.textContent = recu.status === 0
      ? 'Le serveur des documents ne répond pas.'
      : "Le texte n'a pas été gardé."
    return
  }
  montrerTitre(recu.body.titre)
  noterTexte(identite.email, id, recu.body.titre)
  message.textContent = 'Texte gardé sur le serveur.'
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

function basculerApercu() {
  const cadre = document.querySelector('#cadre-apercu')
  const bouton = document.querySelector('#apercu')
  const champs = document.querySelector('#champs')
  const garder = document.querySelector('#garder')
  if (!cadre.hidden) {
    cadre.hidden = true
    champs.hidden = false
    garder.hidden = false
    bouton.textContent = 'Aperçu'
    return
  }
  const sousTitre = champSousTitre.value.trim()
  document.querySelector('#apercu-titre').textContent = champTitre.value.trim() || 'Sans titre'
  const ligneSousTitre = document.querySelector('#apercu-sous-titre')
  ligneSousTitre.textContent = sousTitre
  ligneSousTitre.hidden = sousTitre.length === 0
  remplirApercuTexte(champ.value)
  champs.hidden = true
  garder.hidden = true
  cadre.hidden = false
  bouton.textContent = 'Revenir aux outils'
}

document.querySelector('#gras').addEventListener('click', () => entourer(champ, '**', '**'))
document.querySelector('#italique').addEventListener('click', () => entourer(champ, '*', '*'))

function entourer(zone, avant, apres) {
  const debut = zone.selectionStart
  const fin = zone.selectionEnd
  const choisi = zone.value.slice(debut, fin)
  zone.setRangeText(avant + choisi + apres, debut, fin, 'end')
  const curseur = debut + avant.length
  zone.setSelectionRange(curseur, curseur + choisi.length)
  zone.focus()
}

function remplirApercuTexte(valeur) {
  const zone = document.querySelector('#apercu-texte')
  zone.replaceChildren()
  const morceaux = valeur.split(/(\*\*[^*]+?\*\*|\*[^*]+?\*)/g)
  for (const morceau of morceaux) {
    if (morceau.startsWith('**') && morceau.endsWith('**')) {
      const fort = document.createElement('strong')
      fort.textContent = morceau.slice(2, -2)
      zone.append(fort)
    } else if (morceau.startsWith('*') && morceau.endsWith('*') && morceau.length > 2) {
      const italique = document.createElement('em')
      italique.textContent = morceau.slice(1, -1)
      zone.append(italique)
    } else {
      zone.append(document.createTextNode(morceau))
    }
  }
}
