// Outils de test : une fausse base DynamoDB locale (dynalite) et un faux stockage PDF.
import dynalite from 'dynalite';
import { DynamoDBClient, CreateTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { buildServices } from '../../src/wiring.js';
import { config } from '../../src/config.js';

export async function startLocalDb() {
  const serveur = dynalite({ createTableMs: 0 });
  await new Promise((ok) => serveur.listen(0, '127.0.0.1', ok));
  const port = serveur.address().port;
  const client = new DynamoDBClient({
    endpoint: `http://127.0.0.1:${port}`,
    region: 'local',
    credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
  });
  for (const [nom, cle] of [['docs', 'docId'], ['links', 'linkId']]) {
    await client.send(
      new CreateTableCommand({
        TableName: nom,
        BillingMode: 'PAY_PER_REQUEST',
        AttributeDefinitions: [{ AttributeName: cle, AttributeType: 'S' }],
        KeySchema: [{ AttributeName: cle, KeyType: 'HASH' }],
      }),
    );
  }
  const db = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
  return { db, stop: () => new Promise((ok) => serveur.close(ok)) };
}

// Faux S3 : garde les PDF en mémoire et compte les appels.
export function fakeStorage() {
  const objets = new Map();
  const stats = { put: 0, presign: 0 };
  return {
    objets,
    stats,
    async putPdf(key, bytes) {
      stats.put++;
      objets.set(key, bytes);
    },
    async presignGet(key) {
      stats.presign++;
      return `https://exemple.test/${key}?signature=factice`;
    },
  };
}

export function makeServices(db, storage, surcharge = {}) {
  const cfg = { ...config, docsTable: 'docs', linksTable: 'links', defaultCopies: 500, maxCopies: 100000, presignSeconds: 60, pdfLockSeconds: 30, retryAfterSeconds: 2, ...surcharge };
  return buildServices({ db, storage, cfg });
}

export const aline = { email: 'aline@exemple.fr', name: 'Aline' };
export const marc = { email: 'marc@exemple.fr', name: 'Marc' };
