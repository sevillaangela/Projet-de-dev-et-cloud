import { Server } from '@hocuspocus/server'

const port = Number(process.env.COLLAB_PORT ?? 47232)
const serveur = new Server({ port, address: '127.0.0.1', quiet: true })

serveur.listen().then(() => {
  console.log(`Écriture ensemble sur ws://127.0.0.1:${port}`)
})
