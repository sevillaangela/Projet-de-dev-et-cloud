// Point d'entrée Lambda des routes publiques (page du journal, téléchargement).
import { db, s3 } from '../aws.js';
import { config } from '../config.js';
import { createPdfStorage } from '../storage.js';
import { router } from '../http.js';
import { buildServices, publicRoutes } from '../wiring.js';

const storage = createPdfStorage(s3, config.pdfBucket, config.presignSeconds);
export const handler = router(publicRoutes(buildServices({ db, storage, cfg: config })));
