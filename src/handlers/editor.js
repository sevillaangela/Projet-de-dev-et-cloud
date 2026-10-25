// Point d'entrée Lambda des routes des rédacteurs (créer un document, publier).
import { db, s3 } from '../aws.js';
import { config } from '../config.js';
import { createPdfStorage } from '../storage.js';
import { router } from '../http.js';
import { buildServices, editorRoutes } from '../wiring.js';

const storage = createPdfStorage(s3, config.pdfBucket, config.presignSeconds);
export const handler = router(editorRoutes(buildServices({ db, storage, cfg: config })));
