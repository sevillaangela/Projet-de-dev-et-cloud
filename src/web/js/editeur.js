import { lireIdentite } from './identite.js'
import { ecrireEnBoucle } from './ecrire.js'
import { api } from './api.js'
import { relierEnsemble } from './ensemble.js'
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
const compteur = document.querySelector('#compteur')

function montrerCredit() {
  if (!compteur) return
  compteur.textContent = `${champ.value.length} caractères dans ce texte.`
}

champ.addEventListener('input', montrerCredit)
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
  document.querySelector('#invitation').hidden = !recu.body.estProprietaire
  document.querySelector('#publication').hidden = false
  document.querySelector('#publier').addEventListener('click', publier)
  document.querySelector('#inviter').addEventListener('click', inviter)
  champ.value = recu.body.texte ?? ''
  const presence = document.querySelector('#presence')
relierEnsemble(champ, id, {
  nom: identite.nom,
  surEtat(etat, noms) {
    if (etat === 'connecté') {
      presence.textContent = noms.length > 1
        ? `En ligne : ${noms.join(', ')}.`
        : 'Vous êtes connectée. Ouvre ce document dans une autre fenêtre.'
      return
    }
    presence.textContent = etat === 'connexion'
      ? 'Écriture ensemble : connexion…'
      : 'Écriture ensemble coupée. Lance npm run ensemble.'
  },
})
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
document.querySelector('#souligne').addEventListener('click', () => entourer(champ, '__', '__'))
document.querySelector('#liste').addEventListener('click', () => prefixer(champ, '- '))
document.querySelector('#citation').addEventListener('click', () => prefixer(champ, '> '))

function prefixer(zone, marque) {
  const debut = zone.selectionStart
  const fin = zone.selectionEnd
  const avant = zone.value.lastIndexOf('\n', Math.max(0, debut - 1)) + 1
  const apresSaut = zone.value.indexOf('\n', fin)
  const apres = apresSaut === -1 ? zone.value.length : apresSaut
  const bloc = zone.value.slice(avant, apres)
  const nouveau = bloc.split('\n').map((ligne) => ligne.startsWith(marque) ? ligne : marque + ligne).join('\n')
  zone.setRangeText(nouveau, avant, apres, 'end')
  zone.focus()
  zone.dispatchEvent(new Event('input', { bubbles: true }))
}

function entourer(zone, avant, apres) {
  const debut = zone.selectionStart
  const fin = zone.selectionEnd
  const choisi = zone.value.slice(debut, fin)
  zone.setRangeText(avant + choisi + apres, debut, fin, 'end')
  const curseur = debut + avant.length
  zone.setSelectionRange(curseur, curseur + choisi.length)
  zone.focus()
  zone.dispatchEvent(new Event('input', { bubbles: true }))
}

function remplirApercuTexte(valeur) {
  const zone = document.querySelector('#apercu-texte')
  zone.replaceChildren()
  for (const ligne of valeur.split('\n')) {
    const bloc = document.createElement('p')
    const contenu = ligne.startsWith('> ') ? ligne.slice(2) : ligne.startsWith('- ') ? ligne.slice(2) : ligne
    if (ligne.startsWith('> ')) bloc.style.borderLeft = '3px solid currentColor'
    if (ligne.startsWith('- ')) bloc.textContent = ''
    ajouterMorceau(bloc, ligne.startsWith('- ') ? `• ${contenu}` : contenu)
    zone.append(bloc)
  }
}

function ajouterMorceau(zone, morceau) {
  const parties = morceau.split(/(\*\*[^*]+?\*\*|__[^_]+?__|\*[^*]+?\*)/g)
  for (const part of parties) {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      const fort = document.createElement('strong')
      fort.textContent = part.slice(2, -2)
      zone.append(fort)
    } else if (part.startsWith('__') && part.endsWith('__') && part.length > 4) {
      const ligne = document.createElement('u')
      ligne.textContent = part.slice(2, -2)
      zone.append(ligne)
    } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      const italique = document.createElement('em')
      italique.textContent = part.slice(1, -1)
      zone.append(italique)
    } else {
      zone.append(document.createTextNode(part))
    }
  }
}

async function inviter() {
  const champ = document.querySelector('[name="invite"]')
  const zone = document.querySelector('#message-invitation')
  const recu = await api('POST', `/api/documents/${encodeURIComponent(id)}/invitations`, { email: champ.value })
  if (!recu.ok) {
    zone.textContent = recu.status === 0
      ? 'Le serveur des documents ne répond pas.'
      : "L'invitation n'a pas été enregistrée."
    return
  }
  zone.textContent = recu.body.dejaMembre
    ? 'Cette personne a déjà accès.'
    : 'Invitation enregistrée. La personne ouvre ce même lien avec son nom.'
  if (!recu.body.dejaMembre) champ.value = ''
}

async function publier() {
  const zone = document.querySelector('#message-publication')
  const nombre = Number(document.querySelector('[name="exemplaires"]').value)
  const recu = await api('POST', `/api/documents/${encodeURIComponent(id)}/links`, { exemplaires: nombre })
  if (!recu.ok) {
    zone.textContent = recu.status === 0
      ? 'Le serveur des documents ne répond pas.'
      : 'La publication n\'a pas abouti. Le nombre doit être entre 1 et 100000.'
    return
  }
  const lien = document.createElement('a')
  lien.href = recu.body.chemin
  lien.textContent = 'Ouvrir le journal'
  zone.replaceChildren(document.createTextNode(`Publié, ${recu.body.exemplaires} exemplaires. `), lien)
}
