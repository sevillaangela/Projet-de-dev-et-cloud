import * as Y from 'yjs'
import { HocuspocusProvider } from '@hocuspocus/provider'

export function relierEnsemble(champ, id, { nom = 'Quelqu’un', surEtat = () => {} } = {}) {
  const provider = new HocuspocusProvider({
    url: 'ws://127.0.0.1:47232',
    name: id,
  })
  const doc = provider.document
  const ytext = doc.getText('corps')
  let application = false
  let dernier = champ.value

  function presents() {
    const noms = []
    provider.awareness?.getStates().forEach((etat) => {
      if (etat.user?.nom) noms.push(etat.user.nom)
    })
    surEtat('connecté', noms)
  }

  ytext.observe((event) => {
    if (application) return
    application = true
    let index = 0
    for (const operation of event.delta) {
      if (operation.retain) index += operation.retain
      if (typeof operation.insert === 'string') {
        champ.setRangeText(operation.insert, index, index, 'end')
        index += operation.insert.length
      } else if (operation.delete) {
        champ.setRangeText('', index, index + operation.delete, 'end')
      }
    }
    dernier = champ.value
    application = false
  })

  champ.addEventListener('input', () => {
    if (application) {
      dernier = champ.value
      return
    }
    const suivant = champ.value
    let debut = 0
    while (debut < dernier.length && debut < suivant.length && dernier[debut] === suivant[debut]) debut += 1
    let finDernier = dernier.length
    let finSuivant = suivant.length
    while (finDernier > debut && finSuivant > debut && dernier[finDernier - 1] === suivant[finSuivant - 1]) {
      finDernier -= 1
      finSuivant -= 1
    }
    application = true
    doc.transact(() => {
      if (finDernier > debut) ytext.delete(debut, finDernier - debut)
      if (finSuivant > debut) ytext.insert(debut, suivant.slice(debut, finSuivant))
    })
    application = false
    dernier = suivant
  })

  provider.on('status', ({ status }) => {
    if (status === 'connected') {
      try { provider.setAwarenessField('user', { nom }) } catch { /* la liaison reste utilisable */ }
      presents()
      return
    }
    surEtat(status === 'connecting' ? 'connexion' : 'coupé', [])
  })
  provider.awareness?.on('change', presents)

  provider.on('synced', () => {
    if (ytext.length === 0 && champ.value) ytext.insert(0, champ.value)
    else if (ytext.toString() !== champ.value) {
      application = true
      champ.value = ytext.toString()
      dernier = champ.value
      application = false
    }
  })
}