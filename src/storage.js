// Accès à S3 pour les PDF : écrire un fichier, et signer une adresse temporaire pour le lire.
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const pdfKey = (docId, seq) => `pdf/${docId}/${seq}.pdf`;

export function createPdfStorage(s3, bucket, ttlSeconds) {
  return {
    async putPdf(key, bytes) {
      await s3.send(
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, ContentType: 'application/pdf' }),
      );
    },
    // L'adresse signée est calculée localement (aucun appel réseau) : elle ne peut pas
    // échouer après qu'un exemplaire a été décompté.
    presignGet(key, filename) {
      return getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
          ResponseContentType: 'application/pdf',
          ResponseContentDisposition: `attachment; filename="${filename}"`,
        }),
        { expiresIn: ttlSeconds },
      );
    },
  };
}
