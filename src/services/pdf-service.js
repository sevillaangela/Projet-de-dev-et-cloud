// Garantit qu'un PDF à jour existe pour la version courante du document.
import { buildPdf } from '../pdf.js';
import { pdfKey } from '../storage.js';

// Renvoie true si le PDF de la version courante est prêt, false si quelqu'un d'autre
// est en train de le fabriquer (le visiteur devra patienter).
export async function ensurePdf({ docs, storage, cfg, now = Date.now }, doc) {
  if (doc.pdfSeq === doc.seq) return true; // déjà fabriqué pour cette version : on le réutilise

  const t = now();
  const verrou = await docs.acquirePdfLock(doc.docId, t + cfg.pdfLockSeconds * 1000, t);
  if (!verrou) return false;

  try {
    const octets = await buildPdf({ title: doc.title, text: doc.text ?? '' });
    await storage.putPdf(pdfKey(doc.docId, doc.seq), octets);
    await docs.markPdfReady(doc.docId, doc.seq);
    return true;
  } catch (err) {
    await docs.releasePdfLock(doc.docId).catch(() => {});
    throw err;
  }
}
