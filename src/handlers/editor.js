import { db, s3, ses } from '../aws.js';
import { config } from '../config.js';
import { createPdfStorage } from '../storage.js';
import { createMailer } from '../mailer.js';
import { router } from '../http.js';
import { buildServices, editorRoutes } from '../wiring.js';

const storage = createPdfStorage(s3, config.pdfBucket, config.presignSeconds);
const mailer = config.mailFrom ? createMailer(ses, config.mailFrom) : undefined;
export const handler = router(editorRoutes(buildServices({ db, storage, cfg: config, mailer })));